import { useState } from "react";
import { useStore } from "../state/store";
import { loadAIConfig } from "../ai/config";
import { generateDiagram } from "../ai/generate";
import { getRegisteredCanvas } from "../canvas/canvasRegistry";

type GenState = "idle" | "generating" | "error";

export function AIGenerateDialog({ onClose, onNeedSettings }: { onClose: () => void; onNeedSettings: () => void }) {
  const { elements, appState, addElements, setSelectedIds, commitHistory } = useStore();
  const [prompt, setPrompt] = useState("");
  const [state, setState] = useState<GenState>("idle");
  const [error, setError] = useState("");

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    const config = loadAIConfig();
    if (!config) {
      onNeedSettings();
      return;
    }
    setState("generating");
    setError("");
    try {
      const canvas = getRegisteredCanvas();
      const w = canvas?.clientWidth ?? window.innerWidth;
      const h = canvas?.clientHeight ?? window.innerHeight;
      const originX = (w / 2 - appState.scrollX) / appState.zoom;
      const originY = (h / 2 - appState.scrollY) / appState.zoom;
      const generated = await generateDiagram(prompt.trim(), config, appState, originX, originY, elements.length);
      if (!generated.length) throw new Error("The AI didn't return any shapes to add.");
      addElements(generated);
      setSelectedIds(generated.map((el) => el.id));
      commitHistory();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong generating the diagram.");
      setState("error");
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="feedback-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="help-header">
          <h2>Generate diagram (AI)</h2>
          <button onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleGenerate} className="feedback-form">
          <label>
            Describe the diagram
            <textarea
              autoFocus
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Flowchart for a user login flow with a password-check decision"
              rows={4}
              maxLength={2000}
              disabled={state === "generating"}
            />
          </label>
          {state === "error" && <div className="feedback-error">{error}</div>}
          <button type="submit" className="tool-btn primary" disabled={state === "generating" || !prompt.trim()}>
            {state === "generating" ? "Generating…" : "Generate"}
          </button>
          <button type="button" onClick={onNeedSettings}>
            AI settings
          </button>
        </form>
      </div>
    </div>
  );
}
