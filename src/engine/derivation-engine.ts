import type {
  Architecture,
  ArchitecturalElement,
  Component,
  Configuration,
  Connector,
  ProductArchitecture,
  Variant,
  VariationPoint,
} from "../model/varadl-types";
import { evaluateCondition, parseCondition } from "../parser/condition";
import type { ConditionContext } from "../parser/condition";

function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function isComponent(element: ArchitecturalElement): element is Component {
  return element.kind === "component";
}

function isConnector(element: ArchitecturalElement): element is Connector {
  return element.kind === "connector";
}

function buildSelectionMap(configuration: Configuration): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const selection of configuration.selectedVariants) {
    map.set(selection.variationPoint, selection.variants);
  }
  return map;
}

function buildSelectedVariantNames(selectedByVp: Map<string, string[]>): Set<string> {
  const names = new Set<string>();
  for (const variants of selectedByVp.values()) {
    for (const variant of variants) {
      names.add(variant);
    }
  }
  return names;
}

function evaluatePresenceCondition(
  condition: string | undefined,
  ctx: ConditionContext
): boolean {
  if (!condition?.trim()) return true;
  const ast = parseCondition(condition);
  return evaluateCondition(ast, ctx);
}

function getSelectedVariantsForVp(
  vp: VariationPoint,
  selectedByVp: Map<string, string[]>
): Variant[] {
  const requested = selectedByVp.get(vp.name) ?? [];

  if (vp.type === "alternative") {
    return vp.variants.filter((v) => requested[0] === v.name);
  }

  if (vp.type === "optional") {
    return vp.variants.filter((v) => requested[0] === v.name);
  }

  return vp.variants.filter((v) => requested.includes(v.name));
}

function validateConfiguration(
  architecture: Architecture,
  selectedByVp: Map<string, string[]>
): string[] {
  const errors: string[] = [];
  const knownVariationPoints = new Set(architecture.variationPoints.map((vp) => vp.name));

  for (const selectedVariationPoint of selectedByVp.keys()) {
    if (!knownVariationPoints.has(selectedVariationPoint)) {
      errors.push(`Le variationPoint ${selectedVariationPoint} n'existe pas dans l'architecture.`);
    }
  }

  for (const vp of architecture.variationPoints) {
    const selected = selectedByVp.get(vp.name) ?? [];

    if (vp.type === "alternative" && selected.length !== 1) {
      errors.push(
        `Le variationPoint ${vp.name} de type alternative doit avoir exactement une variante sélectionnée.`
      );
    }

    if (vp.type === "optional" && selected.length > 1) {
      errors.push(
        `Le variationPoint ${vp.name} de type optional ne peut avoir qu'une seule variante sélectionnée.`
      );
    }

    if (vp.type === "or" && selected.length < 1) {
      errors.push(
        `Le variationPoint ${vp.name} de type or doit avoir au moins une variante sélectionnée.`
      );
    }

    for (const selectedVariant of selected) {
      const exists = vp.variants.some((v) => v.name === selectedVariant);
      if (!exists) {
        errors.push(`La variante ${selectedVariant} n'existe pas dans ${vp.name}.`);
      }
    }
  }

  return errors;
}

function hasPort(component: Component | undefined, portName: string): boolean {
  if (!component) return false;
  return component.ports.some((p) => p.name === portName);
}

function normalizePorts(component: Component): string[] {
  return component.ports.map((port) => port.name).sort();
}

function sameComponentSignature(left: Component, right: Component): boolean {
  const leftPorts = normalizePorts(left);
  const rightPorts = normalizePorts(right);

  if (leftPorts.length !== rightPorts.length) return false;

  return leftPorts.every((port, index) => port === rightPorts[index]);
}

function connectorKey(connector: Connector): string {
  return `${connector.sourceComponent}.${connector.sourcePort}->${connector.targetComponent}.${connector.targetPort}`;
}

