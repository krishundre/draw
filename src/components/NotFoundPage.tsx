import { useEffect } from "react";
import { Link } from "react-router-dom";

// A real page for unmatched routes — without this, React Router silently
// renders nothing for any URL outside "/", "/docs", "/docs/:slug", producing
// a blank white page (the server still returns 200 for it via the SPA
// rewrite, so this is also the only way to tell the visitor anything's wrong).
export function NotFoundPage() {
  useEffect(() => {
    document.title = "Page not found — DrawBoard";
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "noindex");
    return () => {
      meta?.setAttribute("content", "index, follow");
    };
  }, []);

  return (
    <div className="not-found-page">
      <div className="not-found-card">
        <h1>Page not found</h1>
        <p>There's nothing at this address.</p>
        <div className="not-found-links">
          <Link to="/">Open the whiteboard</Link>
          <Link to="/docs">Read the docs</Link>
        </div>
      </div>
    </div>
  );
}
