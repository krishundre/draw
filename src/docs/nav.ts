export interface DocPage {
  slug: string;
  title: string;
}

export const DOCS_NAV: DocPage[] = [
  { slug: "getting-started", title: "Getting Started" },
  { slug: "toolbar", title: "Toolbar Guide" },
  { slug: "styling", title: "Styling Elements" },
  { slug: "canvas-basics", title: "Canvas Basics" },
  { slug: "libraries", title: "Libraries" },
  { slug: "ai-generation", title: "AI Diagram Generation" },
  { slug: "import-export", title: "Import / Export" },
  { slug: "saving", title: "Saving Your Work" },
  { slug: "shortcuts", title: "Keyboard Shortcuts" },
  { slug: "feedback", title: "Sending Feedback" },
  { slug: "faq", title: "FAQ" },
  { slug: "contributing", title: "Contributing / Open Source" },
];

export const DEFAULT_DOC_SLUG = DOCS_NAV[0].slug;
