import { useEffect, useRef } from "react";

export default function Composer({ draft, setDraft, isStreaming, searchOn, onSend, onStop }) {
  const taRef = useRef(null);

  // textarea 自适应高度
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, [draft]);

  return (
    <footer className="composer">
      {isStreaming && (
        <div className="streaming-bar">
          <span className="spinner" /> 正在生成…
          <button className="stop-btn" onClick={onStop}>
            ⏹ 停止
          </button>
        </div>
      )}
      <div className={`composer-box ${isStreaming ? "disabled" : ""}`}>
        <textarea
          ref={taRef}
          rows={1}
          value={draft}
          placeholder={
            isStreaming ? "正在回复…" : "输入消息，Enter 发送，Shift+Enter 换行，Esc 停止"
          }
          disabled={isStreaming}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && isStreaming) {
              e.preventDefault();
              onStop();
              return;
            }
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onSend(draft);
            }
          }}
        />
        <button
          className="send-btn"
          disabled={isStreaming || !draft.trim()}
          onClick={() => onSend(draft)}
          title="发送"
        >
          ➤
        </button>
      </div>
      <div className="composer-note">
        {searchOn && <span className="search-badge">🔍 联网搜索已开启</span>}
        <span>由 AI Builder Space API 驱动 · 数据仅存于本地</span>
      </div>
    </footer>
  );
}
