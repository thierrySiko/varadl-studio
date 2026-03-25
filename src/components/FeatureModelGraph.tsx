import { useMemo, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  Position,
} from "reactflow";
import type { Edge, Node } from "reactflow";
import { toPng, toSvg } from "html-to-image";
import "reactflow/dist/style.css";

import { getLayoutedElements } from "./graph-layout";
import type {
  Architecture,
  Constraint,
} from "../model/varadl-types";

interface Props {
  architecture: Architecture;
  selection?: Record<string, string[]>;
}

function download(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

function constraintColor(type: Constraint["type"]) {
  return type === "requires" ? "#16a34a" : "#dc2626";
}

export default function FeatureModelGraph({
  architecture,
  selection,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const layout = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const variantMap = new Map<string, string>();

    // ROOT
    nodes.push({
      id: "root",
      position: { x: 0, y: 0 },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: { label: architecture.name },
      style: {
        width: 220,
        border: "2px solid #0f172a",
        borderRadius: 10,
        padding: 10,
        background: "#f8fafc",
        fontWeight: 700,
        textAlign: "center",
      },
    });

    // VARIATION POINTS
    architecture.variationPoints.forEach((vp) => {
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
              <div style={{ fontSize: 11, color: "#475569" }}>
                {vp.type}
              </div>
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

      // VARIANTS
      vp.variants.forEach((variant) => {
        const variantId = `variant-${vp.name}-${variant.name}`;
        variantMap.set(variant.name, variantId);

        const selected =
          selection?.[vp.name]?.includes(variant.name) ?? false;

        nodes.push({
          id: variantId,
          position: { x: 0, y: 0 },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
          data: { label: variant.name },
          style: {
            width: 170,
            border: selected
              ? "2px solid #16a34a"
              : "1px solid #0891b2",
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
      });
    });

    // CONSTRAINTS
    architecture.constraints.forEach((constraint, index) => {
      const source = variantMap.get(constraint.source);
      const target = variantMap.get(constraint.target);

      if (!source || !target) return;

      const color = constraintColor(constraint.type);

      edges.push({
        id: `constraint-${index}`,
        source,
        target,
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

    return getLayoutedElements(nodes, edges, "TB");
  }, [architecture, selection]);

  async function exportPng() {
    if (!ref.current) return;

    const data = await toPng(ref.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#f8fafc",
    });

    download(data, "feature-model.png");
  }

  async function exportSvg() {
    if (!ref.current) return;

    const data = await toSvg(ref.current, {
      cacheBust: true,
      backgroundColor: "#f8fafc",
    });

    download(data, "feature-model.svg");
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <h2>Graphe Feature Model</h2>
      <div
        style={{
          marginBottom: 10,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}
      >

        <button onClick={exportPng}>Export PNG</button>
        <button onClick={exportSvg}>Export SVG</button>

        <span><strong>VP</strong> : violet</span>
        <span style={{ color: "#0891b2" }}>
          <strong>Variant</strong> : bleu
        </span>
        <span style={{ color: "#16a34a" }}>
          <strong>Selected</strong> : vert
        </span>
        <span style={{ color: "#dc2626" }}>
          <strong>Constraint</strong> : rouge
        </span>
      </div>

      <div
        ref={ref}
        style={{
          height: 520,
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
    </div>
  );
}