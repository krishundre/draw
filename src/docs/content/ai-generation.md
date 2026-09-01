# AI Diagram Generation

Describe a diagram in plain text and DrawBoard will generate real, connected shapes on your canvas — bound arrows, wrapped text labels, and all, exactly as if you'd drawn them by hand.

## Bring your own API key

This is a **bring-your-own-key** feature: DrawBoard doesn't run its own AI backend or pay for your usage. You provide an API key for one of two providers, it's stored only in your browser, and every request goes straight from your browser to that provider's API.

1. Click the ✨ icon (top-right), or open the command palette (`Ctrl`/`Cmd` + `K`) and search "AI settings."
2. Choose a provider — **Anthropic (Claude)** or **OpenAI** — and paste in your API key.
3. Click **Save**.

You'll only need to do this once per browser.

### Where your key lives, and why that matters

Your API key is saved in this browser's `localStorage` and nowhere else — not on a DrawBoard server, not synced anywhere. That means:

- It's only usable from this browser, on this device.
- Anyone with access to this browser profile could technically read it back out (via developer tools). Don't paste in a key you'd be upset to lose — a key scoped to a low spending limit, or one you're prepared to rotate, is safer than your main production key.
- Clearing this site's browser data removes it, same as your drawings (see [Saving Your Work](/docs/saving)).

## Generating a diagram

1. Click ✨ (or search "Generate diagram" in the command palette).
2. Describe what you want — e.g. *"Flowchart for a user login flow with a password-check decision"* or *"Simple three-step onboarding process."*
3. Click **Generate**. The shapes appear on your canvas, already selected, so you can immediately move, restyle, or delete them like anything else.

Generated diagrams use rectangles, diamonds, ellipses, and elbow-routed bound arrows — the same building blocks as if you'd drawn them yourself, so everything downstream (align/distribute, resizing, restyling, export) works exactly the same way.

## What it doesn't do

- It only goes **text → diagram**. There's no "sketch → code" direction (generating HTML/CSS/React from a rough wireframe) — that's a separate feature that isn't built.
- It's not a chat — each generation is a one-shot request; there's no follow-up/refine conversation. If the result isn't right, adjust your prompt and generate again (or just edit the shapes directly).
- Large or highly unusual requests may come back malformed or get capped — the generator caps itself at a reasonable number of shapes per request.

## Provider notes

- **Anthropic** is the more reliably-supported path for this browser-direct setup.
- **OpenAI's** support for API calls made directly from a browser (rather than from a server) can depend on their current policy — if generation fails immediately with a network-level error, that's the likely cause. Anthropic is worth trying if you hit this.

## Troubleshooting

- **"Generate" redirects me to AI settings** — you haven't saved a key yet, or it was cleared.
- **An error message after clicking Generate** — usually an authentication error (double-check the key was pasted correctly and matches the provider you selected) or a network/CORS issue (see Provider notes above).
- **The diagram looks wrong or incomplete** — language models aren't perfect at this; try rephrasing more specifically, or generate again.
