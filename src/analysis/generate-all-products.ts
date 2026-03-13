import type {
  Architecture,
  Configuration,
  ProductArchitecture,
} from "../model/varadl-types";
import { deriveProductArchitecture } from "../engine/derivation-engine";

export interface GeneratedProduct {
  configuration: Configuration;
  product?: ProductArchitecture;
  errors: string[];
}

function buildSelections(
  architecture: Architecture
): Record<string, string[]>[] {
  const variationPoints = architecture.variationPoints;
  const results: Record<string, string[]>[] = [];

  function backtrack(index: number, current: Record<string, string[]>) {
    if (index === variationPoints.length) {
      results.push({ ...current });
      return;
    }

    const vp = variationPoints[index];

    if (vp.type === "alternative") {
      for (const variant of vp.variants) {
        current[vp.name] = [variant.name];
        backtrack(index + 1, current);
      }
      return;
    }

    if (vp.type === "optional") {
      current[vp.name] = [];
      backtrack(index + 1, current);

      for (const variant of vp.variants) {
        current[vp.name] = [variant.name];
        backtrack(index + 1, current);
      }
      return;
    }

    if (vp.type === "or") {
      const variants = vp.variants.map((v) => v.name);
      const n = variants.length;

      for (let mask = 1; mask < 1 << n; mask++) {
        const selected: string[] = [];
        for (let i = 0; i < n; i++) {
          if (mask & (1 << i)) {
            selected.push(variants[i]);
          }
        }
        current[vp.name] = selected;
        backtrack(index + 1, current);
      }
    }
  }

  backtrack(0, {});
  return results;
}

export function generateAllProducts(
  architecture: Architecture
): GeneratedProduct[] {
  const selections = buildSelections(architecture);

  return selections.map((selection, index) => {
    const configuration: Configuration = {
      name: `GeneratedProduct${index + 1}`,
      selectedVariants: Object.entries(selection).map(
        ([variationPoint, variants]) => ({
          variationPoint,
          variants,
        })
      ),
      flags: [],
    };

    const result = deriveProductArchitecture(architecture, configuration);

    return {
      configuration,
      product: result.product,
      errors: result.errors,
    };
  });
}