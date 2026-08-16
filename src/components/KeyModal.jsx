import { useState } from "react";

export default function KeyModal({ current, onSave, onClose }) {
  const [value, setValue] = useState(current);
  const [show, setShow] = useState(false);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>API Key 设置</h3>
        <p className="modal-desc">
          使用 AI Builder Space 的 Builder API Key (以 <code>sk_</code> 开头)。
          在平台 <b>Settings</b> 页面点击 <b>Create Key</b> 生成。
          Key 仅保存在本浏览器，请求时直接发送给平台后端。
        </p>
        <div className="key-row">
          <input
            type={show ? "text" : "password"}
            value={value}
            placeholder="sk_live_..."
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
          <button className="icon-btn" onClick={() => setShow((s) => !s)}>
            {show ? "🙈" : "👁️"}
          </button>
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>取消</button>
          <button
            className="btn-primary"
            disabled={!value.trim()}
            onClick={() => onSave(value.trim())}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
