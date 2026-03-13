import type {
  Architecture,
  ArchitecturalElement,
  Component,
  Connector,
  Constraint,
} from "../model/varadl-types";

interface Props {
  productElements: ArchitecturalElement[];
  architecture?: Architecture | null;
  selection?: Record<string, string[]>;
  showSpl?: boolean;
}

function isComponent(element: ArchitecturalElement): element is Component {
  return element.kind === "component";
}

function isConnector(element: ArchitecturalElement): element is Connector {
  return element.kind === "connector";
}

function constraintColor(type: Constraint["type"]): string {
  return type === "requires" ? "#16a34a" : "#dc2626";
}

function constraintDash(type: Constraint["type"]): string {
  return type === "requires" ? "6 4" : "10 4";
}

export default function GraphView({
  productElements,
  architecture,
  selection,
  showSpl = true,
}: Props) {
  const components = productElements.filter(isComponent);
  const connectors = productElements.filter(isConnector);

  const width = 1200;
  const productHeight = Math.max(320, 180 * Math.ceil(components.length / 3));
  const splHeight = architecture ? Math.max(320, 220 * architecture.variationPoints.length) : 0;
  const totalHeight = showSpl && architecture ? splHeight + productHeight + 100 : productHeight;

  const nodePositions = new Map<string, { x: number; y: number }>();

  components.forEach((component, index) => {
    nodePositions.set(component.name, {
      x: 60 + (index % 3) * 320,
      y:
        showSpl && architecture
          ? splHeight + 100 + 60 + Math.floor(index / 3) * 170
          : 60 + Math.floor(index / 3) * 170,
    });
  });

  const activeComponentNames = new Set(components.map((c) => c.name));

  const visibleConstraints =
    architecture?.constraints.filter(
      (c) => activeComponentNames.has(c.source) && activeComponentNames.has(c.target),
    ) ?? [];

  return (
    <div style={{ marginBottom: 20 }}>
      <h2>Vue graphe</h2>

      <div
        style={{
          marginBottom: 12,
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          fontSize: 14,
        }}
      >
        <span>
          <strong>Connecteurs</strong> : ligne grise continue
        </span>
        <span style={{ color: "#16a34a" }}>
          <strong>Requires</strong> : ligne verte pointillée
        </span>
        <span style={{ color: "#dc2626" }}>
          <strong>Excludes</strong> : ligne rouge pointillée
        </span>
        <span>
          <strong>Variante sélectionnée</strong> : nœud vert
        </span>
      </div>

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: width,
          height: totalHeight,
          border: "1px solid #ddd",
          background: "#fafafa",
          overflow: "auto",
        }}
      >
        <svg width={width} height={totalHeight} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
            </marker>

            <marker
              id="arrow-requires"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#16a34a" />
            </marker>

            <marker
              id="arrow-excludes"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
            </marker>
          </defs>

          {/* Connecteurs structurels du produit */}
          {connectors.map((connector, index) => {
            const source = nodePositions.get(connector.sourceComponent);
            const target = nodePositions.get(connector.targetComponent);
            if (!source || !target) return null;

            return (
              <line
                key={`prod-${index}`}
                x1={source.x + 220}
                y1={source.y + 45}
                x2={target.x}
                y2={target.y + 45}
                stroke="#64748b"
                strokeWidth="2"
                markerEnd="url(#arrow)"
              />
            );
          })}

          {/* Contraintes actives sur le produit dérivé */}
          {visibleConstraints.map((constraint) => {
            const source = nodePositions.get(constraint.source);
            const target = nodePositions.get(constraint.target);
            if (!source || !target) return null;
            const sourceCenterX = source.x + 110
            const sourceCenterY = source.y + 45

            const targetCenterX = target.x + 110
            const targetCenterY = target.y + 45

            return (
            <path
              d={`M ${sourceCenterX} ${sourceCenterY}
                  C ${(sourceCenterX + targetCenterX) / 2} ${sourceCenterY - 40},
                    ${(sourceCenterX + targetCenterX) / 2} ${targetCenterY + 40},
                    ${targetCenterX} ${targetCenterY}`}
              stroke={constraintColor(constraint.type)}
              strokeWidth="2.5"
              fill="none"
              strokeDasharray={constraintDash(constraint.type)}
              markerEnd={
                constraint.type === "requires"
                  ? "url(#arrow-requires)"
                  : "url(#arrow-excludes)"
              }
            />
          );
          })}

          {/* Contraintes dans la vue SPL */}
          {showSpl &&
            architecture &&
            architecture.constraints.map((constraint, index) => {
              const sourceVpIndex = architecture.variationPoints.findIndex((vp) =>
                vp.variants.some((variant) =>
                  variant.elements.some(
                    (e) => e.kind === "component" && e.name === constraint.source,
                  ),
                ),
              );

              const targetVpIndex = architecture.variationPoints.findIndex((vp) =>
                vp.variants.some((variant) =>
                  variant.elements.some(
                    (e) => e.kind === "component" && e.name === constraint.target,
                  ),
                ),
              );

              if (sourceVpIndex === -1 || targetVpIndex === -1) return null;

              const x1 = 100 + sourceVpIndex * 320 + 70;
              const x2 = 100 + targetVpIndex * 320 + 70;
              const y = 18;

              return (
                <line
                  key={`spl-constraint-${index}`}
                  x1={x1}
                  y1={y}
                  x2={x2}
                  y2={y}
                  stroke={constraintColor(constraint.type)}
                  strokeDasharray={constraintDash(constraint.type)}
                  strokeWidth="2"
                  markerEnd={
                    constraint.type === "requires"
                      ? "url(#arrow-requires)"
                      : "url(#arrow-excludes)"
                  }
                />
              );
            })}

          {/* Vue SPL simplifiée */}
          {showSpl &&
            architecture &&
            architecture.variationPoints.map((vp, vpIndex) => {
              const vpX = 100 + vpIndex * 320;
              const vpY = 40;
              const variantSpacing = 140;

              return (
                <g key={`vp-${vp.name}`}>
                  {vp.variants.map((variant, vIndex) => {
                    const variantX =
                      vpX - ((vp.variants.length - 1) * variantSpacing) / 2 + vIndex * variantSpacing;
                    const variantY = vpY + 90;

                    return (
                      <g key={`variant-${vp.name}-${variant.name}`}>
                        <line
                          x1={vpX + 70}
                          y1={vpY + 40}
                          x2={variantX + 60}
                          y2={variantY}
                          stroke="#f59e0b"
                          strokeWidth="2"
                          strokeDasharray="6 4"
                        />

                        {variant.elements
                          .filter(isComponent)
                          .map((component, cIndex) => {
                            const compX = variantX;
                            const compY = variantY + 80 + cIndex * 80;

                            return (
                              <g key={`variant-comp-${vp.name}-${variant.name}-${component.name}`}>
                                <line
                                  x1={variantX + 60}
                                  y1={variantY + 32}
                                  x2={compX + 90}
                                  y2={compY}
                                  stroke="#8b5cf6"
                                  strokeWidth="2"
                                  strokeDasharray="4 4"
                                />
                              </g>
                            );
                          })}
                      </g>
                    );
                  })}
                </g>
              );
            })}
        </svg>

        {/* Nœuds SPL */}
        {showSpl &&
          architecture &&
          architecture.variationPoints.map((vp, vpIndex) => {
            const vpX = 100 + vpIndex * 320;
            const vpY = 40;
            const variantSpacing = 140;

            return (
              <div key={`vp-node-${vp.name}`}>
                <div
                  style={{
                    position: "absolute",
                    left: vpX,
                    top: vpY,
                    width: 140,
                    border: "1px solid #f59e0b",
                    borderRadius: 8,
                    background: "#fff7ed",
                    padding: "8px 10px",
                    fontWeight: 700,
                    textAlign: "center",
                  }}
                >
                  VP: {vp.name}
                </div>

                {vp.variants.map((variant, vIndex) => {
                  const variantX =
                    vpX - ((vp.variants.length - 1) * variantSpacing) / 2 + vIndex * variantSpacing;
                  const variantY = vpY + 90;
                  const selected = selection?.[vp.name]?.includes(variant.name) ?? false;

                  return (
                    <div key={`variant-node-${vp.name}-${variant.name}`}>
                      <div
                        style={{
                          position: "absolute",
                          left: variantX,
                          top: variantY,
                          width: 120,
                          border: selected ? "2px solid #16a34a" : "1px solid #8b5cf6",
                          borderRadius: 8,
                          background: selected ? "#dcfce7" : "#f5f3ff",
                          padding: "6px 8px",
                          textAlign: "center",
                          fontWeight: 600,
                        }}
                      >
                        {variant.name}
                      </div>

                      {variant.elements.filter(isComponent).map((component, cIndex) => {
                        const compX = variantX;
                        const compY = variantY + 80 + cIndex * 80;

                        return (
                          <div
                            key={`variant-comp-node-${vp.name}-${variant.name}-${component.name}`}
                            style={{
                              position: "absolute",
                              left: compX,
                              top: compY,
                              width: 180,
                              border: "1px solid #cbd5e1",
                              borderRadius: 8,
                              background: "white",
                              padding: "8px 10px",
                              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                            }}
                          >
                            <div style={{ fontWeight: 700 }}>{component.name}</div>
                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                              {component.ports.length === 0
                                ? "Aucun port"
                                : component.ports.map((p) => p.name).join(", ")}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}

        {/* Nœuds produit */}
        {components.map((component) => {
          const pos = nodePositions.get(component.name);
          if (!pos) return null;

          return (
            <div
              key={component.name}
              style={{
                position: "absolute",
                left: pos.x,
                top: pos.y,
                width: 220,
                border: "1px solid #94a3b8",
                borderRadius: 8,
                background: "white",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              }}
            >
              <div
                style={{
                  padding: "8px 10px",
                  borderBottom: "1px solid #e2e8f0",
                  fontWeight: 700,
                  background: "#f8fafc",
                }}
              >
                {component.name}
              </div>

              <div style={{ padding: "8px 10px", fontSize: 13 }}>
                {component.ports.length === 0 ? (
                  <div style={{ color: "#64748b" }}>Aucun port</div>
                ) : (
                  component.ports.map((port) => <div key={port.name}>• {port.name}</div>)
                )}
              </div>
            </div>
          );
        })}

        {/* Labels des contraintes actives */}
        {visibleConstraints.map((constraint, index) => {
          const source = nodePositions.get(constraint.source);
          const target = nodePositions.get(constraint.target);
          if (!source || !target) return null;

          const sourceCenterX = source.x + 110
          const sourceCenterY = source.y + 45

          const targetCenterX = target.x + 110
          const targetCenterY = target.y + 45

          const labelX = (sourceCenterX + targetCenterX) / 2
          const labelY = (sourceCenterY + targetCenterY) / 2

          return (
            <div
              key={`constraint-label-${index}`}
              style={{
                position: "absolute",
                left: labelX - 35,
                top: labelY - 10,
                padding: "2px 8px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                background: constraint.type === "requires" ? "#dcfce7" : "#fee2e2",
                color: constraint.type === "requires" ? "#166534" : "#991b1b",
                border:
                  constraint.type === "requires"
                    ? "1px solid #86efac"
                    : "1px solid #fca5a5",
              }}
            >
              {constraint.type}
            </div>
          );
        })}
      </div>
    </div>
  );
}