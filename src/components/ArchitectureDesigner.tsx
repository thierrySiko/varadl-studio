import { useMemo, useState, useCallback } from "react";


import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
} from "reactflow";

import type {
  Connection,
  Edge,
  Node,
} from "reactflow";

import "reactflow/dist/style.css";

import ComponentNode from "./nodes/ComponentNode";
import type { DesignerModel, DesignerComponent, DesignerConnector } from "../designer/designer-types";
import { designerToVarADL } from "../designer/designer-to-varadl";

const nodeTypes = {
  componentNode: ComponentNode,
};

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function ArchitectureDesigner() {
  const [model, setModel] = useState<DesignerModel>({
    architectureName: "DesignedArchitecture",
    components: [],
    connectors: [],
  });

  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);

  const initialNodes: Node[] = useMemo(
    () =>
      model.components.map((component) => ({
        id: component.id,
        type: "componentNode",
        position: { x: component.x, y: component.y },
        data: {
          name: component.name,
          ports: component.ports.map((p) => p.name),
          optional: component.optional,
        },
      })),
    [model.components]
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      model.connectors.map((connector) => ({
        id: connector.id,
        source: connector.sourceComponentId,
        target: connector.targetComponentId,
        label: `${connector.sourcePortName} → ${connector.targetPortName}`,
        type: "smoothstep",
      })),
    [model.connectors]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const syncNodesToModel = useCallback((updatedNodes: Node[]) => {
    setModel((prev) => ({
      ...prev,
      components: prev.components.map((component) => {
        const node = updatedNodes.find((n) => n.id === component.id);
        if (!node) return component;

        return {
          ...component,
          x: node.position.x,
          y: node.position.y,
        };
      }),
    }));
  }, []);

  const handleNodesChange = useCallback(
  (changes: Parameters<typeof onNodesChange>[0]) => {
    onNodesChange(changes);

    setNodes((prevNodes) => {
      const nextNodes = [...prevNodes];

      changes.forEach((change) => {
        if (change.type === "position" && change.position) {
          const index = nextNodes.findIndex((n) => n.id === change.id);
          if (index !== -1) {
            nextNodes[index] = {
              ...nextNodes[index],
              position: change.position,
            };
          }
        }
      });

      syncNodesToModel(nextNodes);
      return nextNodes;
    });
  },
  [onNodesChange, setNodes, syncNodesToModel]
);

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const sourceComponent = model.components.find((c) => c.id === connection.source);
      const targetComponent = model.components.find((c) => c.id === connection.target);
      if (!sourceComponent || !targetComponent) return;
      if (sourceComponent.ports.length === 0 || targetComponent.ports.length === 0) return;

      const connector: DesignerConnector = {
        id: makeId("conn"),
        sourceComponentId: sourceComponent.id,
        sourcePortName: sourceComponent.ports[0].name,
        targetComponentId: targetComponent.id,
        targetPortName: targetComponent.ports[0].name,
      };

      setModel((prev) => ({
        ...prev,
        connectors: [...prev.connectors, connector],
      }));

      setEdges((eds) =>
        addEdge(
          {
            id: connector.id,
            source: connector.sourceComponentId,
            target: connector.targetComponentId,
            label: `${connector.sourcePortName} → ${connector.targetPortName}`,
            type: "smoothstep",
          },
          eds
        )
      );
    },
    [model.components, setEdges]
  );

  const addComponent = () => {
    const newComponent: DesignerComponent = {
      id: makeId("comp"),
      name: `Component${model.components.length + 1}`,
      optional: false,
      ports: [],
      x: 100 + model.components.length * 40,
      y: 100 + model.components.length * 30,
    };

    setModel((prev) => ({
      ...prev,
      components: [...prev.components, newComponent],
    }));

    setNodes((prev) => [
      ...prev,
      {
        id: newComponent.id,
        type: "componentNode",
        position: { x: newComponent.x, y: newComponent.y },
        data: {
          name: newComponent.name,
          ports: [],
          optional: false,
        },
      },
    ]);
  };

  const selectedComponent =
    model.components.find((c) => c.id === selectedComponentId) ?? null;

  const updateSelectedComponent = (patch: Partial<DesignerComponent>) => {
    if (!selectedComponent) return;

    setModel((prev) => ({
      ...prev,
      components: prev.components.map((c) =>
        c.id === selectedComponent.id ? { ...c, ...patch } : c
      ),
    }));

    setNodes((prev) =>
      prev.map((node) =>
        node.id === selectedComponent.id
          ? {
              ...node,
              data: {
                ...node.data,
                name: patch.name ?? selectedComponent.name,
                optional: patch.optional ?? selectedComponent.optional,
                ports: (patch.ports ?? selectedComponent.ports).map((p) => p.name),
              },
            }
          : node
      )
    );
  };

  const addPortToSelected = () => {
    if (!selectedComponent) return;

    const nextPorts = [
      ...selectedComponent.ports,
      { id: makeId("port"), name: `port${selectedComponent.ports.length + 1}` },
    ];

    updateSelectedComponent({ ports: nextPorts });
  };

  const generatedText = useMemo(() => designerToVarADL(model), [model]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
      <div>
        <div style={{ marginBottom: 12 }}>
          <button onClick={addComponent} style={{ padding: "8px 12px", cursor: "pointer" }}>
            Ajouter un composant
          </button>
        </div>

        <div style={{ height: 520, border: "1px solid #ddd", borderRadius: 8 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onNodeClick={(_, node) => setSelectedComponentId(node.id)}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </div>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 12,
          background: "#fafafa",
        }}
      >
        <h3>Éditeur</h3>

        <div style={{ marginBottom: 12 }}>
          <label>
            Nom de l’architecture
            <input
              value={model.architectureName}
              onChange={(e) =>
                setModel((prev) => ({ ...prev, architectureName: e.target.value }))
              }
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>
        </div>

        {selectedComponent ? (
          <>
            <h4>Composant sélectionné</h4>

            <div style={{ marginBottom: 10 }}>
              <label>
                Nom
                <input
                  value={selectedComponent.name}
                  onChange={(e) => updateSelectedComponent({ name: e.target.value })}
                  style={{ width: "100%", marginTop: 4 }}
                />
              </label>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label>
                <input
                  type="checkbox"
                  checked={selectedComponent.optional}
                  onChange={(e) =>
                    updateSelectedComponent({ optional: e.target.checked })
                  }
                />{" "}
                Optional
              </label>
            </div>

            <div style={{ marginBottom: 10 }}>
              <button onClick={addPortToSelected}>Ajouter un port</button>
            </div>

            <div>
              <strong>Ports</strong>
              {selectedComponent.ports.length === 0 ? (
                <div>Aucun port</div>
              ) : (
                selectedComponent.ports.map((port, index) => (
                  <div key={port.id} style={{ marginTop: 6 }}>
                    <input
                      value={port.name}
                      onChange={(e) => {
                        const nextPorts = selectedComponent.ports.map((p, i) =>
                          i === index ? { ...p, name: e.target.value } : p
                        );
                        updateSelectedComponent({ ports: nextPorts });
                      }}
                      style={{ width: "100%" }}
                    />
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div>Sélectionne un composant dans le graphe.</div>
        )}

        <div style={{ marginTop: 20 }}>
          <h4>VarADL généré</h4>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "white",
              border: "1px solid #ddd",
              padding: 10,
              borderRadius: 6,
              maxHeight: 280,
              overflow: "auto",
            }}
          >
            {generatedText}
          </pre>
        </div>
      </div>
    </div>
  );
}