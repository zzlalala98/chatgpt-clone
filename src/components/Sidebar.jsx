import { useMemo, useState } from "react";

function fmtTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay) return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === yesterday.toDateString()) return "昨天";
  return d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

function preview(session) {
  const last = session.messages[session.messages.length - 1];
  if (!last) return "空会话";
  const text = last.content.replace(/\s+/g, " ").trim();
  return text.length > 36 ? text.slice(0, 36) + "…" : text;
}

export default function Sidebar({ sessions, activeId, open, onNew, onSelect, onDelete, onRename }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) => s.title.toLowerCase().includes(q) || preview(s).toLowerCase().includes(q)
    );
  }, [sessions, query]);

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={() => onSelect(activeId)} />}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-head">
          <div className="logo">
            <span className="logo-icon">✦</span> AI Chat
          </div>
          <button className="new-chat-btn" onClick={onNew}>
            <span>＋</span> 新建对话
          </button>
        </div>

        <input
          className="session-search"
          type="text"
          placeholder="搜索会话…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="session-list">
          {filtered.length === 0 && (
            <div className="sidebar-hint">
              {sessions.length === 0 ? "还没有会话，点击上方按钮开始第一个对话" : "没有匹配的会话"}
            </div>
          )}
          {filtered.map((s) => (
            <div
              key={s.id}
              className={`session-item ${s.id === activeId ? "active" : ""}`}
              onClick={() => onSelect(s.id)}
              onDoubleClick={() => {
                const title = window.prompt("重命名会话", s.title);
                if (title) onRename(s.id, title);
              }}
              title="双击重命名"
            >
              <div className="session-title">
                <span className="session-name">{s.title}</span>
                <button
                  className="session-delete"
                  title="删除会话"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`删除会话「${s.title}」?`)) onDelete(s.id);
                  }}
                >
                  ×
                </button>
              </div>
              <div className="session-preview">{preview(s)}</div>
              <div className="session-meta">{fmtTime(s.createdAt)}</div>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-note">会话与 API Key 仅保存在本浏览器 (localStorage)</div>
        </div>
      </aside>
    </>
  );
}
