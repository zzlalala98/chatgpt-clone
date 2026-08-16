import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Message({ role, content, streaming }) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className="msg msg-user">
        <div className="avatar user">你</div>
        <div className="bubble user-bubble">{content}</div>
      </div>
    );
  }

  const isError = content.startsWith("⚠️");

  return (
    <div className="msg msg-assistant">
      <div className="avatar assistant">AI</div>
      <div className="bubble assistant-bubble">
        {content === "" && streaming ? (
          <span className="cursor-blink">▍</span>
        ) : (
          <>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            {streaming && <span className="cursor-blink">▍</span>}
          </>
        )}
        {isError && (
          <div className="error-hint">
            可能是 Key 无效/额度用尽/模型限制，可在设置里更换 Key 后重试
          </div>
        )}
      </div>
    </div>
  );
}
