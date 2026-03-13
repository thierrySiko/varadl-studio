import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  Position,
} from "reactflow";
import type { Edge, Node } from "reactflow";
import "reactflow/dist/style.css";

import { getLayoutedElements } from "./graph-layout";
import type {
  Architecture,
  Constraint,
  Variant,
  VariationPoint,
} from "../model/varadl-types";

interface Props {
  architecture: Architecture;
  selection?: Record<string, string[]>;
}

function constraintColor(type: Constraint["type"]): string {
  return type === "requires" ? "#16a34a" : "#dc2626";
}

export default function FeatureModelGraph({
  architecture,
  selection,
}: Props) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const variantNodeIdsByName = new Map<string, string>();
  const componentNodeIdsByName = new Map<string, string>();

  nodes.push({
    id: "root",
    position: { x: 0, y: 0 },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    data: { label: architecture.name },
    style: {
      width: 220,
      border: "1px solid #0f172a",
      borderRadius: 10,
      padding: 10,
      background: "#f8fafc",
      fontWeight: 700,
      textAlign: "center",
    },
  });

  architecture.variationPoints.forEach((vp: VariationPoint) => {
    const vpId = `vp-${vp.name}`;

    nodes.push({
      id: vpId,
      position: { x: 0, y: 0 },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: {
        label: (
          <div>
            <div style={{ fontWeight: 700 }}>{vp.name}</div>
            <div style={{ fontSize: 11, color: "#475569" }}>{vp.type}</div>
          </div>
        ),
      },
      style: {
        width: 180,
        border: "1px solid #6366f1",
        borderRadius: 10,
        padding: 10,
        background: "#eef2ff",
        textAlign: "center",
      },
    });

    edges.push({
      id: `root-${vpId}`,
      source: "root",
      target: vpId,
      type: "smoothstep",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#6366f1",
      },
      style: {
        stroke: "#6366f1",
        strokeWidth: 2,
      },
    });

    vp.variants.forEach((variant: Variant) => {
      const variantId = `variant-${vp.name}-${variant.name}`;
      const selected = selection?.[vp.name]?.includes(variant.name) ?? false;

      variantNodeIdsByName.set(variant.name, variantId);

      nodes.push({
        id: variantId,
        position: { x: 0, y: 0 },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: { label: variant.name },
        style: {
          width: 170,
          border: selected ? "2px solid #16a34a" : "1px solid #0891b2",
          borderRadius: 10,
          padding: 10,
          background: selected ? "#dcfce7" : "#ecfeff",
          fontWeight: selected ? 700 : 500,
          textAlign: "center",
        },
      });

      edges.push({
        id: `${vpId}-${variantId}`,
        source: vpId,
        target: variantId,
        label: vp.type,
        type: "smoothstep",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#0891b2",
        },
        style: {
          stroke: "#0891b2",
          strokeWidth: 2,
        },
        labelStyle: {
          fill: "#0f172a",
          fontSize: 11,
          fontWeight: 700,
        },
      });

      variant.elements
        .filter((element) => element.kind === "component")
        .forEach((component, index) => {
          const componentId = `component-${variant.name}-${component.name}-${index}`;

          componentNodeIdsByName.set(component.name, componentId);

          nodes.push({
            id: componentId,
            position: { x: 0, y: 0 },
            sourcePosition: Position.Bottom,
            targetPosition: Position.Top,
            data: {
              label: (
                <div>
                  <div style={{ fontWeight: 600 }}>{component.name}</div>
                  <div style={{ fontSize: 11, color: "#475569" }}>
                    {component.ports.length > 0
                      ? component.ports.map((p) => p.name).join(", ")
                      : "Aucun port"}
                  </div>
                </div>
              ),
            },
            style: {
              width: 190,
              border: "1px solid #94a3b8",
              borderRadius: 10,
              padding: 10,
              background: "#ffffff",
              textAlign: "center",
            },
          });

          edges.push({
            id: `${variantId}-${componentId}`,
            source: variantId,
            target: componentId,
            type: "smoothstep",
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "#94a3b8",
            },
            style: {
              stroke: "#94a3b8",
              strokeWidth: 1.8,
            },
          });
        });
    });
  });

  // Contraintes entre variants si possible, sinon entre composants
  architecture.constraints.forEach((constraint, index) => {
    const sourceVariantId = variantNodeIdsByName.get(constraint.source);
    const targetVariantId = variantNodeIdsByName.get(constraint.target);

    const sourceComponentId = componentNodeIdsByName.get(constraint.source);
    const targetComponentId = componentNodeIdsByName.get(constraint.target);

    const sourceId = sourceVariantId ?? sourceComponentId;
    const targetId = targetVariantId ?? targetComponentId;

    if (!sourceId || !targetId) return;

    const color = constraintColor(constraint.type);

    edges.push({
      id: `constraint-${index}`,
      source: sourceId,
      target: targetId,
      label: constraint.type,
      type: "smoothstep",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color,
      },
      style: {
        stroke: color,
        strokeWidth: 2,
        strokeDasharray: "6 4",
      },
      labelStyle: {
        fill: color,
        fontSize: 11,
        fontWeight: 700,
      },
    });
  });

  const layout = getLayoutedElements(nodes, edges, "TB");

  return (
    <div
      style={{
        height: 560,
        marginBottom: 20,
        border: "1px solid #ddd",
        borderRadius: 8,
        overflow: "hidden",
        background: "#f8fafc",
      }}
    >
      <ReactFlow nodes={layout.nodes} edges={layout.edges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}