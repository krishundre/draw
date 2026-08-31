# DrawBoard vs. Excalidraw — Feature Gap Analysis

**Date:** 2026-08-31
**Scope:** Feature/capability comparison only — no code was changed for this report.

## Methodology

**DrawBoard's feature set** was taken from the actual source, not just docs: `src/types/index.ts` (element/app-state model), `src/tools/toolDefs.ts` (tool list), `src/components/StylePanel.tsx`, `src/components/CommandPalette.tsx`, `src/utils/export.ts`, `src/components/LibraryPanel.tsx`, `src/collab/doc.ts`, cross-checked against `README.md` and `TESTING-REPORT.md` (which already documents several gaps discovered during QA).

**Excalidraw's feature set** was taken from: the [excalidraw/excalidraw README](https://github.com/excalidraw/excalidraw), its `packages/excalidraw/CHANGELOG.md` (covering roughly the last 12-18 months of releases), the [DeepWiki architecture overview](https://deepwiki.com/excalidraw/excalidraw) for the current app's structure, and targeted web searches for specific tools (lasso, magic/AI frame) not clearly documented in the README itself. **`docs.excalidraw.com` turned out to be a developer/integration-API doc site** (for embedding the `@excalidraw/excalidraw` npm package), not an end-user feature manual — it didn't have the "Features"/"curated features" end-user pages the brief expected, so that source is thinner than planned. Where I couldn't verify something with confidence, it's marked **unverified** below rather than guessed.

---

## Implementation status update (2026-08-31, later same day)

All 6 **Quick wins** and all 7 **Medium effort** items below were implemented in a follow-up pass. The **Large/optional** tier and the **"explicitly decide not to build"** list were left untouched, as scoped. Full implementation detail and live-verification notes are in `TESTING-REPORT.md`'s "Gap-closing pass" addendum — this note exists specifically to confirm each item is *genuinely* complete, not partially done the way the original bound-text feature (flagged as ⚠️ partial in the table below) turned out to be:

| Item | Status | Genuinely complete? |
|---|---|---|
| Align/distribute | ✅ Done | Yes — all 6 align modes + 2 distribute axes, wired to context menu + command palette, keeps bound arrows/text in sync. |
| Copy/paste to clipboard | ✅ Done | Code-complete and fails-silently-safe; **live OS-clipboard round-trip unverified** (test browser has clipboard permissions hard-denied) — the one item here that still needs a manual real-browser check, same caveat already on record for copy-as-PNG. |
| Export selection only | ✅ Done | Yes — filters PNG/SVG/clipboard-PNG exports; JSON export intentionally still exports everything (it's the save format, not a share-a-snippet format). |
| Arrow-to-shape binding | ✅ Done | Yes — binds on creation (drag or click-chain), tracks through move/resize/nudge/align/distribute, and correctly *un*-binds if you manually drag a bound endpoint in point-edit mode. |
| Editable stats panel | ✅ Done | Yes — X/Y/W/H editable, single undo step per edit, keeps bound arrows/text in sync (W/H editing is single-element-only by design, same limitation resize handles already had for multi-select). |
| Element hyperlinks | ✅ Done | Yes — add/edit/remove via context menu, Ctrl/Cmd-click to open, doesn't intercept normal selection clicks. |
| True vector SVG export | ✅ Done | Yes — real `rough.svg()`-generated `<path>`/`<text>` elements; confirmed the output is not a single wrapped `<image>`. Raster images stay raster (inherent, matches Excalidraw's own SVG export). |
| Bound text that reflows | ✅ Done, and specifically **not** the same partial state as before | The original implementation (flagged as ⚠️ partial below) created centered text but never wrapped or resized with the container. It now genuinely wraps to the container's width, the container grows to fit as you type, and both re-wrap correctly on every kind of container resize (handle drag or stats-panel edit) — verified with a 6-line-then-3-line live re-wrap test, not just a visual glance. |
| Multi-point line/arrow editing | ✅ Done | Yes — click-chain creation (click/click/click, click-near-last-point or Enter to finish, Escape to cancel) plus point-edit mode on existing lines/arrows (drag/insert/remove points). The 2-point drag-to-draw default is unchanged. |
| Lasso selection tool | ✅ Done | Yes — freeform polygon selection, same bounding-box-containment rule the rectangular marquee already used, new toolbar entry + `Q` shortcut. |
| Scene search | ✅ Done | Yes — searches text/type, reuses command-palette UI, pans/selects on click; bound to `Ctrl/Cmd+Shift+F` specifically to avoid clobbering the browser's own `Ctrl+F` page-find. |
| Image cropping | ✅ Done, with a simplified interaction model | The crop UI trims the displayed box directly and pans within it, rather than showing the full source image faded behind a movable window (a fuller Photoshop-style crop UI would be a larger follow-up) — this is a documented, deliberate scope reduction, not an accidentally-partial feature. Enter applies, Escape correctly reverts to the pre-edit crop. |
| Shape library panel redesign | ✅ Done | Yes — docked full-height sidebar, 3 tabs (Built-in / My library / Imported), items tagged by source so the Imported tab only shows imports, not manually-added shapes. |

One thing found *during* this pass and fixed along the way, unrelated to any single gap item: the resize/rotate handles had a dead center-click zone (see `TESTING-REPORT.md` BUG-08).

---

## Feature comparison table

| Feature | In Excalidraw | In DrawBoard | Notes |
|---|:---:|:---:|---|
| Rectangle, ellipse, diamond, line, arrow, freehand draw, text, image, eraser, hand/pan | ✅ | ✅ | Parity. |
| Frame tool | ✅ | ✅ | DrawBoard's frames are visual/organizational only — don't drag their contents, elements aren't associated via `frameId`. Documented limitation. |
| Selection tool (rectangular drag-box) | ✅ | ✅ | Parity. |
| **Lasso tool** (freeform/organic selection) | ✅ | ❌ | Only rectangular drag-box selection exists. |
| **Embeddable / web-embed element** (iframe) | ✅ | ❌ | Not built. |
| **Laser pointer** | ✅ | ❌ | Not built (documented in README's known limitations). |
| **Magic Frame / AI text-to-diagram, wireframe-to-code** | ✅ (unverified whether the *generation* itself is free-tier or requires Excalidraw+ AI credits/a user API key) | ❌ | Not built. |
| **Mermaid-to-diagram (TTD dialog)** | ✅ | ❌ | Not built (documented in README's known limitations). |
| Stroke color, background/fill color, fill style (hachure/cross-hatch/solid) | ✅ | ✅ | Parity. |
| Stroke width, stroke style, sloppiness ("architect/artist/cartoonist") | ✅ | ✅ | Parity. |
| Sharp/round edges, opacity | ✅ | ✅ | Parity. |
| Arrowhead styles (both ends) | ✅ | ✅ | Parity (5 styles: none/arrow/triangle/dot/bar). |
| Font family/size/alignment | ✅ (broader font picker with **CJK language support + SVG font subsetting**) | ✅ (3 families: hand-drawn/normal/code) | DrawBoard has no CJK/non-Latin font support. |
| **Text auto-wrap within containers** | ✅ | ❌ | DrawBoard's text has no auto-wrap — confirmed absent in `TESTING-REPORT.md`. |
| **Bound text / text-in-container** (double-click a shape to label it, text resizes with the shape) | ✅ (full container binding system) | ⚠️ partial | DrawBoard's `TextElement.containerId` field exists in the type and double-clicking a shape *does* create a centered text element, but the text isn't truly bound (doesn't auto-resize/reflow with the container, no auto-wrap). |
| **Arrow-to-shape binding** (arrows stay attached as you move a shape) | ✅ | ❌ | `Binding` type and `startBinding`/`endBinding` fields exist in `types/index.ts` but are never populated — documented as not implemented in README. |
| **Multi-point line/arrow editing** (click-click-click-double-click to add points; edit points after creation) | ✅ (dedicated "linear element editor") | ❌ | DrawBoard's lines/arrows are 2-point drag-only — documented limitation. |
| **Elbow arrows** (orthogonal routing with waypoints) | ✅ | ❌ | Not built. |
| **Flowchart-specific tooling** (node/connector creation helpers) | ✅ | ❌ | Not built. |
| Multi-select, 8-handle resize, rotate | ✅ | ✅ | Parity. |
| Group/ungroup, lock/unlock | ✅ | ✅ | Parity. |
| **Align/distribute** (left/right/center/top/bottom, distribute evenly) | ✅ | ❌ | Confirmed absent — flagged in `TESTING-REPORT.md` as a genuine gap, not documented as existing. |
| Layering (front/back/forward/backward) | ✅ | ✅ | Parity. |
| Duplicate | ✅ | ✅ | Parity (`Ctrl+D`). |
| **Copy/paste to system clipboard** (elements, not just images) | ✅ | ❌ | Only Duplicate exists; confirmed absent in `TESTING-REPORT.md`. |
| Undo/redo | ✅ (**collaboration-aware** — merges correctly with remote edits mid-session) | ✅ (single-user history stack) | DrawBoard's undo/redo isn't collab-aware; a concurrent remote edit during your undo window isn't specially reconciled. |
| Infinite pan/zoom canvas, grid | ✅ | ✅ | Parity. |
| Pinch-zoom / two-finger pan (touch) | ✅ | ✅ | DrawBoard added this in the most recent QA pass (was previously missing). |
| Dark/light theme | ✅ | ✅ | Parity. |
| **Scene search** (find elements by text/property across the canvas) | ✅ | ❌ | Not built. |
| **Image cropping** (in-editor) | ✅ | ❌ | Not built. |
| **Element hyperlinks** (clickable links attached to elements) | ✅ | ❌ | Not built. |
| Stats panel (element count, position, size) | ✅ (**editable** — change values directly in the panel) | ✅ (read-only) | DrawBoard's stats panel only displays; Excalidraw's lets you type new X/Y/W/H directly. |
| Command palette | ✅ | ✅ | Parity — DrawBoard added this independently; Excalidraw shipped theirs in v0.18.0 (March 2025). |
| Right-click context menu | ✅ | ✅ | Parity. |
| Shape library (built-in + save-your-own) | ✅ (richer: dockable sidebar with tabs, community library marketplace at libraries.excalidraw.com) | ✅ (simpler: single panel, localStorage-backed) | DrawBoard has no equivalent to the community library marketplace. |
| `.excalidrawlib` import/export | ✅ | ✅ | Parity on the format name/shape. |
| Export to PNG | ✅ | ✅ | Parity. |
| **Export to true vector SVG** | ✅ | ⚠️ | DrawBoard's "SVG export" rasterizes to PNG and wraps it in an `<svg>` tag — not real vector output. Documented limitation. |
| Export to native JSON | ✅ (`.excalidraw`, a documented open format) | ✅ (own `type: "drawboard"` JSON, not cross-compatible with real `.excalidraw` files) | A real Excalidraw file can't be opened in DrawBoard and vice versa — different, incompatible JSON schemas despite both being "open JSON export." |
| **Export selection only** (vs. whole canvas) | ✅ | ❌ | DrawBoard's PNG/SVG export always exports every element; no "export just what's selected" option. |
| Copy-to-clipboard as image | ✅ | ✅ (code path correct; not independently re-verified live due to automated-browser clipboard permission limits — see `TESTING-REPORT.md`) | |
| Autosave / local-first persistence | ✅ (localStorage) | ✅ (IndexedDB via Yjs) | Parity in spirit; different storage mechanism. |
| PWA / offline support | ✅ | ✅ | Parity. |
| Real-time multiplayer collaboration | ✅ (Firebase-backed, **advertised as end-to-end encrypted**) | ✅ (Yjs + self-hosted WebSocket relay, not encrypted) | DrawBoard's collab has no encryption layer, and isn't enabled on the public demo (self-host `server/` to use it) — both are documented choices, not oversights. |
| Shareable read-only export links | ✅ | ❌ | Not built. |
| VS Code extension / npm package for embedding in other apps | ✅ | ❌ | DrawBoard is a standalone app, not published as an embeddable library. |
| Localization / i18n | ✅ | ❌ | DrawBoard is English-only. |
| Feedback mechanism | ❌ (none built into the app itself) | ✅ | DrawBoard has an in-app feedback form emailing the maintainer — Excalidraw has no equivalent in-app. |
| First-time onboarding tour | ❌ (unverified — didn't find one in the sources checked) | ✅ | DrawBoard has a 6-step spotlight tutorial on first visit. |
| "Liquid Glass" adaptive-contrast UI chrome | ❌ | ✅ | DrawBoard-specific; not an Excalidraw feature or gap in either direction. |

---

## Prioritized gap list

### 🟢 Quick wins (small, self-contained, clearly valuable)

1. **Align/distribute** (left/right/center/top/bottom, distribute evenly) — pure geometry math over the existing selection/multi-select system; no new element types or data model changes needed. *Already flagged as a known gap in `TESTING-REPORT.md`.*
2. **Copy/paste to system clipboard** — `navigator.clipboard` read/write of a JSON element payload; the export/import JSON logic already exists to reuse. *Already flagged as a known gap.*
3. **Export selection only** — the export functions already take an `elements` array; just filter to `selectedIds` when there's a selection, with a toggle in the export menu.
4. **Arrow-to-shape binding** — the data model (`Binding`, `startBinding`/`endBinding`) already exists in `types/index.ts`, unused. This is "wire up what's already there," not new design. *Already flagged as not implemented in README.*
5. **Element hyperlinks** — attach a URL string to any element + a small UI affordance to open it; no rendering-engine changes needed.
6. **Editable stats panel** — turn the existing read-only X/Y/W/H display into number inputs that call the existing `updateElement`.

### 🟡 Medium effort (real design/state work)

1. **Multi-point line/arrow editing** — needs a real interaction-mode redesign (click-chain point placement, an editing mode for existing points) in `Canvas.tsx`. *Already flagged as a known gap in README.*
2. **True vector SVG export** — replace the current PNG-rasterize-and-wrap approach with a real Rough.js SVG renderer path (Rough.js supports SVG output; DrawBoard's canvas renderer would need a parallel SVG code path). *Already flagged as a known gap.*
3. **Bound text that actually reflows** (auto-wrap, resizes with its container) — the `containerId` field and double-click-to-label already exist; this is completing that feature, not starting from zero.
4. **Lasso (freeform) selection tool** — a new selection mode alongside the existing rectangular drag-box; needs point-in-polygon hit-testing added to `geometry.ts`.
5. **Scene search** — search across `elements` by text content/type; needs a search UI (could reuse the command-palette's UI patterns) plus scroll-to-result.
6. **Image cropping** — an in-editor crop UI for `ImageElement`; needs new interaction affordances on top of the existing resize-handle system.
7. **Shape library marketplace/sidebar richer UX** — DrawBoard's library panel is functional but basic; matching Excalidraw's dockable-sidebar-with-tabs would be a UI redesign, not just new logic.

### 🔴 Large / optional (only worth it for head-on competition, not staying lightweight)

1. **Elbow arrows** (orthogonal routing) and **flowchart-specific tooling** — significant new interaction/rendering logic for a narrower use case (technical diagramming) than DrawBoard's general sketching focus.
2. **Mermaid-to-diagram (TTD) converter** — needs a Mermaid parser + a mapping layer to DrawBoard's element model. *Already flagged as a known gap in README.*
3. **Web-embed / embeddable iframe elements** — a real security surface (arbitrary iframe embedding) that needs careful sandboxing; not a small addition.
4. **AI-assisted "wireframe to diagram/code" generation** — requires an AI backend/API integration decision (which model, whose API key, cost model) before any UI work.
5. **End-to-end encrypted real-time collaboration at scale** — DrawBoard's current Yjs relay is unencrypted and self-hosted-only; real E2EE (matching Excalidraw's) plus a managed hosted relay is an infrastructure project, not a feature PR.
6. **Localization/i18n** — touches every UI string in the app; a real, ongoing translation-maintenance commitment.
7. **VS Code extension / npm-embeddable package** — packaging DrawBoard as an embeddable library for other apps is a distribution/API-design project, not a feature.
8. **Laser pointer** — only meaningful in the context of live presentations during real-time collab, so it's gated behind DrawBoard actually having mature, always-on collaboration first.
9. **Collaboration-aware undo/redo** — reconciling local undo against concurrent remote edits during multiplayer sessions is a real CRDT-design problem, not a quick fix, and only matters once collaboration is a first-class, always-on feature.

---

## Things Excalidraw has that DrawBoard should explicitly decide **not** to build

These only make sense at Excalidraw's scale/business model — chasing them would be scope creep for a lightweight, self-hosted, personal/small-team tool:

- **Excalidraw+ workspace/team management** (trash system, workspace import, real-time workspace sync) — this is multi-tenant SaaS infrastructure; DrawBoard's whole value proposition is *not* being a hosted multi-tenant product.
- **Public API & MCP server, API key management/rotation** — makes sense for a platform other apps integrate against; DrawBoard isn't positioning as a platform.
- **Per-team AI access controls, enterprise log retention tiers** — enterprise/compliance features with no audience for a self-hosted personal tool.
- **Presentation mode** (presenter notes, presenter view, waiting room, guest commenting/admission) — a legitimately different product surface (live presenting to an audience) than DrawBoard's sketching-tool focus.
- **Custom AI token bring-your-own-key management, advanced slide templates, education pricing plan** — all Excalidraw+ monetization/business features with no equivalent need in DrawBoard's MIT/self-hosted model.
- **Shareable read-only export links** — this specifically requires a hosting backend to generate and serve persistent shareable URLs; contradicts DrawBoard's local-first, no-backend-required design (the one exception, the optional collab relay, is opt-in and explicitly documented as not required).

---

## Things I couldn't verify — flagged rather than guessed

- Whether Excalidraw's **AI text-to-diagram / wireframe-to-code generation** is available on the free excalidraw.com app or requires Excalidraw+ credits / a user-supplied API key. Search results referenced "AI frames" and Excalidraw+ changelog entries about "bring your own OpenAI/Claude/Gemini key," but I couldn't pin down the exact free/paid boundary from public sources.
- Whether excalidraw.com (the free app) has any form of **version/revision history** beyond undo/redo. I found no clear evidence of this in the README, changelog, or DeepWiki overview — it may not exist at all in the free tier, or may be bundled into Excalidraw+ workspace features. Not asserted either way in the tables above.
- `docs.excalidraw.com`'s actual end-user-facing "Features" pages (the brief's step 2 specifically asked me to check these) — the site turned out to be developer/integration API docs, not an end-user feature manual, so I couldn't check that specific source as instructed. I substituted the CHANGELOG, README, and DeepWiki instead, which I'm confident cover the same ground, but flagging the substitution for transparency.
