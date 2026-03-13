import type { VariationPoint } from "../model/varadl-types";

interface Props {
  variationPoints: VariationPoint[];
  selection: Record<string, string[]>;
  onSelectOne: (variationPoint: string, variant: string) => void;
  onToggleMany: (variationPoint: string, variant: string) => void;
}

export default function VariabilityPanel({
  variationPoints,
  selection,
  onSelectOne,
  onToggleMany,
}: Props) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2>Sélection interactive des variantes</h2>

      {variationPoints.map((vp) => (
        <div
          key={vp.name}
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
            background: "#fafafa",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            {vp.name} <span style={{ color: "#64748b" }}>({vp.type})</span>
          </div>

          {vp.type === "or" ? (
            vp.variants.map((variant) => (
              <label key={variant.name} style={{ display: "block", marginBottom: 6 }}>
                <input
                  type="checkbox"
                  checked={(selection[vp.name] ?? []).includes(variant.name)}
                  onChange={() => onToggleMany(vp.name, variant.name)}
                />{" "}
                {variant.name}
              </label>
            ))
          ) : (
            <>
              {vp.type === "optional" && (
                <label style={{ display: "block", marginBottom: 6 }}>
                  <input
                    type="radio"
                    name={vp.name}
                    checked={(selection[vp.name] ?? []).length === 0}
                    onChange={() => onSelectOne(vp.name, "")}
                  />{" "}
                  Aucun
                </label>
              )}

              {vp.variants.map((variant) => (
                <label key={variant.name} style={{ display: "block", marginBottom: 6 }}>
                  <input
                    type="radio"
                    name={vp.name}
                    checked={(selection[vp.name] ?? [])[0] === variant.name}
                    onChange={() => onSelectOne(vp.name, variant.name)}
                  />{" "}
                  {variant.name}
                </label>
              ))}
            </>
          )}
        </div>
      ))}
    </div>
  );
}