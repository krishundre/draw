# Toolbar Guide

All drawing tools live in the bar at the top of the screen. Click a tool, or use its keyboard shortcut, then click (or click-and-drag) on the canvas.

| Tool | Shortcut | What it does |
|---|---|---|
| **Selection** | `V` or `1` | Select, move, resize, and rotate elements. This is the default tool. |
| **Lasso** | `Q` | Freeform selection — drag a loop around anything you want to select, instead of a rectangle. |
| **Hand (pan)** | `H` (or hold `Space` while dragging) | Pan around the canvas without moving anything on it. |
| **Rectangle** | `R` or `2` | Draw a rectangle. Drag to size it. |
| **Diamond** | `D` or `3` | Draw a diamond/rhombus shape. |
| **Ellipse** | `O` or `4` | Draw an ellipse or circle (drag with equal width/height for a perfect circle). |
| **Arrow** | `A` or `5` | Draw an arrow. Drag for a straight 2-point arrow, or click once to start a multi-point chain (see below). Starting or ending on a rectangle/diamond/ellipse binds it to that shape — see [Canvas Basics](/docs/canvas-basics). Style its arrowheads, and optionally turn it into a right-angle flowchart connector, in the left panel — see [Styling Elements](/docs/styling). |
| **Line** | `L` or `6` | Draw a straight line with no arrowhead. Same multi-point click-chain as Arrow. |
| **Draw (freehand)** | `P` or `7` | Freehand pencil/sketch tool — draws a smooth hand-drawn stroke that follows your cursor or finger. |
| **Text** | `T` or `8` | Click anywhere to start typing. Double-clicking an existing rectangle, diamond, or ellipse also adds a text label bound to it — see [Canvas Basics](/docs/canvas-basics). |
| **Image** | `9` | Insert an image from your device. Click the tool, then choose a file — it's placed on the canvas at a reasonable default size. Right-click a placed image for a **Crop image** option. |
| **Embed** | `W` | Embed a web page — YouTube, Vimeo, Figma, CodeSandbox, CodePen, Google Docs/Maps, Loom, Spotify, a GitHub Gist, Notion, or Observable. Paste a URL from one of those; other sites aren't accepted (see below). |
| **Eraser** | `E` or `0` | Click or drag across elements to delete them. |
| **Frame** | `F` | Draw a labeled frame to visually group and organize a section of the canvas. |

## Multi-point lines and arrows

A drag still draws the classic straight 2-point line/arrow. But if you just **click** once with the Line or Arrow tool instead of dragging, you start a click-chain: click again to add each new point, click near the last point (or press `Enter`) to finish, `Escape` to cancel. To reshape an existing line or arrow afterward, double-click it to enter point-edit mode — drag a point to move it, click along a segment to add a new point there, or `Alt`-click a point to remove it.

## Arrow-to-shape binding & elbow connectors

Start or end an arrow on top of a rectangle, diamond, or ellipse and it snaps to that shape's edge and stays attached — move, resize, align, or distribute the shape and the arrow follows automatically. Turn on **Elbow (flowchart connector)** in the style panel for that arrow to route it as clean horizontal/vertical bends instead of a straight diagonal line — the look of a classic flowchart connector. The **Library** panel has a ready-made "Flowchart: decision" preset that combines both.

## Embedding web content

The Embed tool only accepts URLs from a curated allowlist of known services (see the list above) — not arbitrary websites. That's a deliberate security choice, the same one Excalidraw makes: embedding an arbitrary third-party page as a live iframe is a real risk, so DrawBoard only allows sites it specifically recognizes. If you paste something else, you'll get a message explaining why it was rejected.

A regular YouTube or Vimeo link — whatever you'd copy from the address bar or a "Share" button — is converted automatically to that service's actual embeddable player URL, since their normal watch pages refuse to load inside any iframe at all. You don't need to hunt down a special "embed" link yourself.

An embed sits inert on the canvas by default — a single click selects and moves it like any other element. **Double-click it to "interact"** (scroll a map, play a video, use an editor) — a blue outline shows it's live; press `Escape` or click elsewhere to go back to normal canvas editing. Right-click an embed for **Edit embed URL**.

## After drawing a shape

Once you finish drawing (mouse/finger up), DrawBoard automatically switches back to the **Selection** tool (except the freehand Draw tool, which stays active so you can keep sketching). This matches the behavior most whiteboard tools use: draw one shape, then immediately be ready to select/adjust it.

## Tips

- Holding `Shift` while resizing keeps proportions locked in most whiteboard tools — try it while dragging a resize handle.
- You can nudge a selected element with the arrow keys (hold `Shift` for a bigger 10px jump) — see [Canvas Basics](/docs/canvas-basics).
- Right-click anywhere for a context menu with duplicate, copy/paste, align/distribute, links, layering, and delete — see [Canvas Basics](/docs/canvas-basics).
- Don't want to draw it by hand? See [AI Diagram Generation](/docs/ai-generation) for a text-to-diagram shortcut.

*(Screenshot suggestion: the toolbar with each icon numbered/labeled.)*
