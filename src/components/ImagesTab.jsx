import { useState } from "react";
import { generateImage, IMAGE_MODELS } from "../api.js";

const SIZES = ["1024x1024", "1536x1024", "1024x1536", "512x512"];

export default function ImagesTab({ apiKey, onOpenKey }) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(IMAGE_MODELS[0]);
  const [size, setSize] = useState(SIZES[0]);
  const [count, setCount] = useState(2);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      setImages(res.data || []);
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
        <p className="images-sub">由平台图像模型驱动 (gpt-image-1.5 / gemini-2.5-flash-image)，生成会消耗平台额度</p>
      </div>

      <div className="images-controls">
        <label className="img-field">
          <span>模型</span>
          <select value={model} onChange={(e) => setModel(e.target.value)}>
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
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="img-field">
          <span>数量</span>
          <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {[1, 2, 3, 4].map((n) => (
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

      {error && <div className="images-error">⚠️ {error}</div>}

      {loading && (
        <div className="images-loading">
          <span className="spinner big" /> 正在生成图片，通常需要 10–30 秒…
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
