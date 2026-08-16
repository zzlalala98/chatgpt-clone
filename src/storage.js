/** localStorage 持久化辅助 */

const SESSIONS_KEY = "aibuilder.chat.sessions.v1";
const API_KEY_KEY = "aibuilder.chat.apiKey";
const MODEL_KEY = "aibuilder.chat.model";
const SETTINGS_KEY = "aibuilder.chat.settings.v1";

export function uid() {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  );
}

export function loadSessions() {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function loadApiKey() {
  return localStorage.getItem(API_KEY_KEY) || "";
}

export function saveApiKey(key) {
  localStorage.setItem(API_KEY_KEY, key);
}

export function loadModel() {
  return localStorage.getItem(MODEL_KEY) || "";
}

export function saveModel(model) {
  localStorage.setItem(MODEL_KEY, model);
}

/** 参数设置: { temperature, maxTokens, searchOn, systemPrompt } */
export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
