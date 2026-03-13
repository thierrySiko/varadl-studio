interface ComponentNodeData {
  name: string;
  ports: string[];
  optional: boolean;
}

export default function ComponentNode({ data }: { data: ComponentNodeData }) {
  return (
    <div
      style={{
        minWidth: 180,
        border: "1px solid #94a3b8",
        borderRadius: 10,
        background: "white",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          padding: "8px 10px",
          borderBottom: "1px solid #e2e8f0",
          fontWeight: 700,
          background: data.optional ? "#fff7ed" : "#f8fafc",
        }}
      >
        {data.name} {data.optional ? "(optional)" : ""}
      </div>

      <div style={{ padding: "8px 10px", fontSize: 12 }}>
        {data.ports.length === 0
          ? "Aucun port"
          : data.ports.map((p) => <div key={p}>• {p}</div>)}
      </div>
    </div>
  );
}