function checkConstraints(
  architecture: Architecture,
  activeNames: Set<string>
): string[] {
  const errors: string[] = [];

  for (const constraint of architecture.constraints) {
    const sourceActive = activeNames.has(constraint.source);
    const targetActive = activeNames.has(constraint.target);

    if (constraint.type === "requires" && sourceActive && !targetActive) {
      errors.push(`Violation de contrainte: ${constraint.source} requires ${constraint.target}`);
    }

    if (constraint.type === "excludes" && sourceActive && targetActive) {
      errors.push(`Violation de contrainte: ${constraint.source} excludes ${constraint.target}`);
    }
  }

  return errors;
}

function classifyVariantComponent(componentName: string): "variant" | "database" {
  const lowered = componentName.toLowerCase();

  if (
    lowered.includes("database") ||
    lowered.includes("postgres") ||
    lowered.includes("mysql") ||
    lowered.includes("mongo") ||
    lowered.includes("oracle") ||
    lowered.includes("db")
  ) {
    return "database";
  }

  return "variant";
}

interface FragmentSource {
  label: string;
  element: ArchitecturalElement;
}

interface CompositionResult {
  elements: ArchitecturalElement[];
  componentNames: Set<string>;
  errors: string[];
}

function addComponent(
  component: Component,
  sourceLabel: string,
  componentsByName: Map<string, Component>,
  componentSources: Map<string, string>,
  errors: string[]
): void {
  const existing = componentsByName.get(component.name);

  if (!existing) {
    componentsByName.set(component.name, component);
    componentSources.set(component.name, sourceLabel);
    return;
  }

  if (!sameComponentSignature(existing, component)) {
    const existingSource = componentSources.get(component.name) ?? "source inconnue";
    errors.push(
      `Conflit architectural: le composant ${component.name} est défini de manière incompatible ` +
        `dans ${existingSource} et ${sourceLabel}. ` +
        `Ports existants: [${normalizePorts(existing).join(", ")}], ` +
        `nouveaux ports: [${normalizePorts(component).join(", ")}].`
    );
  }
}

function composeFragments(fragments: FragmentSource[]): CompositionResult {
  const errors: string[] = [];
  const componentsByName = new Map<string, Component>();
  const componentSources = new Map<string, string>();
  const connectorsByKey = new Map<string, Connector>();

  for (const fragment of fragments) {
    if (isComponent(fragment.element)) {
      addComponent(
        fragment.element,
        fragment.label,
        componentsByName,
        componentSources,
        errors
      );
    }
  }

  for (const fragment of fragments) {
    if (!isConnector(fragment.element)) continue;

    const connector = fragment.element;
    const sourceComponent = componentsByName.get(connector.sourceComponent);
    const targetComponent = componentsByName.get(connector.targetComponent);

    if (!sourceComponent) {
      errors.push(
        `Connecteur invalide dans ${fragment.label}: le composant source ${connector.sourceComponent} n'existe pas.`
      );
      continue;
    }

    if (!targetComponent) {
      errors.push(
        `Connecteur invalide dans ${fragment.label}: le composant cible ${connector.targetComponent} n'existe pas.`
      );
      continue;
    }

    if (!hasPort(sourceComponent, connector.sourcePort)) {
      errors.push(
        `Port source inexistant dans ${fragment.label}: ${connector.sourceComponent}.${connector.sourcePort}`
      );
      continue;
    }

    if (!hasPort(targetComponent, connector.targetPort)) {
      errors.push(
        `Port cible inexistant dans ${fragment.label}: ${connector.targetComponent}.${connector.targetPort}`
      );
      continue;
    }

    connectorsByKey.set(connectorKey(connector), connector);
  }

  return {
    elements: [...componentsByName.values(), ...connectorsByKey.values()],
    componentNames: new Set(componentsByName.keys()),
    errors,
  };
}

export interface DeriveResult {
  product?: ProductArchitecture;
  errors: string[];
}

