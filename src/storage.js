/** localStorage 持久化辅助 */

const SESSIONS_KEY = "aibuilder.chat.sessions.v1";
const API_KEY_KEY = "aibuilder.chat.apiKey";
const MODEL_KEY = "aibuilder.chat.model";

export function uid() {
  return globalThis.crypto?.randomUUID?.() ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
