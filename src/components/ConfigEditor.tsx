interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function ConfigEditor({ value, onChange }: Props) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2>Configuration texte</h2>
      <textarea
        style={{
          width: "100%",
          height: 200,
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