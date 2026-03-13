import type {
  Architecture,
  Component,
  Configuration,
  Connector,
  Constraint,
  ParseResult,
  Port,
  Variant,
  VariantSelection,
  VariationPoint,
  VariationType,
} from "../model/varadl-types";

function cleanLines(input: string): string[] {
  return input
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/g, "").trim())
    .filter((line) => line.length > 0);
}

function isClosingBrace(line: string): boolean {
  return line === "}";
}

function parsePorts(lines: string[], startIndex: number): { ports: Port[]; nextIndex: number; errors: string[] } {
  const ports: Port[] = [];
  const errors: string[] = [];
  let i = startIndex;

  while (i < lines.length && !isClosingBrace(lines[i])) {
    const line = lines[i];
    const portMatch = line.match(/^port\s+([A-Za-z_][A-Za-z0-9_]*)$/);
    if (!portMatch) {
      errors.push(`Déclaration de port invalide: ${line}`);
      i += 1;
      continue;
    }

    ports.push({ name: portMatch[1] });
    i += 1;
  }

  return { ports, nextIndex: i, errors };
}

function parseComponentAt(lines: string[], startIndex: number): {
  component?: Component;
  nextIndex: number;
  errors: string[];
} | null {
  const line = lines[startIndex];

  let match = line.match(
    /^component\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+when\s+(.+))?$/
  );
  if (match) {
    return {
      component: {
        kind: "component",
        name: match[1],
        ports: [],
        presenceCondition: match[2]?.trim(),
      },
      nextIndex: startIndex + 1,
      errors: [],
    };
  }

  match = line.match(
    /^optional\s+component\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+when\s+(.+))?$/
  );
  if (match) {
    return {
      component: {
        kind: "component",
        name: match[1],
        ports: [],
        optional: true,
        presenceCondition: match[2]?.trim(),
      },
      nextIndex: startIndex + 1,
      errors: [],
    };
  }

  match = line.match(
    /^component\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+when\s+(.+))?\s*\{$/
  );
  if (match) {
    const { ports, nextIndex, errors } = parsePorts(lines, startIndex + 1);
    if (nextIndex >= lines.length || !isClosingBrace(lines[nextIndex])) {
      errors.push(`Bloc component non fermé pour ${match[1]}.`);
      return {
        nextIndex,
        errors,
      };
    }

    return {
      component: {
        kind: "component",
        name: match[1],
        ports,
        presenceCondition: match[2]?.trim(),
      },
      nextIndex: nextIndex + 1,
      errors,
    };
  }

  match = line.match(
    /^optional\s+component\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+when\s+(.+))?\s*\{$/
  );
  if (match) {
    const { ports, nextIndex, errors } = parsePorts(lines, startIndex + 1);
    if (nextIndex >= lines.length || !isClosingBrace(lines[nextIndex])) {
      errors.push(`Bloc optional component non fermé pour ${match[1]}.`);
      return {
        nextIndex,
        errors,
      };
    }

    return {
      component: {
        kind: "component",
        name: match[1],
        ports,
        optional: true,
        presenceCondition: match[2]?.trim(),
      },
      nextIndex: nextIndex + 1,
      errors,
    };
  }

  return null;
}

