import { useEffect, useMemo, useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  Position,
  useEdgesState,
  useNodesState,
  addEdge,
  reconnectEdge,
} from "reactflow";
import type { Edge, Node, Connection } from "reactflow";
import "reactflow/dist/style.css";

import { getLayoutedElements } from "./graph-layout";

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
}

function isComponent(element: ArchitecturalElement): element is Component {
  return element.kind === "component";
}

function isConnector(element: ArchitecturalElement): element is Connector {
  return element.kind === "connector";
}

function constraintColor(type: Constraint["type"]) {
  return type === "requires" ? "#16a34a" : "#dc2626";
}

function nodeStyleByOrigin(origin?: string) {
  switch (origin) {
    case "optional":
      return {
        background: "#fff7ed",
        border: "1px solid #f97316",
      };
    case "variant":
      return {
        background: "#eff6ff",
        border: "1px solid #2563eb",
      };
    case "database":
      return {
        background: "#f5f3ff",
        border: "1px solid #7c3aed",
      };
    case "core":
    default:
      return {
        background: "#ffffff",
        border: "1px solid #94a3b8",
      };
  }
}

export default function GraphViewReactFlow({
  productElements,
  architecture,
}: Props) {
  const layout = useMemo(() => {
    const components = productElements.filter(isComponent);
    const connectors = productElements.filter(isConnector);

    const componentNames = new Set(components.map((c) => c.name));

    const nodes: Node[] = components.map((component) => {
      const styleByOrigin = nodeStyleByOrigin(component.origin);

      return {
        id: component.name,
        position: { x: 0, y: 0 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          label: (
            <div>
              <strong>{component.name}</strong>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>
                {component.ports.length > 0
                  ? component.ports.map((p) => p.name).join(", ")
                  : "Aucun port"}
              </div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
                {component.origin ?? "core"}
              </div>
            </div>
          ),
        },
        style: {
          borderRadius: 10,
          padding: 10,
          width: 220,
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          ...styleByOrigin,
        },
      };
    });

    const edges: Edge[] = [];

    connectors.forEach((c, index) => {
      edges.push({
        id: `conn-${index}`,
        source: c.sourceComponent,
        target: c.targetComponent,
        label: `${c.sourcePort} → ${c.targetPort}`,
        type: "bezier",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#64748b",
        },
        style: {
          stroke: "#64748b",
          strokeWidth: 2,
        },
        labelStyle: {
          fontSize: 11,
          fontWeight: 600,
          fill: "#334155",
        },
      });
    });

    if (architecture) {
      architecture.constraints
        .filter(
          (c) => componentNames.has(c.source) && componentNames.has(c.target)
        )
        .forEach((constraint, index) => {
          edges.push({
            id: `constraint-${index}`,
            source: constraint.source,
            target: constraint.target,
            label: constraint.type,
            type: "bezier",
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: constraintColor(constraint.type),
            },
            style: {
              stroke: constraintColor(constraint.type),
              strokeDasharray: "6 4",
            },
            labelStyle: {
              fontSize: 11,
              fontWeight: 700,
              fill: constraintColor(constraint.type),
            },
          });
        });
    }

    return getLayoutedElements(nodes, edges, "LR");
  }, [productElements, architecture]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout.edges);

  useEffect(() => {
    setNodes(layout.nodes);
    setEdges(layout.edges);
  }, [layout, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: "bezier",
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "#64748b",
            },
            style: {
              stroke: "#64748b",
              strokeWidth: 2,
            },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
    },
    [setEdges]
  );

  function resetLayout() {
    const layouted = getLayoutedElements(
      nodes.map((n) => ({ ...n, position: { x: 0, y: 0 } })),
      edges,
      "LR"
    );

    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ marginBottom: 10, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={resetLayout}
          style={{ padding: "6px 10px", cursor: "pointer" }}
        >
          Reset layout
        </button>

        <span><strong>Core</strong> : gris</span>
        <span style={{ color: "#f97316" }}><strong>Optional</strong> : orange</span>
        <span style={{ color: "#2563eb" }}><strong>Variant</strong> : bleu</span>
        <span style={{ color: "#7c3aed" }}><strong>Database</strong> : violet</span>
      </div>

      <div
        style={{
          height: 560,
          border: "1px solid #ddd",
          borderRadius: 8,
          overflow: "hidden",
          background: "#f8fafc",
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onReconnect={onReconnect}
          fitView
          nodesDraggable
          nodesConnectable
          elementsSelectable
          defaultEdgeOptions={{
            type: "bezier",
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
          }}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}