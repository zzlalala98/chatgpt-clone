import { useEffect, useRef, useState } from "react";
import Message from "./Message.jsx";

const SUGGESTIONS = [
  "用三句话介绍什么是 MCP",
  "帮我把这段文字翻译成英文并润色",
  "写一个 Python 快速排序，带注释",
  "总结一下如何把 React 应用部署到 Koyeb",
];

export default function ChatView({
  session,
  apiKey,
  model,
  models,
  modelsError,
  onModelChange,
  isStreaming,
  onSend,
  onStop,
  onOpenSettings,
}) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const messages = session?.messages || [];
  const lastIsStreaming = messages.some((m) => m.streaming);

  // 新消息/流式输出时自动滚到底部
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, lastIsStreaming]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    onSend(text);
  };

  return (
    <div className="chat">
      {/* 顶部栏 */}
      <header className="chat-header">
        <div className="chat-title">{session ? session.title : "AI Chat"}</div>
        <div className="chat-controls">
          {modelsError && <span className="models-error" title={modelsError}>模型列表加载失败</span>}
          <select
            className="model-picker"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            title="切换模型"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id}
              </option>
            ))}
            {models.length === 0 && (
              <option value={model}>{model}</option>
            )}
          </select>
          <button className="icon-btn" title="API Key 设置" onClick={onOpenSettings}>
            ⚙️
          </button>
        </div>
      </header>

      {/* 消息区 */}
      <div className="messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="welcome">
            <div className="welcome-logo">🤖</div>
            <h2>有什么可以帮你?</h2>
            <p className="welcome-sub">
              {apiKey
                ? `当前模型: ${model} · 会话自动保存在本浏览器`
                : "请先点击右上角 ⚙️ 设置 API Key (Settings 页面创建)"}
            </p>
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="suggestion-chip"
                  onClick={() => {
                    setDraft(s);
                    inputRef.current?.focus();
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <Message key={i} role={m.role} content={m.content} streaming={m.streaming} />
        ))}
      </div>

      {/* 输入区 */}
      <footer className="composer">
        {lastIsStreaming && (
          <div className="streaming-bar">
            <span className="spinner" /> 正在生成…
            <button className="stop-btn" onClick={onStop}>停止</button>
          </div>
        )}
        <div className="composer-box">
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            placeholder={isStreaming ? "正在回复…" : "输入消息，Enter 发送，Shift+Enter 换行"}
            disabled={isStreaming}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <button
            className="send-btn"
            disabled={isStreaming || !draft.trim()}
            onClick={submit}
            title="发送"
          >
            ➤
          </button>
        </div>
        <div className="composer-note">
          由 AI Builder Space API 驱动 · 模型与对话记录仅存于本地
        </div>
      </footer>
    </div>
  );
}
