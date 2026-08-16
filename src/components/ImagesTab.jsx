import { useState } from "react";
import { generateImage, IMAGE_MODELS } from "../api.js";

/** 每个模型支持的尺寸/数量 (实测自平台后端, 服务端不支持的组合会报错) */
const MODEL_CONFIG = {
  "gpt-image-1.5": {
    sizes: ["1024x1024", "1536x1024", "1024x1536"],
    counts: [1],
    note: "生成较慢 (约 30-60 秒/张)，仅支持单张；不支持自定义尺寸之外的参数",
  },
  "gemini-2.5-flash-image": {
    sizes: ["512x512"],
    counts: [1, 2, 4],
    note: "快速生成；服务端 1024 尺寸当前不稳定 (500)，暂只提供 512",
  },
};

export default function ImagesTab({ apiKey, onOpenKey }) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(IMAGE_MODELS[0]);
  const config = MODEL_CONFIG[model] || MODEL_CONFIG[IMAGE_MODELS[0]];
  const [size, setSize] = useState(config.sizes[0]);
  const [count, setCount] = useState(config.counts[0]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const switchModel = (m) => {
    const cfg = MODEL_CONFIG[m] || MODEL_CONFIG[IMAGE_MODELS[0]];
    setModel(m);
    setSize(cfg.sizes[0]);
    setCount(cfg.counts[0]);
    setImages([]);
    setError("");
  };

  const generate = async () => {
    const p = prompt.trim();
    if (!p || loading) return;
    if (!apiKey) {
      onOpenKey();
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await generateImage({ apiKey, prompt: p, model, n: count, size });
      const list = res.data || [];
      if (list.length === 0) {
        setError("模型没有返回图片（可能被内容过滤或服务端异常）。建议换一个更具体的提示词重试。");
      } else {
        setImages(list);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="images-tab">
      <div className="images-head">
        <h2>🖼️ 图像生成</h2>
        <p className="images-sub">
          由平台图像模型驱动，生成会消耗平台额度。模型/尺寸/数量组合已按服务端实测结果限制。
        </p>
      </div>

      <div className="images-controls">
        <label className="img-field">
          <span>模型</span>
          <select value={model} onChange={(e) => switchModel(e.target.value)}>
            {IMAGE_MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="img-field">
          <span>尺寸</span>
          <select value={size} onChange={(e) => setSize(e.target.value)}>
            {config.sizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="img-field">
          <span>数量</span>
          <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {config.counts.map((n) => (
              <option key={n} value={n}>
                {n} 张
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="images-prompt-row">
        <textarea
          rows={2}
          placeholder="描述你想要的画面，例如：赛博朋克风格的东京夜景，霓虹灯，雨夜，电影感"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              generate();
            }
          }}
        />
        <button
          className="btn-primary generate-btn"
          onClick={generate}
          disabled={loading || !prompt.trim()}
        >
          {loading ? "生成中…" : "🎨 生成"}
        </button>
      </div>
      <div className="images-note">ℹ️ {config.note}</div>

      {error && <div className="images-error">⚠️ {error}</div>}

      {loading && (
        <div className="images-loading">
          <span className="spinner big" /> 正在生成图片，通常需要 10–60 秒…
        </div>
      )}

      {!loading && images.length > 0 && (
        <div className="images-grid">
          {images.map((img, i) => {
            const src = img.url || (img.b64_json ? `data:image/png;base64,${img.b64_json}` : "");
            return (
              <figure className="image-card" key={i}>
                <img src={src} alt={`生成结果 ${i + 1}`} loading="lazy" />
                <figcaption>
                  <a className="btn-ghost small" href={src} target="_blank" rel="noreferrer">
                    打开
                  </a>
                  <a className="btn-ghost small" href={src} download={`ai-image-${Date.now()}-${i}.png`}>
                    下载
                  </a>
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}
    </div>
  );
}
