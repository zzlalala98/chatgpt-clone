import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import ChatView from "./components/ChatView.jsx";
import KeyModal from "./components/KeyModal.jsx";
import { fetchModels, streamChat } from "./api.js";
import {
  loadSessions,
  saveSessions,
  loadApiKey,
  saveApiKey,
  loadModel,
  saveModel,
  uid,
} from "./storage.js";

const DEFAULT_MODEL = "deepseek-v4-flash";
const NEW_TITLE = "新对话";
const MAX_CONTEXT_MESSAGES = 40; // 超出时截断旧消息, 避免超长上下文
const SYSTEM_PROMPT = "You are a helpful assistant.";

export default function App() {
  const [sessions, setSessions] = useState(loadSessions);
  const [activeId, setActiveId] = useState(null);
  const [apiKey, setApiKey] = useState(loadApiKey);
  const [model, setModel] = useState(() => loadModel() || DEFAULT_MODEL);
  const [models, setModels] = useState([]);
  const [modelsError, setModelsError] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef(null);

  // 首次进入自动选中第一个会话
  useEffect(() => {
    if (!activeId && sessions.length > 0) setActiveId(sessions[0].id);
  }, [activeId, sessions.length]);

  // 模型列表 (公开接口)
  useEffect(() => {
    fetchModels()
      .then(setModels)
      .catch((e) => setModelsError(e.message));
  }, []);

  // 会话持久化 (流式期间防抖, 避免频繁写 localStorage)
  useEffect(() => {
    const t = setTimeout(() => saveSessions(sessions), 400);
    return () => clearTimeout(t);
  }, [sessions]);

  const activeSession = sessions.find((s) => s.id === activeId) || null;

  const newSession = useCallback(() => {
    const s = { id: uid(), title: NEW_TITLE, createdAt: Date.now(), messages: [] };
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
  }, []);

  const deleteSession = useCallback((id) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      return next;
    });
    setActiveId((cur) => (cur === id ? null : cur));
  }, []);

  const renameSession = useCallback((id, title) => {
    const t = title.trim().slice(0, 60);
    if (!t) return;
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title: t } : s)));
  }, []);

  // patch 可以是对象, 也可以是 (session) => newSession 的更新函数
  const patchSession = useCallback((id, patch) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, ...(typeof patch === "function" ? patch(s) : patch) }
          : s
      )
    );
  }, []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const sendMessage = useCallback(
    async (text) => {
      const content = text.trim();
      if (!content || isStreaming) return;

      if (!apiKey) {
        setShowKey(true);
        return;
      }

      // 确保有当前会话 (若没有则新建)
      let sessionId = activeId;
      let baseMessages = activeSession?.messages || [];
      if (!sessionId) {
        const s = { id: uid(), title: NEW_TITLE, createdAt: Date.now(), messages: [] };
        setSessions((prev) => [s, ...prev]);
        sessionId = s.id;
        setActiveId(s.id);
        baseMessages = [];
      }

      // 先在内存里拼出要发给 API 的完整历史 (含本条新消息), 避免闭包读到旧状态
      const nextUserMsg = { role: "user", content };
      const history = [...baseMessages.filter((m) => !m.streaming), nextUserMsg].slice(
        -MAX_CONTEXT_MESSAGES
      );
      const messages = [{ role: "system", content: SYSTEM_PROMPT }, ...history];

      // 追加用户消息 + 空的助手消息占位 (流式写入); 默认标题用首条消息自动命名
      patchSession(sessionId, (prev) => {
        const title =
          prev.title === NEW_TITLE ? content.slice(0, 28) : prev.title;
        return {
          ...prev,
          title,
          messages: [
            ...prev.messages,
            nextUserMsg,
            { role: "assistant", content: "", streaming: true },
          ],
        };
      });

      setIsStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamChat({
          apiKey,
          model,
          messages,
          signal: controller.signal,
          onDelta: (delta) => {
            patchSession(sessionId, (prev) => {
              const msgs = [...prev.messages];
              const last = msgs[msgs.length - 1];
              msgs[msgs.length - 1] = { ...last, content: last.content + delta };
              return { ...prev, messages: msgs };
            });
          },
        });
        patchSession(sessionId, (prev) => {
          const msgs = [...prev.messages];
          const last = msgs[msgs.length - 1];
          msgs[msgs.length - 1] = { ...last, streaming: false };
          return { ...prev, messages: msgs };
        });
      } catch (err) {
        if (err.name === "AbortError") {
          patchSession(sessionId, (prev) => {
            const msgs = [...prev.messages];
            const last = msgs[msgs.length - 1];
            msgs[msgs.length - 1] = { ...last, streaming: false };
            return { ...prev, messages: msgs };
          });
        } else {
          patchSession(sessionId, (prev) => {
            const msgs = [...prev.messages];
            const last = msgs[msgs.length - 1];
            msgs[msgs.length - 1] = {
              ...last,
              streaming: false,
              content: `⚠️ ${err.message}`,
            };
            return { ...prev, messages: msgs };
          });
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [apiKey, model, activeId, sessions, isStreaming, patchSession]
  );

  return (
    <div className="app">
      <Sidebar
        sessions={sessions}
        activeId={activeId}
        onNew={newSession}
        onSelect={setActiveId}
        onDelete={deleteSession}
        onRename={renameSession}
      />
      <main className="main">
        <ChatView
          session={activeSession}
          apiKey={apiKey}
          model={model}
          models={models}
          modelsError={modelsError}
          onModelChange={(m) => {
            setModel(m);
            saveModel(m);
          }}
          isStreaming={isStreaming}
          onSend={sendMessage}
          onStop={stopStreaming}
          onOpenSettings={() => setShowKey(true)}
        />
      </main>
      {showKey && (
        <KeyModal
          current={apiKey}
          onSave={(key) => {
            setApiKey(key);
            saveApiKey(key);
            setShowKey(false);
          }}
          onClose={() => setShowKey(false)}
        />
      )}
    </div>
  );
}
