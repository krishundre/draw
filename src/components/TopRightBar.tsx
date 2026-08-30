import { useState } from "react";
import { useStore } from "../state/store";
import { Icon } from "./Icon";
import { getShareUrl, connectCollab } from "../collab/doc";
import { StatsPanel } from "./StatsPanel";
import { FeedbackDialog } from "./FeedbackDialog";

const NAME_KEY = "drawboard-username";
const COLOR_KEY = "drawboard-usercolor";
const COLORS = ["#e03131", "#2f9e44", "#1971c2", "#f08c00", "#9c36b5"];

// Collaboration needs a running WebSocket relay (see server/index.js). If no URL is
// configured at build time, hide the Share button rather than offering a dead feature.
const COLLAB_ENABLED = Boolean(import.meta.env.VITE_COLLAB_WS_URL);
const DOCS_URL = "/docs";

export function TopRightBar({ onOpenLibrary, onOpenHelp }: { onOpenLibrary: () => void; onOpenHelp: () => void }) {
  const { appState, setAppState } = useStore();
  const [shareOpen, setShareOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [connected, setConnected] = useState(false);

  function toggleTheme() {
    setAppState({ theme: appState.theme === "light" ? "dark" : "light" });
  }

  async function handleShare() {
    if (!connected) {
      let name = localStorage.getItem(NAME_KEY);
      if (!name) {
        name = prompt("Your display name for collaboration:", "Guest") || "Guest";
        localStorage.setItem(NAME_KEY, name);
      }
      let color = localStorage.getItem(COLOR_KEY);
      if (!color) {
        color = COLORS[Math.floor(Math.random() * COLORS.length)];
        localStorage.setItem(COLOR_KEY, color);
      }
      await connectCollab(name, color);
      setConnected(true);
    }
    setShareOpen((v) => !v);
  }

  return (
    <div className="top-right-bar">
      <button className="tool-btn" title="Library" onClick={onOpenLibrary}>
        📚
      </button>
      <button className="tool-btn" title="Stats" onClick={() => setStatsOpen((v) => !v)}>
        <Icon name="menu" />
      </button>
      <button className="tool-btn" title="Toggle theme" onClick={toggleTheme}>
        <Icon name={appState.theme === "light" ? "moon" : "sun"} />
      </button>
      {COLLAB_ENABLED && (
        <button className="tool-btn primary" title="Live collaboration" onClick={handleShare}>
          Share
        </button>
      )}
      <button className="tool-btn" title="Send feedback" onClick={() => setFeedbackOpen(true)}>
        💬
      </button>
      <a className="tool-btn" title="Docs / Help guide" href={DOCS_URL} target="_blank" rel="noreferrer">
        📖
      </a>
      <button className="tool-btn" title="Keyboard shortcuts (?)" onClick={onOpenHelp}>
        ?
      </button>
      {feedbackOpen && <FeedbackDialog onClose={() => setFeedbackOpen(false)} />}
      {shareOpen && (
        <div className="dropdown share-dropdown">
          <p>Send this link to collaborate live:</p>
          <input readOnly value={getShareUrl()} onClick={(e) => (e.target as HTMLInputElement).select()} />
          <button
            onClick={() => {
              navigator.clipboard.writeText(getShareUrl());
              setShareOpen(false);
            }}
          >
            Copy link
          </button>
        </div>
      )}
      {statsOpen && <StatsPanel />}
    </div>
  );
}
