/**
 * AI Builder Space API 接入层
 * - 默认使用相对路径 /backend: 开发时由 Vite 代理, 部署时由平台 Nginx 同源代理
 * - 可用环境变量 VITE_API_BASE 覆盖为完整地址
 */
const DEFAULT_BASE = "/backend";

export const API_BASE = (import.meta.env.VITE_API_BASE || DEFAULT_BASE).replace(/\/+$/, "");

/** 纯图像模型, 不出现在对话模型列表 */
export const IMAGE_MODELS = ["gpt-image-1.5", "gemini-2.5-flash-image"];

/** 拉取可用模型列表 (公开接口, 无需 API Key) */
export async function fetchModels() {
  const res = await fetch(`${API_BASE}/v1/models`);
  if (!res.ok) throw new Error(`加载模型列表失败: HTTP ${res.status}`);
  const { data } = await res.json();
  return (data || []).filter((m) => !IMAGE_MODELS.includes(m.id));
}

/**
 * 流式对话 (SSE)
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {string} opts.model
 * @param {Array} opts.messages
 * @param {number|null} opts.temperature  0-2, null 表示用服务端默认
 * @param {number|null} opts.maxTokens
 * @param {(delta:string)=>void} opts.onDelta
 * @param {AbortSignal} [opts.signal]
 */
export async function streamChat({ apiKey, model, messages, temperature, maxTokens, onDelta, signal }) {
  const body = { model, messages, stream: true };
  if (temperature != null && !Number.isNaN(temperature)) body.temperature = temperature;
  if (maxTokens) body.max_tokens = maxTokens;

  const res = await fetch(`${API_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const status = res.status;
    const detail = text.slice(0, 300);
    if (status === 401 || status === 403) {
      throw new ApiError("API Key 无效或没有权限，请检查设置里的 Key", status);
    }
    if (status === 429) {
      throw new ApiError("请求过于频繁或已达额度上限，请稍后再试", status);
    }
    throw new ApiError(`API 错误 HTTP ${status}: ${detail}`, status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

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

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** 联网搜索 (Tavily) */
export async function webSearch({ apiKey, keywords, maxResults = 5 }) {
  const res = await fetch(`${API_BASE}/v1/search/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ keywords, max_results: maxResults }),
  });
  if (!res.ok) throw new ApiError(`搜索失败: HTTP ${res.status}`, res.status);
  return res.json();
}

/**
 * 图片生成
 * 注意: 不能传 response_format — gpt-image-1.5 会直接 400 拒绝该参数;
 * gemini 模型不受影响, 返回的 data[] 同时带 b64_json 与 url。
 */
export async function generateImage({ apiKey, prompt, model, n, size }) {
  const body = { prompt, model, n, size };
  const res = await fetch(`${API_BASE}/v1/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(240000), // 图片生成可能很慢, 4 分钟上限
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // 服务端偶发返回纯文本错误 (如 Internal Server Error)
    const detail = text.trim().startsWith("{") ? text.slice(0, 200) : `服务端错误: ${text.trim().slice(0, 120) || "无响应体"}`;
    throw new ApiError(`图片生成失败 HTTP ${res.status}: ${detail}`, res.status);
  }
  return res.json();
}
