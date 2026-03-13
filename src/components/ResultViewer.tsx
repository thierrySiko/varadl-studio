interface Props {
  result: string;
}

export default function ResultViewer({ result }: Props) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2>Architecture dérivée</h2>
      <pre
        style={{
          background: "#f6f8fa",
          border: "1px solid #ddd",
          padding: 16,
          whiteSpace: "pre-wrap",
          minHeight: 180,
        }}
      >
        {result}
      </pre>
    </div>
  );
}