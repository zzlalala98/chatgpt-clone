import { useEffect, useRef } from "react";

export default function ParamsPopover({ settings, onChange, onClose }) {
  const ref = useRef(null);

  // 点击外部关闭
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div className="popover" ref={ref}>
      <div className="popover-title">对话参数</div>

      <label className="field">
        <div className="field-head">
          <span>温度 (Temperature)</span>
          <span className="field-value">
            {settings.temperature == null ? "自动" : settings.temperature.toFixed(1)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={settings.temperature ?? 0.7}
          onChange={(e) => onChange({ temperature: Number(e.target.value) })}
        />
        <div className="field-hint">
          越高越有创造力。注意: kimi-k2.5 / gpt-5 会被服务端强制为 1.0
        </div>
      </label>

      <label className="field">
        <div className="field-head">
          <span>最大输出 tokens</span>
          <span className="field-value">{settings.maxTokens || "自动"}</span>
        </div>
        <input
          type="number"
          min={100}
          max={32000}
          step={100}
          placeholder="留空 = 自动"
          value={settings.maxTokens}
          onChange={(e) => onChange({ maxTokens: e.target.value })}
        />
      </label>

      <label className="field switch-row">
        <div>
          <div className="field-head">
            <span>🔍 联网搜索</span>
          </div>
          <div className="field-hint">回答前先用 Tavily 实时搜索, 并注入结果作为参考</div>
        </div>
        <input
          type="checkbox"
          className="switch"
          checked={settings.searchOn}
          onChange={(e) => onChange({ searchOn: e.target.checked })}
        />
      </label>

      <label className="field">
        <div className="field-head">
          <span>系统提示词</span>
        </div>
        <textarea
          rows={3}
          value={settings.systemPrompt}
          onChange={(e) => onChange({ systemPrompt: e.target.value })}
          placeholder="You are a helpful assistant."
        />
      </label>
    </div>
  );
}
