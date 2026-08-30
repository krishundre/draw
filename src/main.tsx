import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import { DocsLayout } from "./docs/DocsLayout";
import "./style.css";
import "./docs/docs.css";
import { useStore } from "./state/store";

if (import.meta.env.DEV) {
  (window as unknown as { __store: typeof useStore }).__store = useStore;
}

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/docs" element={<DocsLayout />} />
        <Route path="/docs/:slug" element={<DocsLayout />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);

// Only register the service worker in production builds — in dev it just
// causes confusing stale-content bugs (the SW's cache-first fetch handler
// intercepts requests independently of the dev server, so restarting `vite`
// doesn't clear it).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
