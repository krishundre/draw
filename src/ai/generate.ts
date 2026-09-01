import { newId, randomSeed } from "../utils/id";
import type { AppState, ArrowElement, TextElement, WhiteboardElement } from "../types";
import type { AIConfig } from "./config";

const MAX_ELEMENTS = 40;

// Deliberately not the real WhiteboardElement shape — a minimal schema is
// far more reliable to get a language model to produce correctly than the
// full element model (bindings, style objects, seeds, z-index, …). Arrows
// reference other elements by their position in this same array (`from`/
// `to`), which materializeGeneratedDiagram resolves to real element IDs
// after creating the shapes, reusing the existing arrow-binding system.
interface GeneratedNode {
  type: "rectangle" | "diamond" | "ellipse" | "text";
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
}
interface GeneratedArrow {
  type: "arrow";
  from: number;
  to: number;
  label?: string;
}
type GeneratedItem = GeneratedNode | GeneratedArrow;

const SYSTEM_PROMPT = `You generate simple flowchart/diagram layouts as JSON for a whiteboard app. Respond with ONLY a JSON object, no markdown fences, no commentary, matching exactly this shape:

{"elements": [
  {"type": "rectangle" | "diamond" | "ellipse", "x": number, "y": number, "width": number, "height": number, "text": string (optional, a short label centered in the shape)},
  {"type": "arrow", "from": number, "to": number}
]}

Rules:
- "x"/"y"/"width"/"height" are in pixels on a canvas roughly 1200x800; lay elements out left-to-right or top-to-bottom with sensible spacing (at least 40px gaps), don't overlap boxes.
- "from" and "to" on an arrow are 0-based indices into this same "elements" array, referring to the shape elements (not other arrows) it connects.
- Use "diamond" for yes/no decision points, "rectangle" for process/steps, "ellipse" for start/end terminals.
- Keep it to at most 15 shapes unless the request clearly needs more.
- Output nothing but the JSON object.`;

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}

async function callAnthropic(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      // Required for Anthropic to accept a request made directly from a
      // browser origin rather than a server — this is what BYOK client-side
      // tools are expected to send; without it the call is rejected.
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (typeof text !== "string") throw new Error("Unexpected Anthropic response shape");
  return text;
}

async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("Unexpected OpenAI response shape");
  return text;
}

// Calls the configured provider and returns ready-to-insert elements,
// positioned around (originX, originY). Throws with a message safe to show
// the user directly on any failure (network, auth, malformed JSON, etc).
export async function generateDiagram(prompt: string, config: AIConfig, appState: AppState, originX: number, originY: number, zIndexStart: number): Promise<WhiteboardElement[]> {
  const raw = config.provider === "anthropic" ? await callAnthropic(prompt, config.apiKey) : await callOpenAI(prompt, config.apiKey);

  let parsed: { elements?: unknown };
  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    throw new Error("The AI didn't return valid JSON. Try rephrasing the prompt, or try again.");
  }
  if (!Array.isArray(parsed.elements)) {
    throw new Error("The AI's response was missing an \"elements\" array.");
  }

  const items = (parsed.elements as GeneratedItem[]).slice(0, MAX_ELEMENTS);
  return materializeGeneratedDiagram(items, appState, originX, originY, zIndexStart);
}

function materializeGeneratedDiagram(items: GeneratedItem[], appState: AppState, originX: number, originY: number, zIndexStart: number): WhiteboardElement[] {
  const style = appState.currentStyle;
  const nodes = items.filter((i): i is GeneratedNode => i.type !== "arrow");
  const arrows = items.filter((i): i is GeneratedArrow => i.type === "arrow");

  // Layout bounds of the raw AI coordinates, so the whole diagram can be
  // recentered around the requested drop point regardless of what origin
  // the model happened to use.
  const xs = nodes.flatMap((n) => [n.x, n.x + n.width]);
  const ys = nodes.flatMap((n) => [n.y, n.y + n.height]);
  const minX = xs.length ? Math.min(...xs) : 0;
  const minY = ys.length ? Math.min(...ys) : 0;
  const maxX = xs.length ? Math.max(...xs) : 0;
  const maxY = ys.length ? Math.max(...ys) : 0;
  const offsetX = originX - (minX + maxX) / 2;
  const offsetY = originY - (minY + maxY) / 2;

  const shapeIds: (string | null)[] = [];
  const elements: WhiteboardElement[] = [];

  items.forEach((item, i) => {
    if (item.type === "arrow") {
      shapeIds.push(null);
      return;
    }
    const type = ["rectangle", "diamond", "ellipse"].includes(item.type) ? item.type : "rectangle";
    const width = Math.max(20, Math.min(2000, item.width || 120));
    const height = Math.max(20, Math.min(2000, item.height || 60));
    const id = newId();
    shapeIds[i] = id;
    elements.push({
      id,
      type: type as "rectangle" | "diamond" | "ellipse",
      x: (item.x || 0) + offsetX,
      y: (item.y || 0) + offsetY,
      width,
      height,
      angle: 0,
      seed: randomSeed(),
      version: 1,
      isDeleted: false,
      groupIds: [],
      frameId: null,
      locked: false,
      zIndex: zIndexStart + elements.length,
      link: null,
      ...style,
    } as WhiteboardElement);
    if (item.text && item.text.trim()) {
      const fontSize = appState.currentFontSize;
      const lastShape = elements[elements.length - 1];
      elements.push({
        id: newId(),
        type: "text",
        x: lastShape.x,
        y: lastShape.y + lastShape.height / 2 - fontSize * 0.625,
        width: lastShape.width,
        height: fontSize * 1.25,
        angle: 0,
        seed: randomSeed(),
        version: 1,
        isDeleted: false,
        groupIds: [],
        frameId: null,
        locked: false,
        zIndex: zIndexStart + elements.length,
        link: null,
        ...style,
        text: item.text.trim(),
        fontFamily: appState.currentFontFamily,
        fontSize,
        textAlign: "center",
        containerId: lastShape.id,
      } as TextElement);
    }
  });

  arrows.forEach((a) => {
    const fromId = shapeIds[a.from];
    const toId = shapeIds[a.to];
    if (!fromId || !toId) return;
    const from = elements.find((e) => e.id === fromId)!;
    const to = elements.find((e) => e.id === toId)!;
    const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
    const end = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
    elements.push({
      id: newId(),
      type: "arrow",
      x: start.x,
      y: start.y,
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
      angle: 0,
      seed: randomSeed(),
      version: 1,
      isDeleted: false,
      groupIds: [],
      frameId: null,
      locked: false,
      zIndex: zIndexStart + elements.length,
      link: null,
      ...style,
      points: [
        { x: 0, y: 0 },
        { x: end.x - start.x, y: end.y - start.y },
      ],
      startArrowhead: "none",
      endArrowhead: "arrow",
      startBinding: { elementId: fromId, focus: 0, gap: 4 },
      endBinding: { elementId: toId, focus: 0, gap: 4 },
      elbowed: true,
    } as ArrowElement);
  });

  return elements;
}
