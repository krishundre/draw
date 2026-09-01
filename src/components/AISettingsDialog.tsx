import { useState } from "react";
import { loadAIConfig, saveAIConfig, clearAIConfig, type AIProvider } from "../ai/config";

export function AISettingsDialog({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const existing = loadAIConfig();
  const [provider, setProvider] = useState<AIProvider>(existing?.provider ?? "anthropic");
  const [apiKey, setApiKey] = useState(existing?.apiKey ?? "");

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) return;
    saveAIConfig({ provider, apiKey: apiKey.trim() });
    onSaved?.();
    onClose();
  }

  function handleClear() {
    clearAIConfig();
    setApiKey("");
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="feedback-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="help-header">
          <h2>AI settings</h2>
          <button onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSave} className="feedback-form">
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            Bring your own API key — it's stored only in this browser (localStorage) and sent directly to your chosen
            provider's API. DrawBoard has no backend involved and never sees it. Anyone with access to this browser
            profile could read it back out, so don't use a key you can't afford to have exposed.
          </p>
          <label>
            Provider
            <select value={provider} onChange={(e) => setProvider(e.target.value as AIProvider)}>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI</option>
            </select>
          </label>
          <label>
            API key
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === "anthropic" ? "sk-ant-…" : "sk-…"}
              autoComplete="off"
            />
          </label>
          <button type="submit" className="tool-btn primary" disabled={!apiKey.trim()}>
            Save
          </button>
          {existing && (
            <button type="button" onClick={handleClear}>
              Remove saved key
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
