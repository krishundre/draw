import { SITE_URL, SITE_NAME, OG_IMAGE } from "./pages";
import { DOCS_NAV } from "../docs/nav";

export const softwareApplicationLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  description:
    "A free, open-source, browser-based whiteboard for sketching diagrams and wireframes in a hand-drawn style. No login, no install required.",
  applicationCategory: "DesignApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  screenshot: OG_IMAGE,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  license: "https://github.com/krishundre/draw/blob/main/LICENSE",
  isAccessibleForFree: true,
};

export const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "DesignPav",
  url: "https://designpav.in",
  logo: "https://designpav.in/logo.png",
  email: "chef@designpav.in",
  contactPoint: {
    "@type": "ContactPoint",
    email: "chef@designpav.in",
    contactType: "customer support",
  },
};

// FAQPage schema, generated from the FAQ doc's own Q/A markdown structure
// (**bold question** followed by an answer paragraph) so it can't drift out
// of sync with the actual visible content on /docs/faq.
export function faqPageLd(faqMarkdown: string) {
  const qaPairs: { question: string; answer: string }[] = [];
  const lines = faqMarkdown.split("\n");
  let current: { question: string; answer: string[] } | null = null;
  for (const line of lines) {
    const qMatch = line.match(/^\*\*(.+?)\*\*$/);
    if (qMatch) {
      if (current) qaPairs.push({ question: current.question, answer: current.answer.join(" ").trim() });
      current = { question: qMatch[1], answer: [] };
    } else if (current && line.trim()) {
      current.answer.push(line.trim());
    }
  }
  if (current) qaPairs.push({ question: current.question, answer: current.answer.join(" ").trim() });

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qaPairs.map((qa) => ({
      "@type": "Question",
      name: qa.question,
      acceptedAnswer: { "@type": "Answer", text: stripMarkdownLinks(qa.answer) },
    })),
  };
}

export function breadcrumbLd(slug: string) {
  const page = DOCS_NAV.find((p) => p.slug === slug);
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "DrawBoard", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Docs", item: `${SITE_URL}/docs` },
      { "@type": "ListItem", position: 3, name: page?.title ?? slug, item: `${SITE_URL}/docs/${slug}` },
    ],
  };
}

function stripMarkdownLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/`/g, "");
}
