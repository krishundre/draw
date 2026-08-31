import type { WhiteboardElement } from "../types";

const MARKER = "drawboard-clipboard";

interface ClipboardPayload {
  type: typeof MARKER;
  elements: WhiteboardElement[];
}

// Round-trips selected elements through the real OS clipboard as JSON text
// (there's no custom MIME type available via the Clipboard API without extra
// permissions, so plain text carrying a recognizable marker is the simplest
// thing that also survives copy/paste between two DrawBoard tabs).
export async function copyElementsToClipboard(elements: WhiteboardElement[]): Promise<boolean> {
  if (!elements.length) return false;
  const payload: ClipboardPayload = { type: MARKER, elements };
  try {
    await navigator.clipboard.writeText(JSON.stringify(payload));
    return true;
  } catch {
    return false; // clipboard permission denied or unavailable — fail silently, caller keeps prior behavior
  }
}

export async function readElementsFromClipboard(): Promise<WhiteboardElement[] | null> {
  try {
    const text = await navigator.clipboard.readText();
    const data = JSON.parse(text);
    if (data && data.type === MARKER && Array.isArray(data.elements)) {
      return data.elements as WhiteboardElement[];
    }
    return null;
  } catch {
    return null; // not JSON, not ours, or clipboard permission denied
  }
}
