import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import ChatView from "./components/ChatView.jsx";
import TopBar from "./components/TopBar.jsx";
import ImagesTab from "./components/ImagesTab.jsx";
import KeyModal from "./components/KeyModal.jsx";
import { fetchModels, streamChat, webSearch } from "./api.js";
import {
  loadSessions,
  saveSessions,
  loadApiKey,
  saveApiKey,
  loadModel,
  saveModel,
  loadSettings,
  saveSettings,
  uid,
} from "./storage.js";

const DEFAULT_MODEL = "deepseek-v4-flash";
const NEW_TITLE = "新对话";
const MAX_CONTEXT_MESSAGES = 40;
const DEFAULT_SETTINGS = {
  temperature: 0.7, // null 表示服务端默认
  maxTokens: "", // 空 = 自动
  searchOn: false,
  systemPrompt: "You are a helpful assistant.",
};

export default function App() {
  const [sessions, setSessions] = useState(loadSessions);
  const [activeId, setActiveId] = useState(null);
  const [apiKey, setApiKey] = useState(loadApiKey);
  const [model, setModel] = useState(() => loadModel() || DEFAULT_MODEL);
  const [models, setModels] = useState([]);
  const [modelsError, setModelsError] = useState("");
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...loadSettings(),
  }));
  const [showKey, setShowKey] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [tab, setTab] = useState("chat"); // chat | images
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  // 会话持久化 (防抖, 避免流式期间频繁写)
  useEffect(() => {
    const t = setTimeout(() => saveSessions(sessions), 400);
    return () => clearTimeout(t);
  }, [sessions]);

  // 参数持久化
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const activeSession = sessions.find((s) => s.id === activeId) || null;

  /* ---------------- 会话操作 ---------------- */

  const newSession = useCallback(() => {
    const s = { id: uid(), title: NEW_TITLE, createdAt: Date.now(), messages: [] };
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
    setTab("chat");
    setSidebarOpen(false);
  }, []);

  const deleteSession = useCallback((id) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setActiveId((cur) => (cur === id ? null : cur));
  }, []);

  const renameSession = useCallback((id, title) => {
    const t = title.trim().slice(0, 60);
    if (!t) return;
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title: t } : s)));
  }, []);

  const patchSession = useCallback((id, patch) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, ...(typeof patch === "function" ? patch(s) : patch) } : s
      )
    );
  }, []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  /* ---------------- 对话核心 ---------------- */

  // 在消息尾部追加占位并执行流式生成
  const runStream = useCallback(
    async ({ sessionId, history, userText }) => {
      patchSession(sessionId, (prev) => ({
        ...prev,
        messages: [...prev.messages, { role: "assistant", content: "", streaming: true }],
      }));

      setIsStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // 联网搜索: 把结果注入为 system 上下文
        let finalMessages = history;
        if (settings.searchOn && userText) {
          try {
            const search = await webSearch({ apiKey, keywords: [userText.slice(0, 200)], maxResults: 5 });
            const items = search.queries?.[0]?.response?.results || [];
            if (items.length > 0) {
              const ctx = items
                .map((r, i) => `${i + 1}. [${r.title}](${r.url})\n${(r.content || "").slice(0, 500)}`)
                .join("\n\n");
              finalMessages = [
                history[0],
                {
                  role: "system",
                  content: `以下是针对用户问题的实时网络搜索结果, 请基于这些资料回答并在合适处标注来源序号:\n\n${ctx}`,
                },
                ...history.slice(1),
              ];
            }
          } catch {
            // 搜索失败不阻塞对话
          }
        }

        await streamChat({
          apiKey,
          model,
          messages: finalMessages,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens ? Number(settings.maxTokens) : null,
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
        patchSession(sessionId, (prev) => {
          const msgs = [...prev.messages];
          const last = msgs[msgs.length - 1];
          const msg =
            err.name === "AbortError"
              ? { ...last, streaming: false, content: last.content || "⏹️ 已停止生成" }
              : { ...last, streaming: false, content: `⚠️ ${err.message}` };
          msgs[msgs.length - 1] = msg;
          return { ...prev, messages: msgs };
        });
        if (err.name !== "AbortError" && (err.status === 401 || err.status === 403)) {
          setShowKey(true);
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [apiKey, model, settings, patchSession]
  );

  // 发送新消息
  const sendMessage = useCallback(
    async (text) => {
      const content = text.trim();
      if (!content || isStreaming) return;
      if (!apiKey) {
        setShowKey(true);
        return;
      }

      let sessionId = activeId;
      let baseMessages = activeSession?.messages || [];
      if (!sessionId) {
        const s = { id: uid(), title: NEW_TITLE, createdAt: Date.now(), messages: [] };
        setSessions((prev) => [s, ...prev]);
        sessionId = s.id;
        setActiveId(s.id);
        baseMessages = [];
      }

      const nextUserMsg = { role: "user", content };
      const history = [...baseMessages.filter((m) => !m.streaming), nextUserMsg].slice(
        -MAX_CONTEXT_MESSAGES
      );
      const historyFull = [{ role: "system", content: settings.systemPrompt }, ...history];

      patchSession(sessionId, (prev) => ({
        ...prev,
        title: prev.title === NEW_TITLE ? content.slice(0, 28) : prev.title,
        messages: [...prev.messages, nextUserMsg],
      }));

      await runStream({ sessionId, history: historyFull, userText: content });
    },
    [apiKey, activeId, activeSession, isStreaming, settings.systemPrompt, runStream]
  );

  // 重新生成最后一条助手回复
  const regenerate = useCallback(async () => {
    if (!activeSession || isStreaming) return;
    const msgs = activeSession.messages;
    if (msgs.length === 0) return;
    const last = msgs[msgs.length - 1];
    if (last.role !== "assistant" || last.streaming) return;

    const lastUser = [...msgs].reverse().find((m) => m.role === "user");
    const history = msgs.slice(0, -1).filter((m) => !m.streaming);
    const historyFull = [{ role: "system", content: settings.systemPrompt }, ...history];
    patchSession(activeSession.id, (prev) => ({
      ...prev,
      messages: prev.messages.slice(0, -1),
    }));
    await runStream({
      sessionId: activeSession.id,
      history: historyFull,
      userText: lastUser?.content || "",
    });
  }, [activeSession, isStreaming, settings.systemPrompt, runStream, patchSession]);

  // 编辑某条用户消息 → 截断其后内容并重发
  const editResend = useCallback(
    async (index, newText) => {
      const content = newText.trim();
      if (!content || !activeSession || isStreaming) return;
      const history = activeSession.messages.slice(0, index).filter((m) => !m.streaming);
      const historyFull = [{ role: "system", content: settings.systemPrompt }, ...history];
      patchSession(activeSession.id, (prev) => ({
        ...prev,
        messages: [...prev.messages.slice(0, index), { role: "user", content }],
      }));
      await runStream({
        sessionId: activeSession.id,
        history: historyFull,
        userText: content,
      });
    },
    [activeSession, isStreaming, settings.systemPrompt, runStream, patchSession]
  );

  // 删除某条消息及其之后 (分支截断)
  const truncateFrom = useCallback(
    (index) => {
      if (!activeSession || isStreaming) return;
      patchSession(activeSession.id, (prev) => ({
        ...prev,
        messages: prev.messages.slice(0, index),
      }));
    },
    [activeSession, isStreaming, patchSession]
  );

  /* ---------------- 渲染 ---------------- */

  return (
    <div className="app">
      <Sidebar
        sessions={sessions}
        activeId={activeId}
        open={sidebarOpen}
        onNew={newSession}
        onSelect={(id) => {
          setActiveId(id);
          setSidebarOpen(false);
        }}
        onDelete={deleteSession}
        onRename={renameSession}
      />

      <main className="main">
        <TopBar
          session={activeSession}
          model={model}
          models={models}
          modelsError={modelsError}
          tab={tab}
          isStreaming={isStreaming}
          settings={settings}
          onModelChange={(m) => {
            setModel(m);
            saveModel(m);
          }}
          onSettingsChange={(patch) => setSettings((s) => ({ ...s, ...patch }))}
          onTabChange={setTab}
          onOpenKey={() => setShowKey(true)}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />

        <div className="content">
          {tab === "chat" ? (
            <ChatView
              session={activeSession}
              isStreaming={isStreaming}
              searchOn={settings.searchOn}
              onSend={sendMessage}
              onStop={stopStreaming}
              onRegenerate={regenerate}
              onEditResend={editResend}
              onTruncate={truncateFrom}
              onOpenKey={() => setShowKey(true)}
            />
          ) : (
            <ImagesTab apiKey={apiKey} onOpenKey={() => setShowKey(true)} />
          )}
        </div>
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
