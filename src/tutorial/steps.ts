export interface TutorialStep {
  id: string;
  // matches a data-tutorial="<target>" attribute on a real UI element, or
  // null for a centered, un-spotlit informational step.
  target: string | null;
  title: string;
  body: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    target: null,
    title: "Welcome to DrawBoard",
    body: "A quick tour of the basics — takes about 20 seconds. You can skip anytime.",
  },
  {
    id: "toolbar",
    target: "toolbar",
    title: "Pick a tool",
    body: "Rectangle, ellipse, arrow, freehand draw, text, and more. Click one, then draw on the canvas.",
  },
  {
    id: "style-panel",
    target: "style-panel",
    title: "Style what you draw",
    body: "Stroke color, fill, sloppiness, and more appear here once a tool or shape is selected.",
  },
  {
    id: "command-palette",
    target: null,
    title: "Quick actions",
    body: "Press Ctrl/Cmd+K anytime to search commands — tools, undo/redo, theme, zoom — without touching the mouse.",
  },
  {
    id: "docs-feedback",
    target: "docs",
    title: "Docs & feedback",
    body: "The book icon opens the full user manual; the speech-bubble icon sends feedback straight to the maintainer.",
  },
  {
    id: "help",
    target: "help",
    title: "You're set",
    body: "Press ? anytime for the full keyboard shortcut list — and you can replay this tour from the command palette or the help dialog.",
  },
];
