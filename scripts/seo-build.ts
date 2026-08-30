// Runs after `vite build` (see package.json's "postbuild" script). Generates:
//   1. dist/sitemap.xml            — every route, read from src/docs/nav.ts so
//                                    it can't drift out of sync with the docs.
//   2. dist/docs/<slug>/index.html — a fully static, pre-rendered copy of each
//                                    docs page (correct <title>/description/
//                                    canonical/OG/JSON-LD baked in server-side),
//                                    so crawlers that don't execute JS still see
//                                    complete content. The same built JS/CSS
//                                    bundle is included, so the SPA still boots
//                                    and takes over normal client-side routing
//                                    for real visitors — this file only changes
//                                    what the *first* response looks like.
//
// The interactive whiteboard itself ("/") is intentionally NOT prerendered:
// its content is inherently canvas/IndexedDB/pointer-driven and cannot be
// meaningfully rendered without a browser. Instead, App.tsx renders a real
// (visually-hidden but DOM-present) description alongside the canvas — see
// the .sr-only header in src/App.tsx — plus index.html ships static meta
// tags and JSON-LD for that route directly.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { DOCS_NAV, DEFAULT_DOC_SLUG } from "../src/docs/nav";
import { getPageMeta, SITE_URL, SITE_NAME, OG_IMAGE } from "../src/seo/pages";
import { breadcrumbLd, faqPageLd } from "../src/seo/structuredData";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");
const DOCS_CONTENT_DIR = join(ROOT, "src", "docs", "content");

function readDocMarkdown(slug: string): string {
  return readFileSync(join(DOCS_CONTENT_DIR, `${slug}.md`), "utf8");
}

function extractBuiltAssetTags(indexHtml: string): { script: string; css: string } {
  const scriptMatch = indexHtml.match(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/);
  const cssMatch = indexHtml.match(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
  if (!scriptMatch || !cssMatch) {
    throw new Error("seo-build: could not find built script/css tags in dist/index.html — did the Vite build output change shape?");
  }
  return {
    script: `<script type="module" crossorigin src="${scriptMatch[1]}"></script>`,
    css: `<link rel="stylesheet" crossorigin href="${cssMatch[1]}">`,
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function jsonLdScript(id: string, data: unknown): string {
  return `<script type="application/ld+json" data-jsonld="${id}">${JSON.stringify(data)}</script>`;
}

function renderDocsPage(slug: string, assets: { script: string; css: string }): string {
  const markdown = readDocMarkdown(slug);
  const html = marked.parse(markdown, { async: false }) as string;
  const meta = getPageMeta(`/docs/${slug}`);
  const url = `${SITE_URL}${meta.path}`;

  const navLinks = DOCS_NAV.map(
    (p) => `<a href="/docs/${p.slug}" class="docs-nav-link${p.slug === slug ? " active" : ""}">${escapeHtml(p.title)}</a>`
  ).join("\n            ");

  const structuredData = [
    jsonLdScript("breadcrumb", breadcrumbLd(slug)),
    slug === "faq" ? jsonLdScript("faq-page", faqPageLd(markdown)) : "",
  ]
    .filter(Boolean)
    .join("\n    ");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#121212" />
    <title>${escapeHtml(meta.title)}</title>
    <meta name="description" content="${escapeHtml(meta.description)}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:title" content="${escapeHtml(meta.title)}" />
    <meta property="og:description" content="${escapeHtml(meta.description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:image" content="${OG_IMAGE}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(meta.title)}" />
    <meta name="twitter:description" content="${escapeHtml(meta.description)}" />
    <meta name="twitter:image" content="${OG_IMAGE}" />
    ${structuredData}
    ${assets.css}
  </head>
  <body>
    <div id="app"><div class="docs-root">
      <header class="docs-header">
        <a href="/" class="docs-brand">DrawBoard <span>docs</span></a>
        <a href="/" class="docs-back-link">← Back to the app</a>
      </header>
      <div class="docs-body">
        <nav class="docs-sidebar">
            ${navLinks}
            <a class="docs-nav-link" href="https://github.com/krishundre/draw" target="_blank" rel="noreferrer">GitHub repo ↗</a>
        </nav>
        <main class="docs-content">${html}</main>
      </div>
    </div></div>
    ${assets.script}
  </body>
</html>
`;
}

function generateSitemap(): string {
  const now = new Date().toISOString().split("T")[0];
  const paths = ["/", "/docs", ...DOCS_NAV.map((p) => `/docs/${p.slug}`)];
  const urls = paths
    .map(
      (p) => `  <url>
    <loc>${SITE_URL}${p}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p === "/" ? "weekly" : "monthly"}</changefreq>
    <priority>${p === "/" ? "1.0" : "0.7"}</priority>
  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function main() {
  if (!readdirSync(DIST).includes("index.html")) {
    throw new Error("seo-build: dist/index.html not found — run `vite build` first.");
  }
  const indexHtml = readFileSync(join(DIST, "index.html"), "utf8");
  const assets = extractBuiltAssetTags(indexHtml);

  writeFileSync(join(DIST, "sitemap.xml"), generateSitemap());
  console.log("seo-build: wrote dist/sitemap.xml");

  const allSlugs = [DEFAULT_DOC_SLUG, ...DOCS_NAV.map((p) => p.slug)];
  const uniqueSlugs = Array.from(new Set(allSlugs));
  for (const slug of uniqueSlugs) {
    const page = renderDocsPage(slug, assets);
    const outDir = join(DIST, "docs", slug);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "index.html"), page);
  }
  // /docs itself mirrors the default doc page, matching the client router's redirect.
  mkdirSync(join(DIST, "docs"), { recursive: true });
  writeFileSync(join(DIST, "docs", "index.html"), renderDocsPage(DEFAULT_DOC_SLUG, assets));
  console.log(`seo-build: wrote ${uniqueSlugs.length} static docs pages + /docs`);
}

main();