function parseConnectorLine(line: string): Connector | null {
  const match = line.match(
    /^connect\s+([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\s*->\s*([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)$/
  );

  if (!match) return null;

  return {
    kind: "connector",
    sourceComponent: match[1],
    sourcePort: match[2],
    targetComponent: match[3],
    targetPort: match[4],
  };
}

function parseConstraintLine(line: string): Constraint | null {
  const match = line.match(
    /^constraint\s+([A-Za-z_][A-Za-z0-9_]*)\s+(requires|excludes)\s+([A-Za-z_][A-Za-z0-9_]*)$/
  );

  if (!match) return null;

  return {
    source: match[1],
    type: match[2] as "requires" | "excludes",
    target: match[3],
  };
}

function parseVariantAt(lines: string[], startIndex: number): {
  variant?: Variant;
  nextIndex: number;
  errors: string[];
} | null {
  const line = lines[startIndex];

  let match = line.match(/^variant\s+([A-Za-z_][A-Za-z0-9_]*)$/);
  if (match) {
    return {
      variant: {
        name: match[1],
        elements: [],
      },
      nextIndex: startIndex + 1,
      errors: [],
    };
  }

  match = line.match(/^variant\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{$/);
  if (!match) return null;

  const variant: Variant = {
    name: match[1],
    elements: [],
  };
  const errors: string[] = [];
  let i = startIndex + 1;

  while (i < lines.length && !isClosingBrace(lines[i])) {
    const componentResult = parseComponentAt(lines, i);
    if (componentResult) {
      errors.push(...componentResult.errors);
      if (componentResult.component) {
        variant.elements.push(componentResult.component);
      }
      i = componentResult.nextIndex;
      continue;
    }

    const connector = parseConnectorLine(lines[i]);
    if (connector) {
      variant.elements.push(connector);
      i += 1;
      continue;
    }

    errors.push(`Élément invalide dans la variante ${variant.name}: ${lines[i]}`);
    i += 1;
  }

  if (i >= lines.length || !isClosingBrace(lines[i])) {
    errors.push(`Bloc variant non fermé pour ${variant.name}.`);
    return {
      nextIndex: i,
      errors,
    };
  }

  return {
    variant,
    nextIndex: i + 1,
    errors,
  };
}

function parseVariationPointAt(lines: string[], startIndex: number): {
  variationPoint?: VariationPoint;
  nextIndex: number;
  errors: string[];
} | null {
  const line = lines[startIndex];
  const match = line.match(
    /^variationPoint\s+([A-Za-z_][A-Za-z0-9_]*)\s+(alternative|optional|or)\s*\{$/
  );

  if (!match) return null;

  const vp: VariationPoint = {
    name: match[1],
    type: match[2] as VariationType,
    variants: [],
  };

  const errors: string[] = [];
  let i = startIndex + 1;

  while (i < lines.length && !isClosingBrace(lines[i])) {
    const variantResult = parseVariantAt(lines, i);
    if (!variantResult) {
      errors.push(`Déclaration de variante invalide dans ${vp.name}: ${lines[i]}`);
      i += 1;
      continue;
    }

    errors.push(...variantResult.errors);
    if (variantResult.variant) {
      vp.variants.push(variantResult.variant);
    }
    i = variantResult.nextIndex;
  }

  if (i >= lines.length || !isClosingBrace(lines[i])) {
    errors.push(`Bloc variationPoint non fermé pour ${vp.name}.`);
    return {
      nextIndex: i,
      errors,
    };
  }

  return {
    variationPoint: vp,
    nextIndex: i + 1,
    errors,
  };
}

export function parseArchitecture(input: string): ParseResult<Architecture> {
  const errors: string[] = [];
  const lines = cleanLines(input);

  if (lines.length === 0) {
    return { errors: ["Le fichier d'architecture est vide."] };
  }

  const header = lines[0].match(/^architecture\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{$/);
  if (!header) {
    return {
      errors: ["En-tête invalide. Format attendu: architecture Nom {"],
    };
  }

  const architecture: Architecture = {
    name: header[1],
    elements: [],
    variationPoints: [],
    constraints: [],
  };

  let i = 1;
  while (i < lines.length) {
    const line = lines[i];

    if (isClosingBrace(line)) {
      if (i !== lines.length - 1) {
        errors.push("Contenu inattendu après la fermeture de l'architecture.");
      }
      break;
    }

    const componentResult = parseComponentAt(lines, i);
    if (componentResult) {
      errors.push(...componentResult.errors);
      if (componentResult.component) {
        architecture.elements.push(componentResult.component);
      }
      i = componentResult.nextIndex;
      continue;
    }

    const vpResult = parseVariationPointAt(lines, i);
    if (vpResult) {
      errors.push(...vpResult.errors);
      if (vpResult.variationPoint) {
        architecture.variationPoints.push(vpResult.variationPoint);
      }
      i = vpResult.nextIndex;
      continue;
    }

    const connector = parseConnectorLine(line);
    if (connector) {
      architecture.elements.push(connector);
      i += 1;
      continue;
    }

    const constraint = parseConstraintLine(line);
    if (constraint) {
      architecture.constraints.push(constraint);
      i += 1;
      continue;
    }

    errors.push(`Ligne non reconnue: ${line}`);
    i += 1;
  }

  validateArchitecture(architecture, errors);

  return {
    result: architecture,
    errors,
  };
}

export function parseConfiguration(input: string): ParseResult<Configuration> {
  const errors: string[] = [];
  const lines = cleanLines(input);

  if (lines.length === 0) {
    return { errors: ["Le fichier de configuration est vide."] };
  }

  const header = lines[0].match(/^configuration\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{$/);
  if (!header) {
    return {
      errors: ["En-tête invalide. Format attendu: configuration Nom {"],
    };
  }

  const selectionsMap = new Map<string, string[]>();
  const flags: string[] = [];

  let i = 1;
  while (i < lines.length) {
    const line = lines[i];

    if (isClosingBrace(line)) {
      if (i !== lines.length - 1) {
        errors.push("Contenu inattendu après la fermeture de la configuration.");
      }
      break;
    }

    let match = line.match(
      /^select\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([A-Za-z_][A-Za-z0-9_]*(?:\s*,\s*[A-Za-z_][A-Za-z0-9_]*)*)$/
    );
    if (match) {
      const vpName = match[1];
      const variants = match[2].split(",").map((s) => s.trim());
      const current = selectionsMap.get(vpName) ?? [];
      selectionsMap.set(vpName, [...current, ...variants]);
      i += 1;
      continue;
    }

    match = line.match(/^include\s+([A-Za-z_][A-Za-z0-9_]*)$/);
    if (match) {
      flags.push(match[1]);
      i += 1;
      continue;
    }

    errors.push(`Instruction de configuration invalide: ${line}`);
    i += 1;
  }

  const selectedVariants: VariantSelection[] = Array.from(selectionsMap.entries()).map(
    ([variationPoint, variants]) => ({
      variationPoint,
      variants,
    })
  );

  return {
    result: {
      name: header[1],
      selectedVariants,
      flags,
    },
    errors,
  };
}

function validateArchitecture(architecture: Architecture, errors: string[]): void {
  const topLevelComponentNames = new Set<string>();

  for (const element of architecture.elements) {
    if (element.kind === "component") {
      if (topLevelComponentNames.has(element.name)) {
        errors.push(`Composant top-level dupliqué: ${element.name}`);
      }
      topLevelComponentNames.add(element.name);

      const portNames = new Set<string>();
      for (const port of element.ports) {
        if (portNames.has(port.name)) {
          errors.push(`Port dupliqué dans ${element.name}: ${port.name}`);
        }
        portNames.add(port.name);
      }
    }
  }

  const vpNames = new Set<string>();
  for (const vp of architecture.variationPoints) {
    if (vpNames.has(vp.name)) {
      errors.push(`VariationPoint dupliqué: ${vp.name}`);
    }
    vpNames.add(vp.name);

    if (vp.variants.length === 0) {
      errors.push(`Le variationPoint ${vp.name} doit contenir au moins une variante.`);
    }

    const variantNames = new Set<string>();
    for (const variant of vp.variants) {
      if (variantNames.has(variant.name)) {
        errors.push(`Variante dupliquée dans ${vp.name}: ${variant.name}`);
      }
      variantNames.add(variant.name);

      const localComponentNames = new Set<string>();
      for (const element of variant.elements) {
        if (element.kind === "component") {
          if (localComponentNames.has(element.name)) {
            errors.push(`Composant dupliqué dans la variante ${variant.name}: ${element.name}`);
          }
          localComponentNames.add(element.name);

          const portNames = new Set<string>();
          for (const port of element.ports) {
            if (portNames.has(port.name)) {
              errors.push(`Port dupliqué dans ${element.name}: ${port.name}`);
            }
            portNames.add(port.name);
          }
        }
      }
    }
  }
}