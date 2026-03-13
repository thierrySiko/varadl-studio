interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function ArchitectureEditor({ value, onChange }: Props) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2>Architecture SPL</h2>
      <textarea
        style={{
          width: "100%",
          height: 340,
          fontFamily: "monospace",
          fontSize: 14,
          padding: 12,
          boxSizing: "border-box",
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}