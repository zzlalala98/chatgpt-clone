import { useEffect, useRef, useState } from "react";
import Message from "./Message.jsx";
import Composer from "./Composer.jsx";

const SUGGESTIONS = [
  "用三句话介绍什么是 MCP",
  "把下面这段文字翻译成英文并润色",
  "写一个带注释的 Python 快速排序",
  "帮我总结一篇论文的要点（记得打开联网搜索）",
];

export default function ChatView({
  session,
  isStreaming,
  searchOn,
  onSend,
  onStop,
  onRegenerate,
  onEditResend,
  onTruncate,
  onOpenKey,
}) {
  const [draft, setDraft] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState("");
  const scrollRef = useRef(null);
  const messages = session?.messages || [];
  const streaming = messages.some((m) => m.streaming);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // 自动滚动: 靠近底部才跟随, 避免打断阅读
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (nearBottom) el.scrollTop = el.scrollHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  const submit = (text) => {
    setDraft("");
    setEditingIndex(null);
    onSend(text);
  };

  return (
    <div className="chat">
      <div className="messages" ref={scrollRef} onScroll={onScroll}>
        {messages.length === 0 && (
          <div className="welcome">
            <div className="welcome-logo">✦</div>
            <h2>有什么可以帮你?</h2>
            <p className="welcome-sub">
              多会话 · 多模型 · 流式回复 · 可联网搜索
              <br />
              在右上角 🎛️ 调整温度/联网/系统提示，🔑 设置 API Key
            </p>
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="suggestion-chip" onClick={() => setDraft(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <Message
            key={i}
            index={i}
            role={m.role}
            content={m.content}
            streaming={m.streaming}
            isLast={i === messages.length - 1}
            editing={editingIndex === i}
            editText={editText}
            onStartEdit={() => {
              setEditingIndex(i);
              setEditText(m.content);
            }}
            onCancelEdit={() => setEditingIndex(null)}
            onChangeEdit={(t) => setEditText(t)}
            onSaveEdit={() => {
              onEditResend(i, editText);
              setEditingIndex(null);
            }}
            onCopy={() => navigator.clipboard?.writeText(m.content).catch(() => {})}
            onRegenerate={onRegenerate}
            onTruncate={() => onTruncate(i)}
          />
        ))}

        {showScrollBtn && (
          <button className="scroll-bottom-btn" onClick={scrollToBottom} title="滚动到底部">
            ↓
          </button>
        )}
      </div>

      <Composer
        draft={draft}
        setDraft={setDraft}
        isStreaming={streaming}
        searchOn={searchOn}
        onSend={submit}
        onStop={onStop}
      />
    </div>
  );
}
