import { useEffect, useMemo, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { marked } from "marked";
import { DOCS_NAV, DEFAULT_DOC_SLUG } from "./nav";
import { getDocMarkdown } from "./content";
import { useHead } from "../seo/useHead";
import { getPageMeta } from "../seo/pages";
import { JsonLd } from "../seo/JsonLd";
import { faqPageLd, breadcrumbLd } from "../seo/structuredData";

export function DocsLayout() {
  const { slug = DEFAULT_DOC_SLUG } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const markdown = getDocMarkdown(slug);

  useEffect(() => {
    setSidebarOpen(false);
    window.scrollTo({ top: 0 });
  }, [slug]);

  useHead(getPageMeta(`/docs/${slug}`));

  const html = useMemo(() => (markdown ? marked.parse(markdown, { async: false }) : ""), [markdown]);

  if (!markdown) {
    return <Navigate to={`/docs/${DEFAULT_DOC_SLUG}`} replace />;
  }

  return (
    <div className="docs-root">
      <JsonLd id="breadcrumb" data={breadcrumbLd(slug)} />
      {slug === "faq" && <JsonLd id="faq-page" data={faqPageLd(markdown)} />}
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
          <a className="docs-nav-link" href="https://github.com/krishundre/draw" target="_blank" rel="noreferrer">
            GitHub repo ↗
          </a>
        </nav>
        <main className="docs-content" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
