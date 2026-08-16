import { useState } from "react";
import ModelPicker from "./ModelPicker.jsx";
import ParamsPopover from "./ParamsPopover.jsx";

export default function TopBar({
  session,
  model,
  models,
  modelsError,
  tab,
  isStreaming,
  settings,
  onModelChange,
  onSettingsChange,
  onTabChange,
  onOpenKey,
  onToggleSidebar,
}) {
  const [paramsOpen, setParamsOpen] = useState(false);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn mobile-menu" onClick={onToggleSidebar} title="打开侧边栏">
          ☰
        </button>
        <div className="tabs">
          <button
            className={`tab ${tab === "chat" ? "active" : ""}`}
            onClick={() => onTabChange("chat")}
          >
            💬 对话
          </button>
          <button
            className={`tab ${tab === "images" ? "active" : ""}`}
            onClick={() => onTabChange("images")}
          >
            🖼️ 图像
          </button>
        </div>
        {isStreaming && <span className="streaming-dot" title="正在生成" />}
      </div>

      <div className="topbar-right">
        {modelsError && (
          <span className="models-error" title={modelsError}>
            模型列表加载失败
          </span>
        )}
        <ModelPicker model={model} models={models} onChange={onModelChange} />
        <div className="popover-wrap">
          <button
            className={`icon-btn ${paramsOpen ? "active" : ""}`}
            onClick={() => setParamsOpen((v) => !v)}
            title="参数设置 (温度/联网/系统提示)"
          >
            🎛️
          </button>
          {paramsOpen && (
            <ParamsPopover
              settings={settings}
              onChange={onSettingsChange}
              onClose={() => setParamsOpen(false)}
            />
          )}
        </div>
        <button className="icon-btn" onClick={onOpenKey} title="API Key 设置">
          🔑
        </button>
      </div>
    </header>
  );
}
