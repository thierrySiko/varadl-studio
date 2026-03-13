export interface Port {
  name: string;
}

export type ElementOrigin = "core" | "optional" | "variant" | "database";

export interface Component {
  kind: "component";
  name: string;
  ports: Port[];
  optional?: boolean;
  presenceCondition?: string;
  origin?: ElementOrigin;
}

export interface Connector {
  kind: "connector";
  sourceComponent: string;
  sourcePort: string;
  targetComponent: string;
  targetPort: string;
}

export type ArchitecturalElement = Component | Connector;

export interface Variant {
  name: string;
  elements: ArchitecturalElement[];
}

export type VariationType = "alternative" | "optional" | "or";
export type ConstraintType = "requires" | "excludes";

export interface VariationPoint {
  name: string;
  type: VariationType;
  variants: Variant[];
}

export interface Constraint {
  source: string;
  type: ConstraintType;
  target: string;
}

export interface Architecture {
  name: string;
  elements: ArchitecturalElement[];
  variationPoints: VariationPoint[];
  constraints: Constraint[];
}

export interface VariantSelection {
  variationPoint: string;
  variants: string[];
}

export interface Configuration {
  name: string;
  selectedVariants: VariantSelection[];
  flags: string[];
}

export interface ProductArchitecture {
  name: string;
  elements: ArchitecturalElement[];
}

export interface ParseResult<T> {
  result?: T;
  errors: string[];
}