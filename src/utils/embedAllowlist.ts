// Web-embed elements host a real cross-origin <iframe>, so the URL a user
// can embed is restricted to a curated allowlist of known embeddable
// services — the same defensive posture Excalidraw's own embed feature
// uses — rather than accepting arbitrary URLs. This keeps DrawBoard from
// becoming a general-purpose "iframe any site" tool (a real abuse/clickjacking
// surface) while still covering the common cases people actually want to
// drop onto a board.
const ALLOWED_HOST_PATTERNS: RegExp[] = [
  /^(www\.)?youtube\.com$/,
  /^youtu\.be$/,
  /^(player\.)?vimeo\.com$/,
  /^(www\.)?figma\.com$/,
  /^(www\.)?codesandbox\.io$/,
  /^(www\.)?codepen\.io$/,
  /^docs\.google\.com$/,
  /^(www\.)?google\.com$/, // maps embeds
  /^(www\.)?loom\.com$/,
  /^open\.spotify\.com$/,
  /^gist\.github\.com$/,
  /^(www\.)?notion\.so$/,
  /^([a-z0-9-]+\.)?observablehq\.com$/,
];

// YouTube and Vimeo both refuse to render their normal watch/share pages
// inside an iframe at all (X-Frame-Options/CSP blocks it outright — the
// iframe loads but shows nothing usable) — only their dedicated embed-player
// URL is actually embeddable. Most people paste the link from their address
// bar or a share button, not the special embed format, so convert the
// common shapes automatically rather than silently failing on them.
export function normalizeEmbedUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }
  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    if (id) return `https://www.youtube.com/embed/${id}`;
  }
  if (host === "youtube.com") {
    const watchId = url.searchParams.get("v");
    if (watchId) return `https://www.youtube.com/embed/${watchId}`;
    const shortsMatch = url.pathname.match(/^\/shorts\/([^/]+)/);
    if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;
    // already /embed/... (or something else under youtube.com) — leave as-is
  }
  if (host === "vimeo.com") {
    const idMatch = url.pathname.match(/^\/(\d+)/);
    if (idMatch) return `https://player.vimeo.com/video/${idMatch[1]}`;
  }
  return raw;
}

export function isEmbeddableUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return ALLOWED_HOST_PATTERNS.some((p) => p.test(url.hostname));
}

export function embedHostLabel(raw: string): string {
  try {
    return new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    return raw;
  }
}
