import { Children, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

function extractText(node) {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && node.props?.children) {
    return extractText(node.props.children);
  }
  return "";
}

/** 代码块: 语言标签 + 复制按钮 */
function CodeBlock({ children }) {
  const [copied, setCopied] = useState(false);
  let lang = "";
  Children.forEach(children, (child) => {
    if (child?.props?.className) {
      const m = /language-([\w-]+)/.exec(child.props.className);
      if (m) lang = m[1];
    }
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(extractText(children));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 剪贴板不可用时忽略 */
    }
  };

  return (
    <div className="codeblock">
      <div className="codeblock-head">
        <span className="codeblock-lang">{lang || "code"}</span>
        <button className="codeblock-copy" onClick={copy}>
          {copied ? "✓ 已复制" : "⧉ 复制"}
        </button>
      </div>
      <pre>{children}</pre>
    </div>
  );
}

export default function Message({
  index,
  role,
  content,
  streaming,
  isLast,
  editing,
  editText,
  onStartEdit,
  onCancelEdit,
  onChangeEdit,
  onSaveEdit,
  onCopy,
  onRegenerate,
  onTruncate,
}) {
  const isUser = role === "user";

  if (editing) {
    return (
      <div className="msg msg-user">
        <div className="avatar user">你</div>
        <div className="edit-box">
          <textarea
            rows={4}
            value={editText}
            autoFocus
            onChange={(e) => onChangeEdit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                onSaveEdit();
              }
              if (e.key === "Escape") onCancelEdit();
            }}
          />
          <div className="edit-actions">
            <button className="btn-ghost" onClick={onCancelEdit}>
              取消
            </button>
            <button className="btn-primary" onClick={onSaveEdit} disabled={!editText.trim()}>
              保存并重新发送
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="msg msg-user">
        <div className="avatar user">你</div>
        <div className="msg-body">
          <div className="bubble user-bubble">{content}</div>
          <div className="msg-actions">
            <button className="msg-action" onClick={onStartEdit} title="编辑此消息并重新发送">
              ✎ 编辑
            </button>
            <button className="msg-action" onClick={onCopy} title="复制">
              ⧉ 复制
            </button>
            <button className="msg-action danger" onClick={onTruncate} title="删除此条及之后">
              ✂ 从此处截断
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isError = content.startsWith("⚠️") || content.startsWith("⏹️");

  return (
    <div className="msg msg-assistant">
      <div className="avatar assistant">AI</div>
      <div className="msg-body">
        <div className="bubble assistant-bubble">
          {content === "" && streaming ? (
            <span className="cursor-blink">▍</span>
          ) : (
            <>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{ pre: CodeBlock }}
              >
                {content}
              </ReactMarkdown>
              {streaming && <span className="cursor-blink">▍</span>}
            </>
          )}
          {isError && !streaming && (
            <div className="error-hint">
              {content.startsWith("⚠️")
                ? "可尝试: 检查 Key (🔑)、降低温度、换一个模型后重试"
                : "点击 ⏹ 已停止，可继续输入或重新生成"}
            </div>
          )}
        </div>
        <div className="msg-actions">
          <button className="msg-action" onClick={onCopy} title="复制">
            ⧉ 复制
          </button>
          {isLast && !streaming && (
            <button className="msg-action" onClick={onRegenerate} title="重新生成">
              ↻ 重新生成
            </button>
          )}
          <button className="msg-action danger" onClick={onTruncate} title="删除此条及之后">
            ✂ 从此处截断
          </button>
        </div>
      </div>
    </div>
  );
}
