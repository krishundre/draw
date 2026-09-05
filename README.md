# DrawBoard

An open-source, self-hostable whiteboard inspired by [Excalidraw](https://excalidraw.com) — sketch diagrams, wireframes, and notes with a hand-drawn aesthetic. Built with React, TypeScript, HTML Canvas, and [Rough.js](https://roughjs.com/). No account, no login — everything lives in your browser (with an optional real-time collaboration mode).

**Live demo:** [draw.designpav.in](https://draw.designpav.in)
**Docs / user manual:** [draw.designpav.in/docs](https://draw.designpav.in/docs)

![DrawBoard screenshot](docs/screenshots/hero.png)

*More screenshots (dark mode, style panel, mobile) welcome via PR — see [Contributing](#contributing).*

## Features

- **14 tools**: selection, lasso (freeform selection), rectangle, diamond, ellipse, arrow (5 arrowhead styles per end, with arrow-to-shape binding and an optional elbow/orthogonal flowchart-connector mode), line, freehand draw, text, image insert (with in-editor cropping), web-embed (YouTube/Figma/CodeSandbox/etc., from a curated allowlist), eraser, frame, hand/pan — with the same keyboard shortcuts as Excalidraw.
- **AI-generated diagrams** (bring your own OpenAI or Anthropic API key): describe a flowchart in plain text and get real, bound, elbow-connected shapes dropped onto the canvas. Your key is stored only in your browser and sent straight to the provider — DrawBoard has no backend involved.
- **Full styling**: stroke & background color (presets + custom picker), fill style (hachure / cross-hatch / solid), stroke width & style, sloppiness (architect / artist / cartoonist), sharp or round edges, opacity, font family/size/alignment.
- **Selection & transform**: multi-select, 8-handle resize, rotate, group/ungroup, lock, layering (front/back/forward/backward), duplicate, arrow-key nudging, align (left/right/center/top/bottom/middle) and distribute (horizontal/vertical).
- **Arrow-to-shape binding**: arrows started or ended on a rectangle/diamond/ellipse snap to its edge and stay attached as the shape moves, resizes, gets nudged, aligned, or distributed.
- **Multi-point lines & arrows**: click a line/arrow tool once to start a click-chain (click to place each point, click near the last point or press Enter to finish, Escape to cancel); double-click an existing line/arrow to edit its points — drag a point, click a segment to insert one, Alt+click a point to remove it.
- **Bound text**: double-click a shape to add a text label that wraps to the shape's width and keeps the shape centered as it grows or the shape is resized.
- **Editable stats panel**: X/Y/W/H are live-editable number inputs, not just a read-out.
- **Element hyperlinks**: attach a URL to any element from the right-click menu; Ctrl/Cmd-click to open it.
- **Copy/paste** to the real OS clipboard (`Ctrl/Cmd+C`/`V`), independent of Duplicate.
- **Undo/redo** with a full history stack.
- **Shape library**: a docked sidebar with tabs for built-in shapes, your own saved shapes, and imported `.excalidrawlib` files.
- **Scene search** (`Ctrl/Cmd+Shift+F`): find elements by text content or type, jump straight to one.
- **Import/export**: native JSON, PNG (1x/2x, transparent background), true vector SVG, copy-to-clipboard as PNG — PNG/SVG/clipboard exports can be scoped to just the current selection.
- **Infinite canvas**: pan, zoom, grid toggle, dark/light theme, custom canvas background.
- **Autosave**: everything persists to your browser's IndexedDB automatically — close the tab and come back later.
- **Command palette** (`Ctrl/Cmd+K`), right-click context menu, stats panel, in-app help dialog (`Shift+/`).
- **Installable PWA** with offline app-shell caching.
- **Optional real-time collaboration**: shared cursors, presence, and live multi-user editing via [Yjs](https://yjs.dev/) — see [Collaboration](#real-time-collaboration-optional) below. (Not enabled on the public demo — see [Known limitations](#known-limitations).)
- **In-app feedback form** that emails the maintainer directly.
- **Apple-style "Liquid Glass" chrome**: the toolbar, panels, menus, and dialogs are real frosted glass (`backdrop-filter: blur()`, not a flat tint), and icon/text color adapts live to whatever's on the canvas directly behind each panel — independent of the light/dark theme, like iOS Control Center or the macOS menu bar over wallpaper.
- **First-time tutorial**: a short, skippable 6-step spotlight tour on first visit (persisted in the same IndexedDB store as your drawings, not localStorage). Replay it anytime from the command palette (`Ctrl/Cmd+K`) or the help dialog (`Shift+/`).

## Quick start

```bash
git clone https://github.com/krishundre/draw.git   # or wherever you forked it
cd draw
npm install
npm run dev
```

Open the printed `http://localhost:5173` URL. That's it.

## Building for production

```bash
npm run build      # outputs static files to dist/
npm run preview    # serve the production build locally to sanity-check it
```

`dist/` is fully static and installable as a PWA.

## Deploying

The app deploys as-is to any static host. It's built and tested against **[Vercel](https://vercel.com)**:

1. Import the GitHub repo in the Vercel dashboard (or `vercel` via the CLI).
2. Vercel auto-detects the Vite build (`npm run build`, output `dist/`) — no extra config needed.
3. If you want the in-app feedback form to send email, set the environment variables described in [`.env.example`](.env.example) (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `FEEDBACK_TO_EMAIL`) in the Vercel project settings — the form is backed by a serverless function at `api/feedback.ts`.
4. Point a custom domain/subdomain at the Vercel project (Vercel's dashboard gives you the exact DNS record to add, typically a `CNAME`).

### Real-time collaboration (optional)

Collaboration uses Yjs over a small WebSocket relay server in `server/`. It's a **long-running Node process**, so it can't be deployed as a Vercel serverless function — run it on any always-on host (Fly.io, Railway, a VPS, etc.) and point the client at it:

```bash
npm run server                 # runs the relay on ws://localhost:1234 by default
VITE_COLLAB_WS_URL=wss://your-collab-host npm run build
```

The server doesn't persist anything itself — each browser keeps its own full copy locally (IndexedDB), so it's safe to restart at any time. Click **Share** in the app to connect and get a link containing `?room=<id>`.

## Known limitations

- No Mermaid-to-diagram converter or laser pointer.
- The elbow-arrow router is a single-bend orthogonal connector (start → bend → end), not full obstacle-avoidance pathfinding — it won't route *around* shapes in its way, just between two points.
- Web-embed elements are restricted to a curated allowlist of known services (YouTube, Vimeo, Figma, CodeSandbox, CodePen, Google Docs/Maps, Loom, Spotify, GitHub Gist, Notion, Observable) rather than arbitrary URLs — a deliberate security tradeoff, see `src/utils/embedAllowlist.ts`.
- AI diagram generation only goes text-to-diagram, not the reverse (wireframe-to-code); it's bring-your-own-API-key only (OpenAI or Anthropic), so it needs a key you provide and pay for, and OpenAI's API may reject direct-from-browser calls depending on their current CORS policy (Anthropic explicitly supports it) — not independently verified against a live key in this repo's own testing, see `TESTING-REPORT.md`.
- Frames are visual/organizational only — moving a frame doesn't drag its contents yet.
- Image cropping uses a simplified model: dragging an edge/corner trims the displayed box directly (rather than showing the full source image faded behind a movable crop window), and dragging inside the box pans which part of the source shows through at the box's current size. Real and useful, just not a full Photoshop-style windowed crop UI.
- The DrawBoard JSON export format (`type: "drawboard"`, saved as `.drawdp`) is its own schema, not byte-for-byte compatible with real `.excalidraw` files, even though both are plain JSON — this is a deliberate scope decision, not a bug (see the gap analysis linked below if you're curious why). Opening a `.drawdp` file previously saved with the old `.excalidraw` extension (before this rename) still works fine.
- The public demo runs single-user only (see above); self-host `server/` if you want live collaboration.
- End-to-end encrypted collaboration at scale, localization/i18n, a VS Code extension / embeddable npm package, a laser pointer, and collaboration-aware undo/redo are all explicitly parked — see `GAP-ANALYSIS.md`'s Large/optional tier.

For a detailed comparison against Excalidraw — what's implemented, what's deliberately out of scope, and why — see [`GAP-ANALYSIS.md`](GAP-ANALYSIS.md).

Contributions welcome on any of these — see below.

## Contributing

Bug reports, feature requests, and PRs are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Please also read the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE) © DesignPav

## Project layout

```
src/
  canvas/       core rendering (Rough.js), geometry/hit-testing, the Canvas component, element factory
  collab/       Yjs document + WebSocket/IndexedDB providers
  components/   all UI panels (toolbar, style panel, menus, dialogs, overlays, feedback form)
  docs/         the /docs user manual — Markdown content + a small React/react-router layout that renders it
  library/      built-in shape library
  state/        Zustand store + undo/redo history stack
  tools/        tool & keyboard-shortcut definitions
  utils/        id generation, PNG/SVG/JSON export
api/
  feedback.ts   Vercel serverless function that emails feedback via Resend
server/
  index.js      minimal Yjs WebSocket relay for optional live collaboration
```

Docs live at `draw.designpav.in/docs` and deploy automatically with the app — each page is a plain Markdown file in `src/docs/content/`; add one there plus an entry in `src/docs/nav.ts` to add a new docs page.
