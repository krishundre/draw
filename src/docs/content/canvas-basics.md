# Canvas Basics

## Panning

- Hold `Space` and drag, **or**
- Select the **Hand** tool (`H`) and drag, **or**
- Scroll/two-finger-swipe on a trackpad or mouse wheel.

## Zooming

- `Ctrl`/`Cmd` + scroll (or pinch on a trackpad) zooms in and out, centered on your cursor.
- The zoom controls in the bottom-left corner show the current percentage — click **−** / **+** to step, or click the percentage itself to reset to 100%.

## Selecting elements

- Click an element with the **Selection** tool to select it.
- `Shift`-click to add or remove elements from the current selection.
- Click-and-drag on empty canvas to draw a selection box — anything fully inside it gets selected.
- Prefer a freeform shape instead of a rectangle? Use the **Lasso** tool (`Q`) — drag a loop around whatever you want selected.
- Can't find something on a busy board? Press `Ctrl`/`Cmd` + `Shift` + `F` to search elements by their text or type, and jump straight to one.

## Moving, resizing, rotating

- Drag a selected element to move it. Arrow keys nudge it by 1px (`Shift` + arrow key nudges by 10px).
- Drag one of the small square handles around a selection's edges to resize it.
- Drag the small circular handle above a selection to rotate it.
- The **Stats** panel (top-right icon) shows X/Y/W/H for the current selection as editable fields, not just a read-out — type an exact position or size directly.

## Aligning & distributing

Select two or more elements, then right-click for **Align left/right/center, Align top/bottom/middle**. With three or more selected, **Distribute horizontally/vertically** spaces them out evenly. Both are also in the command palette (`Ctrl`/`Cmd` + `K`) if you'd rather not touch the mouse.

## Links

Right-click a single element and choose **Add link…** to attach a URL to it. `Ctrl`/`Cmd`-click a linked element to open it in a new tab — a plain click still just selects it, so the link never gets in the way of normal editing.

## Copy & paste

`Ctrl`/`Cmd` + `C` and `Ctrl`/`Cmd` + `V` copy and paste the selected element(s) through your operating system's real clipboard — separate from **Duplicate** (`Ctrl`/`Cmd` + `D`), which doesn't touch the clipboard at all. This also means you can copy in one DrawBoard tab and paste in another.

## Grouping

Select two or more elements and use **Group** in the left panel (or `Ctrl`/`Cmd` + `G`) to combine them into one unit you can move, resize, or style together. **Ungroup** (`Ctrl`/`Cmd` + `Shift` + `G`) splits them back apart.

## Layering (z-order)

When shapes overlap, use the **Layers** controls in the left panel to change which one draws on top:

- **Back** — send behind everything
- **↓** — send one step backward
- **↑** — bring one step forward
- **Front** — bring in front of everything

## Locking

**Lock** (in the left panel, or the right-click menu) freezes a selected element in place — it can't be moved, resized, or deleted until you unlock it. Handy for a background element you don't want to bump while working on top of it.

## Undo / redo

- `Ctrl`/`Cmd` + `Z` to undo, `Ctrl`/`Cmd` + `Shift` + `Z` (or `Ctrl`/`Cmd` + `Y`) to redo.
- Or use the undo/redo arrows next to the zoom controls in the bottom-left.

## Duplicating

Select an element and press `Ctrl`/`Cmd` + `D`, or right-click → **Duplicate**. The copy is placed slightly offset from the original.

## Right-click menu

Right-click anywhere for a context menu with duplicate, copy/paste, copy/paste styles (copy one element's look and apply it to another), links, align/distribute, layering shortcuts, undo/redo, and delete. Selecting an image also adds **Crop image**; selecting an embed adds **Edit embed URL** and **Interact with embed**.

## Text labels on shapes

Double-click a rectangle, diamond, or ellipse to add a text label bound to it. The label wraps to the shape's width automatically, and the shape grows to fit as you type more. Resize the shape later (drag a handle, or type new numbers into the Stats panel) and the label re-wraps and stays centered.

## Grid & background

Open the menu (☰ icon, top-left) to toggle a snapping grid on/off and to change the canvas background color.

*(Screenshot suggestion: a multi-element selection showing resize + rotate handles, and the right-click context menu open.)*
