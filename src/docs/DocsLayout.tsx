import { useEffect, useMemo, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { marked } from "marked";
import { DOCS_NAV, DEFAULT_DOC_SLUG } from "./nav";
import { getDocMarkdown } from "./content";

export function DocsLayout() {
  const { slug = DEFAULT_DOC_SLUG } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const markdown = getDocMarkdown(slug);

  useEffect(() => {
    setSidebarOpen(false);
    window.scrollTo({ top: 0 });
  }, [slug]);

  useEffect(() => {
    document.title = markdown ? `${DOCS_NAV.find((p) => p.slug === slug)?.title ?? "Docs"} — DrawBoard Docs` : "DrawBoard Docs";
  }, [slug, markdown]);

  const html = useMemo(() => (markdown ? marked.parse(markdown, { async: false }) : ""), [markdown]);

  if (!markdown) {
    return <Navigate to={`/docs/${DEFAULT_DOC_SLUG}`} replace />;
  }

  return (
    <div className="docs-root">
      <header className="docs-header">
        <button className="docs-menu-toggle" onClick={() => setSidebarOpen((v) => !v)} aria-label="Toggle navigation">
          ☰
        </button>
        <Link to="/" className="docs-brand">
          DrawBoard <span>docs</span>
        </Link>
        <Link to="/" className="docs-back-link">
          ← Back to the app
        </Link>
      </header>
      <div className="docs-body">
        <nav className={"docs-sidebar" + (sidebarOpen ? " open" : "")}>
          {DOCS_NAV.map((page) => (
            <Link key={page.slug} to={`/docs/${page.slug}`} className={"docs-nav-link" + (page.slug === slug ? " active" : "")}>
              {page.title}
            </Link>
          ))}
        </nav>
        <main className="docs-content" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
