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

  for (const vp of architecture.variationPoints) {
    const selected = selectedByVp.get(vp.name) ?? [];

    if (vp.type === "alternative") {
      if (selected.length !== 1) {
        errors.push(
          `Le variationPoint ${vp.name} de type alternative doit avoir exactement une variante sélectionnée.`
        );
      }
    }

    if (vp.type === "optional") {
      if (selected.length > 1) {
        errors.push(
          `Le variationPoint ${vp.name} de type optional ne peut avoir qu'une seule variante sélectionnée.`
        );
      }
    }

    if (vp.type === "or") {
      if (selected.length < 1) {
        errors.push(
          `Le variationPoint ${vp.name} de type or doit avoir au moins une variante sélectionnée.`
        );
      }
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

function componentMapOf(elements: ArchitecturalElement[]): Map<string, Component> {
  const map = new Map<string, Component>();
  for (const element of elements) {
    if (isComponent(element)) {
      map.set(element.name, element);
    }
  }
  return map;
}

function hasPort(component: Component | undefined, portName: string): boolean {
  if (!component) return false;
  return component.ports.some((p) => p.name === portName);
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

function deduplicateElements(elements: ArchitecturalElement[]): ArchitecturalElement[] {
  const result: ArchitecturalElement[] = [];
  const seen = new Set<string>();

  for (const element of elements) {
    const key = isComponent(element)
      ? `component:${element.name}`
      : `connector:${element.sourceComponent}.${element.sourcePort}->${element.targetComponent}.${element.targetPort}`;

    if (!seen.has(key)) {
      seen.add(key);
      result.push(element);
    }
  }

  return result;
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
  const derivedElements: ArchitecturalElement[] = [];
  const existingElements = new Set<string>();

  const baseContext: ConditionContext = {
    flags: includes,
    selectedVariantsByVp: selectedByVp,
    selectedVariantNames,
    existingElements,
  };

  for (const element of architecture.elements) {
    if (!isComponent(element)) continue;

    const optionalOk = !element.optional || includes.has(element.name);
    const conditionOk = evaluatePresenceCondition(element.presenceCondition, baseContext);

    if (optionalOk && conditionOk) {
      const cloned = cloneDeep(element);
      cloned.origin = element.optional ? "optional" : "core";
      cloned.optional = false;
      derivedElements.push(cloned);
      existingElements.add(element.name);
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
          derivedElements.push(cloned);
          existingElements.add(element.name);
        }
      }
    }
  }

  const allCandidateConnectors: Connector[] = [];

  for (const element of architecture.elements) {
    if (isConnector(element)) {
      allCandidateConnectors.push(cloneDeep(element));
    }
  }

  for (const vp of architecture.variationPoints) {
    const selectedVariants = getSelectedVariantsForVp(vp, selectedByVp);

    for (const variant of selectedVariants) {
      for (const element of variant.elements) {
        if (isConnector(element)) {
          allCandidateConnectors.push(cloneDeep(element));
        }
      }
    }
  }

  const componentsByName = componentMapOf(derivedElements);

  for (const connector of allCandidateConnectors) {
    const sourceComponent = componentsByName.get(connector.sourceComponent);
    const targetComponent = componentsByName.get(connector.targetComponent);

    if (!sourceComponent || !targetComponent) {
      continue;
    }

    if (!hasPort(sourceComponent, connector.sourcePort)) {
      return {
        errors: [
          `Port source inexistant: ${connector.sourceComponent}.${connector.sourcePort}`,
        ],
      };
    }

    if (!hasPort(targetComponent, connector.targetPort)) {
      return {
        errors: [
          `Port cible inexistant: ${connector.targetComponent}.${connector.targetPort}`,
        ],
      };
    }

    derivedElements.push(connector);
  }

  const activeNames = new Set<string>([
    ...Array.from(includes),
    ...Array.from(selectedVariantNames),
    ...Array.from(componentsByName.keys()),
  ]);

  const constraintErrors = checkConstraints(architecture, activeNames);
  if (constraintErrors.length > 0) {
    return { errors: constraintErrors };
  }

  return {
    product: {
      name: configuration.name,
      elements: deduplicateElements(derivedElements),
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