import { DOCS_NAV } from "../docs/nav";

export const SITE_URL = "https://draw.designpav.in";
export const SITE_NAME = "DrawBoard";
export const OG_IMAGE = `${SITE_URL}/og-image.png`;

export interface PageMeta {
  path: string; // canonical path, e.g. "/docs/getting-started"
  title: string; // full <title>, keep under ~60 chars
  description: string; // meta description, keep under ~155 chars
}

const APP_PAGE: PageMeta = {
  path: "/",
  title: "DrawBoard — Free Open-Source Whiteboard",
  description: "A free, open-source, browser-based whiteboard for sketching diagrams and wireframes in a hand-drawn style. No login, no install — just open and draw.",
};

const DOCS_INDEX_PAGE: PageMeta = {
  path: "/docs",
  title: "DrawBoard Docs — User Manual",
  description: "The full user manual for DrawBoard: every tool, shortcut, and feature explained, from getting started to self-hosting your own copy.",
};

const DOCS_PAGE_META: Record<string, string> = {
  "getting-started": "How to open DrawBoard and draw your first shape — no account or install required.",
  toolbar: "Every DrawBoard tool explained — selection, shapes, arrows, freehand draw, text, frames — with keyboard shortcuts.",
  styling: "How to style elements in DrawBoard: stroke and fill colors, fill styles, stroke width, sloppiness, edges, opacity, and fonts.",
  "canvas-basics": "Panning, zooming, selecting, grouping, layering, locking, and undo/redo on the DrawBoard canvas.",
  libraries: "How to save and reuse custom shapes in DrawBoard, and import/export .excalidrawlib files.",
  "import-export": "How to export DrawBoard drawings as PNG, SVG, or native JSON, and import existing files.",
  saving: "How DrawBoard autosaves your work locally in the browser, and how to back up or move a drawing.",
  shortcuts: "The full DrawBoard keyboard shortcut reference — tools, editing, view, and navigation.",
  feedback: "How to send feedback or report a bug from inside DrawBoard.",
  faq: "Frequently asked questions about DrawBoard: pricing, accounts, privacy, self-hosting, and licensing.",
  contributing: "DrawBoard is open source under the MIT License. How to self-host, contribute, or find the GitHub repo.",
};

export function getPageMeta(path: string): PageMeta {
  if (path === "/" ) return APP_PAGE;
  if (path === "/docs") return DOCS_INDEX_PAGE;
  const slug = path.replace(/^\/docs\//, "");
  const navEntry = DOCS_NAV.find((p) => p.slug === slug);
  if (navEntry) {
    return {
      path: `/docs/${slug}`,
      title: `${navEntry.title} — DrawBoard Docs`,
      description: DOCS_PAGE_META[slug] ?? DOCS_INDEX_PAGE.description,
    };
  }
  return APP_PAGE;
}

export function allPageMetas(): PageMeta[] {
  return [APP_PAGE, DOCS_INDEX_PAGE, ...DOCS_NAV.map((p) => getPageMeta(`/docs/${p.slug}`))];
}
