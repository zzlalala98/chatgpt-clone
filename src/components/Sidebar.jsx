export default function Sidebar({ sessions, activeId, onNew, onSelect, onDelete, onRename }) {
  const fmtTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay
      ? d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
  };

  return (
    <aside className="sidebar">
      <button className="new-chat-btn" onClick={onNew}>
        <span>＋</span> 新建对话
      </button>

      <div className="session-list">
        {sessions.length === 0 && (
          <div className="sidebar-hint">还没有会话，点击上方按钮开始第一个对话</div>
        )}
        {sessions.map((s) => (
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
            <div className="session-meta">{fmtTime(s.createdAt)}</div>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-note">
          会话与 API Key 仅保存在本浏览器 (localStorage)
        </div>
      </div>
    </aside>
  );
}
