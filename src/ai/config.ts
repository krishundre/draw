export type AIProvider = "anthropic" | "openai";

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
}

const KEY = "drawboard-ai-config";

// Bring-your-own-key: the key lives only in this browser's localStorage and
// is sent directly from the browser to the provider's own API — DrawBoard
// has no backend involved and never sees it. Same tradeoff every client-side
// BYOK AI tool makes: convenient and zero-cost to run, but a key sitting in
// localStorage is exposed to any XSS on this origin. Worth knowing before
// pasting in a production key.
export function loadAIConfig(): AIConfig | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.apiKey === "string" && (parsed.provider === "anthropic" || parsed.provider === "openai")) {
      return parsed as AIConfig;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveAIConfig(config: AIConfig) {
  localStorage.setItem(KEY, JSON.stringify(config));
}

export function clearAIConfig() {
  localStorage.removeItem(KEY);
}
