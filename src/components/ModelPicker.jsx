const GROUPS = [
  {
    label: "⚡ 日常对话",
    ids: ["deepseek-v4-flash", "deepseek", "supermind-agent-v1"],
  },
  {
    label: "🧠 推理/旗舰",
    ids: ["deepseek-v4-pro", "gpt-5", "grok-4.5", "gemini-3-flash-preview", "kimi-k2.5", "gemini-2.5-pro"],
  },
  {
    label: "🚀 快速",
    ids: ["grok-4-fast"],
  },
];

export default function ModelPicker({ model, models, onChange }) {
  const groupOf = (id) => GROUPS.find((g) => g.ids.includes(id));
  const ordered = [
    ...GROUPS.flatMap((g) => g.ids.map((id) => models.find((m) => m.id === id)).filter(Boolean)),
    ...models.filter((m) => !groupOf(m.id)),
  ];

  const renderOptions = (list) =>
    list.map((m) => (
      <option key={m.id} value={m.id}>
        {m.id}
        {m.description ? ` — ${m.description.split(".")[0]}` : ""}
      </option>
    ));

  return (
    <select
      className="model-picker"
      value={model}
      onChange={(e) => onChange(e.target.value)}
      title="切换模型"
    >
      {GROUPS.map(
        (g) =>
          ordered.some((m) => g.ids.includes(m.id)) && (
            <optgroup key={g.label} label={g.label}>
              {renderOptions(ordered.filter((m) => g.ids.includes(m.id)))}
            </optgroup>
          )
      )}
      {ordered.some((m) => !groupOf(m.id)) && (
        <optgroup label="其他">
          {renderOptions(ordered.filter((m) => !groupOf(m.id)))}
        </optgroup>
      )}
      {models.length === 0 && <option value={model}>{model}</option>}
    </select>
  );
}
