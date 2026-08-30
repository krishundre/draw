// Vite loads every docs markdown file as raw text at build time — no
// server-side rendering needed, and new pages just need a file + a nav.ts entry.
const modules = import.meta.glob("./content/*.md", { eager: true, query: "?raw", import: "default" }) as Record<string, string>;

export function getDocMarkdown(slug: string): string | null {
  const path = `./content/${slug}.md`;
  return modules[path] ?? null;
}