export function deriveProductArchitecture(
  architecture: Architecture,
  configuration: Configuration
): DeriveResult {
  const selectedByVp = buildSelectionMap(configuration);
  const configErrors = validateConfiguration(architecture, selectedByVp);

  if (configErrors.length > 0) {
    return { errors: configErrors };
  }

  const includes = new Set(configuration.flags);
  const selectedVariantNames = buildSelectedVariantNames(selectedByVp);
  const existingElements = new Set<string>();
  const fragments: FragmentSource[] = [];

  const baseContext: ConditionContext = {
    flags: includes,
    selectedVariantsByVp: selectedByVp,
    selectedVariantNames,
    existingElements,
  };

  for (const element of architecture.elements) {
    if (isComponent(element)) {
      const optionalOk = !element.optional || includes.has(element.name);
      const conditionOk = evaluatePresenceCondition(element.presenceCondition, baseContext);

      if (optionalOk && conditionOk) {
        const cloned = cloneDeep(element);
        cloned.origin = element.optional ? "optional" : "core";
        cloned.optional = false;
        fragments.push({ label: cloned.origin === "optional" ? `composant optionnel ${cloned.name}` : "architecture de référence", element: cloned });
        existingElements.add(element.name);
      }
    }
  }

  for (const vp of architecture.variationPoints) {
    const selectedVariants = getSelectedVariantsForVp(vp, selectedByVp);

    for (const variant of selectedVariants) {
      const currentContext: ConditionContext = {
        flags: includes,
        selectedVariantsByVp: selectedByVp,
        selectedVariantNames,
        existingElements,
      };

      for (const element of variant.elements) {
        if (!isComponent(element)) continue;

        const conditionOk = evaluatePresenceCondition(
          element.presenceCondition,
          currentContext
        );

        if (conditionOk) {
          const cloned = cloneDeep(element);
          cloned.origin = classifyVariantComponent(element.name);
          cloned.optional = false;
          fragments.push({ label: `variante ${variant.name} du variationPoint ${vp.name}`, element: cloned });
          existingElements.add(element.name);
        }
      }
    }
  }

  for (const element of architecture.elements) {
    if (isConnector(element)) {
      fragments.push({ label: "architecture de référence", element: cloneDeep(element) });
    }
  }

  for (const vp of architecture.variationPoints) {
    const selectedVariants = getSelectedVariantsForVp(vp, selectedByVp);

    for (const variant of selectedVariants) {
      for (const element of variant.elements) {
        if (isConnector(element)) {
          fragments.push({
            label: `variante ${variant.name} du variationPoint ${vp.name}`,
            element: cloneDeep(element),
          });
        }
      }
    }
  }

  const composition = composeFragments(fragments);

  const activeNames = new Set<string>([
    ...Array.from(includes),
    ...Array.from(selectedVariantNames),
    ...Array.from(composition.componentNames),
  ]);

  const constraintErrors = checkConstraints(architecture, activeNames);
  const allErrors = [...composition.errors, ...constraintErrors];

  if (allErrors.length > 0) {
    return { errors: allErrors };
  }

  return {
    product: {
      name: configuration.name,
      elements: composition.elements,
    },
    errors: [],
  };
}

export function productToText(product: ProductArchitecture): string {
  const lines: string[] = [`architecture ${product.name} {`, ""];

  for (const element of product.elements) {
    if (!isComponent(element)) continue;

    if (element.ports.length === 0) {
      lines.push(`component ${element.name}`);
      continue;
    }

    lines.push(`component ${element.name} {`);
    for (const port of element.ports) {
      lines.push(`  port ${port.name}`);
    }
    lines.push("}");
    lines.push("");
  }

  for (const element of product.elements) {
    if (!isConnector(element)) continue;

    lines.push(
      `connect ${element.sourceComponent}.${element.sourcePort} -> ${element.targetComponent}.${element.targetPort}`
    );
  }

  lines.push("}");
  return lines.join("\n");
}
