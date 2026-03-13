import { useMemo, useState } from "react";
import { generateAllProducts } from "../analysis/generate-all-products";
import { productToText } from "../engine/derivation-engine";
import type {
  Architecture,
  Configuration,
  ProductArchitecture,
} from "../model/varadl-types";

interface Props {
  architecture: Architecture;
  onLoadProduct: (
    product: ProductArchitecture,
    configuration: Configuration
  ) => void;
}

function configToShortText(
  selectedVariants: { variationPoint: string; variants: string[] }[]
): string {
  if (selectedVariants.length === 0) return "Aucune sélection";

  return selectedVariants
    .map((s) => `${s.variationPoint} = ${s.variants.join(", ") || "∅"}`)
    .join(" | ");
}

export default function GeneratedProductsPanel({
  architecture,
  onLoadProduct,
}: Props) {
  const [showOnlyValid, setShowOnlyValid] = useState(true);

  const generated = useMemo(() => generateAllProducts(architecture), [architecture]);

  const filtered = showOnlyValid
    ? generated.filter((g) => g.product && g.errors.length === 0)
    : generated;

  const validCount = generated.filter((g) => g.product && g.errors.length === 0).length;
  const invalidCount = generated.length - validCount;

  return (
    <div
      style={{
        marginBottom: 20,
        border: "1px solid #ddd",
        padding: 16,
        borderRadius: 8,
      }}
    >
      <h2>Génération de toutes les architectures</h2>

      <div style={{ marginBottom: 10 }}>
        <div>Total : {generated.length}</div>
        <div style={{ color: "#16a34a" }}>Valides : {validCount}</div>
        <div style={{ color: "#dc2626" }}>Invalides : {invalidCount}</div>
      </div>

      <label style={{ display: "block", marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={showOnlyValid}
          onChange={() => setShowOnlyValid((v) => !v)}
        />{" "}
        Afficher seulement les architectures valides
      </label>

      <div style={{ display: "grid", gap: 12 }}>
        {filtered.map((generatedProduct, index) => (
          <div
            key={index}
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              padding: 12,
              background: generatedProduct.product ? "#f8fafc" : "#fef2f2",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              {generatedProduct.configuration.name}
            </div>

            <div style={{ fontSize: 13, marginBottom: 8, color: "#475569" }}>
              {configToShortText(generatedProduct.configuration.selectedVariants)}
            </div>

            {generatedProduct.product ? (
              <>
                <button
                  onClick={() =>
                    onLoadProduct(
                      generatedProduct.product!,
                      generatedProduct.configuration
                    )
                  }
                  style={{
                    marginBottom: 10,
                    padding: "6px 12px",
                    cursor: "pointer",
                  }}
                >
                  Visualiser dans le graphe
                </button>

                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    background: "white",
                    border: "1px solid #e2e8f0",
                    padding: 10,
                    borderRadius: 6,
                    margin: 0,
                  }}
                >
                  {productToText(generatedProduct.product)}
                </pre>
              </>
            ) : (
              <div style={{ color: "#991b1b" }}>
                {generatedProduct.errors.join("\n")}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}