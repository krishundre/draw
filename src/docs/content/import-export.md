# Import / Export

Open the menu (☰ icon, top-left) for every import/export option.

## Exporting

- **Save as .drawdp (JSON)** — saves your whole drawing as a `.drawdp` file (DrawBoard's own JSON schema — not a real Excalidraw file, even though both are plain JSON; the distinct extension makes that clear at a glance). This is the format to use if you want to re-open and keep editing the drawing later, or hand it to someone else using DrawBoard. See [Saving Your Work](/docs/saving).
- **Export as PNG (1x)** — a standard-resolution image with your canvas background included.
- **Export as PNG (2x, transparent)** — a sharper, higher-resolution image with a transparent background — good for pasting into slides or documents.
- **Export as SVG** — a real, true vector SVG: shapes come out as actual `<path>`/`<text>` elements you can edit in any vector tool (Illustrator, Figma, Inkscape), not a flattened image wrapped in an `<svg>` tag. Embedded images and web-embeds still export as a raster/placeholder respectively, since there's no vector source to recover for those.
- **Copy to clipboard as PNG** — copies the drawing as an image directly to your clipboard, ready to paste into another app (Slack, Docs, an email) without saving a file first.
- **Export selection only** — check this box (only enabled when something's selected) and PNG/SVG/copy-to-clipboard will export just the selected elements instead of the whole canvas.

## Importing

**Open .drawdp file…** in the menu lets you pick a previously-saved `.drawdp` file from your device and load it onto the canvas. (Files saved before this rename, with the old `.excalidraw` extension, still open fine too.)

> Importing replaces what's currently on the canvas. If you have unsaved work you want to keep, export it first.

## Copying elements between tabs

Separately from file export, `Ctrl`/`Cmd` + `C` / `V` copy and paste selected elements through your system clipboard as JSON — handy for moving a shape or two between two open DrawBoard tabs without a full file export/import round trip. See [Canvas Basics](/docs/canvas-basics).

*(Screenshot suggestion: the ☰ menu open showing all export options.)*
