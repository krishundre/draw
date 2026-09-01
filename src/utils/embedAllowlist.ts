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
