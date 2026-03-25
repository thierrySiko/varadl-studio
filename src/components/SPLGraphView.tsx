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
import type { Architecture } from "../model/varadl-types";

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

export default function SPLGraphView({ architecture, selection }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const layout = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

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
        background: "#f1f5f9",
        textAlign: "center",
        fontWeight: 700,
      },
    });

    architecture.elements
      .filter((e) => e.kind === "component")
      .forEach((component, index) => {
        const id = `core-${component.name}-${index}`;

        nodes.push({
          id,
          position: { x: 0, y: 0 },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
          data: {
            label: (
              <div>
                <div style={{ fontWeight: 700 }}>{component.name}</div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>
                  {component.ports.length > 0
                    ? component.ports.map((p) => p.name).join(", ")
                    : "Aucun port"}
                </div>
              </div>
            ),
          },
          style: {
            width: 190,
            border: "1px solid #64748b",
            borderRadius: 10,
            padding: 10,
            background: "#ffffff",
            textAlign: "center",
          },
        });

        edges.push({
          id: `root-core-${index}`,
          source: "root",
          target: id,
          type: "smoothstep",
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#64748b",
          },
          style: {
            stroke: "#64748b",
            strokeWidth: 1.8,
          },
        });
      });

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
              <div style={{ fontSize: 11, color: "#475569" }}>{vp.type}</div>
            </div>
          ),
        },
        style: {
          width: 190,
          border: "1px solid #6366f1",
          borderRadius: 10,
          padding: 10,
          background: "#eef2ff",
          textAlign: "center",
        },
      });

      edges.push({
        id: `root-vp-${vp.name}`,
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

      vp.variants.forEach((variant) => {
        const variantId = `variant-${vp.name}-${variant.name}`;
        const selected = selection?.[vp.name]?.includes(variant.name) ?? false;

        nodes.push({
          id: variantId,
          position: { x: 0, y: 0 },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
          data: { label: variant.name },
          style: {
            width: 170,
            border: selected ? "2px solid #16a34a" : "1px solid #0ea5e9",
            borderRadius: 10,
            padding: 10,
            background: selected ? "#dcfce7" : "#ecfeff",
            textAlign: "center",
            fontWeight: selected ? 700 : 500,
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
            color: "#0ea5e9",
          },
          style: {
            stroke: "#0ea5e9",
            strokeWidth: 1.8,
          },
          labelStyle: {
            fill: "#0f172a",
            fontSize: 11,
            fontWeight: 700,
          },
        });

        variant.elements
          .filter((e) => e.kind === "component")
          .forEach((component, index) => {
            const compId = `variant-comp-${variant.name}-${component.name}-${index}`;

            nodes.push({
              id: compId,
              position: { x: 0, y: 0 },
              sourcePosition: Position.Bottom,
              targetPosition: Position.Top,
              data: {
                label: (
                  <div>
                    <div style={{ fontWeight: 600 }}>{component.name}</div>
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>
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
              id: `${variantId}-${compId}`,
              source: variantId,
              target: compId,
              type: "smoothstep",
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: "#94a3b8",
              },
              style: {
                stroke: "#94a3b8",
                strokeWidth: 1.6,
              },
            });
          });
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

    download(data, "spl-architecture.png");
  }

  async function exportSvg() {
    if (!ref.current) return;

    const data = await toSvg(ref.current, {
      cacheBust: true,
      backgroundColor: "#f8fafc",
    });

    download(data, "spl-architecture.svg");
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ marginBottom: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
        
        <h2>SPL Graphe</h2>

        <button
          onClick={exportPng}
          style={{ padding: "6px 10px", cursor: "pointer" }}
        >
          Export PNG
        </button>

        <button
          onClick={exportSvg}
          style={{ padding: "6px 10px", cursor: "pointer" }}
        >
          Export SVG
        </button>

        <span><strong>Core</strong> : blanc/gris</span>
        <span style={{ color: "#6366f1" }}><strong>VP</strong> : violet clair</span>
        <span style={{ color: "#0ea5e9" }}><strong>Variant</strong> : bleu clair</span>
        <span style={{ color: "#16a34a" }}><strong>Selected</strong> : vert</span>
      </div>

      <div
        ref={ref}
        style={{
          height: 560,
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