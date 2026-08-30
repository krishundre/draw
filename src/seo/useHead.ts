import { useEffect } from "react";
import { SITE_URL, SITE_NAME, OG_IMAGE, type PageMeta } from "./pages";

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

// Keeps <title>, meta description, canonical, and Open Graph/Twitter tags in
// sync with the current route on the client. The static/prerendered HTML for
// docs pages already ships correct tags server-side (see scripts/seo-build.ts)
// — this hook keeps them correct as the SPA router navigates without a full
// page reload, and covers the app route which isn't prerendered.
export function useHead(meta: PageMeta) {
  useEffect(() => {
    const url = `${SITE_URL}${meta.path}`;
    document.title = meta.title;
    setMeta("name", "description", meta.description);
    setCanonical(url);

    setMeta("property", "og:title", meta.title);
    setMeta("property", "og:description", meta.description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:image", OG_IMAGE);

    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", meta.title);
    setMeta("name", "twitter:description", meta.description);
    setMeta("name", "twitter:image", OG_IMAGE);
  }, [meta.path, meta.title, meta.description]);
}
