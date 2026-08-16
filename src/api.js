/**
 * AI Builder Space API 接入层
 * - 默认使用相对路径 /backend: 开发时由 Vite 代理, 部署时由平台 Nginx 同源代理
 * - 可用环境变量 VITE_API_BASE 覆盖为完整地址, 例如 https://space.ai-builders.com/backend
 */
const DEFAULT_BASE = "/backend";

export const API_BASE = (import.meta.env.VITE_API_BASE || DEFAULT_BASE).replace(/\/+$/, "");

/** 纯图像模型, 不适合对话列表 */
const IMAGE_ONLY_MODELS = new Set(["gpt-image-1.5", "gemini-2.5-flash-image"]);

/** 拉取可用模型列表 (公开接口, 无需 API Key) */
export async function fetchModels() {
  const res = await fetch(`${API_BASE}/v1/models`);
  if (!res.ok) throw new Error(`加载模型列表失败: HTTP ${res.status}`);
  const { data } = await res.json();
  return (data || []).filter((m) => !IMAGE_ONLY_MODELS.has(m.id));
}

/**
 * 流式对话 (SSE): 逐段回调 onDelta, 结束后 resolve
 * @param {object} opts
 * @param {string} opts.apiKey    Builder API Key (sk_...)
 * @param {string} opts.model     模型 id
 * @param {Array}  opts.messages  OpenAI messages 格式
 * @param {(delta:string)=>void} opts.onDelta
 * @param {AbortSignal} [opts.signal]
 */
export async function streamChat({ apiKey, model, messages, onDelta, signal }) {
  const res = await fetch(`${API_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API 错误 HTTP ${res.status}: ${text.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE 以换行分隔, 逐行解析
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) onDelta(delta);
      } catch {
        // 忽略无法解析的片段
      }
    }
  }
}
