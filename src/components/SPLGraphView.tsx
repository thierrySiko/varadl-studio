import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  Position,
} from "reactflow";
import type { Edge, Node } from "reactflow";
import "reactflow/dist/style.css";

import { getLayoutedElements } from "./graph-layout";
import type { Architecture } from "../model/varadl-types";

interface Props {
  architecture: Architecture;
  selection?: Record<string, string[]>;
}

export default function SPLGraphView({ architecture, selection }: Props) {

  const nodes: Node[] = []
  const edges: Edge[] = []

  // root
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
      fontWeight: 700
    }
  })

  // core components
  architecture.elements
    .filter(e => e.kind === "component")
    .forEach((component, index) => {

      const id = `core-${component.name}-${index}`

      nodes.push({
        id,
        position: { x: 0, y: 0 },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: { label: component.name },
        style: {
          width: 180,
          border: "1px solid #64748b",
          borderRadius: 10,
          padding: 10,
          background: "#ffffff",
          textAlign: "center"
        }
      })

      edges.push({
        id: `root-core-${index}`,
        source: "root",
        target: id,
        type: "smoothstep",
        markerEnd: {
          type: MarkerType.ArrowClosed
        },
        style: { stroke: "#64748b" }
      })

    })

  // variation points
  architecture.variationPoints.forEach(vp => {

    const vpId = `vp-${vp.name}`

    nodes.push({
      id: vpId,
      position: { x: 0, y: 0 },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: {
        label: (
          <div>
            <div style={{ fontWeight: 700 }}>{vp.name}</div>
            <div style={{ fontSize: 11 }}>{vp.type}</div>
          </div>
        )
      },
      style: {
        width: 190,
        border: "1px solid #6366f1",
        borderRadius: 10,
        padding: 10,
        background: "#eef2ff",
        textAlign: "center"
      }
    })

    edges.push({
      id: `root-vp-${vp.name}`,
      source: "root",
      target: vpId,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: "#6366f1", strokeWidth: 2 }
    })

    // variants
    vp.variants.forEach(variant => {

      const variantId = `variant-${vp.name}-${variant.name}`

      const selected =
        selection?.[vp.name]?.includes(variant.name) ?? false

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
          fontWeight: selected ? 700 : 500
        }
      })

      edges.push({
        id: `${vpId}-${variantId}`,
        source: vpId,
        target: variantId,
        label: vp.type,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: "#0ea5e9" }
      })

      // components inside variant
      variant.elements
        .filter(e => e.kind === "component")
        .forEach((component, index) => {

          const compId =
            `variant-comp-${variant.name}-${component.name}-${index}`

          nodes.push({
            id: compId,
            position: { x: 0, y: 0 },
            sourcePosition: Position.Bottom,
            targetPosition: Position.Top,
            data: { label: component.name },
            style: {
              width: 180,
              border: "1px solid #94a3b8",
              borderRadius: 10,
              padding: 10,
              background: "#ffffff",
              textAlign: "center"
            }
          })

          edges.push({
            id: `${variantId}-${compId}`,
            source: variantId,
            target: compId,
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: "#94a3b8" }
          })

        })

    })

  })

  const layout = getLayoutedElements(nodes, edges, "TB")

  return (
    <div
      style={{
        height: 560,
        marginBottom: 20,
        border: "1px solid #ddd",
        borderRadius: 8,
        overflow: "hidden",
        background: "#f8fafc"
      }}
    >
      <ReactFlow
        nodes={layout.nodes}
        edges={layout.edges}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}