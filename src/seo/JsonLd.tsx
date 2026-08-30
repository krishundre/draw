import { useEffect } from "react";

// Injects/updates a <script type="application/ld+json"> tag identified by `id`.
// Multiple independent schema blocks (SoftwareApplication, Organization, FAQPage,
// BreadcrumbList) can coexist this way, matching Google's recommendation of one
// script tag per schema type rather than a single combined @graph.
export function JsonLd({ id, data }: { id: string; data: unknown }) {
  useEffect(() => {
    let el = document.head.querySelector<HTMLScriptElement>(`script[data-jsonld="${id}"]`);
    if (!el) {
      el = document.createElement("script");
      el.type = "application/ld+json";
      el.dataset.jsonld = id;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
    return () => {
      // Leave static/prerendered schema in place; only remove ones this
      // component itself added on a route that no longer renders it.
    };
  }, [id, data]);

  return null;
}
