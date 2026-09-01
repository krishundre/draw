# FAQ

**Is it free?**
Yes, completely — no paid tier, no feature paywalled behind an account.

**Do I need an account?**
No. There's no login system at all. Open the link and start drawing.

**Is my data private?**
Yes. Your drawing is stored only in your own browser (local storage/IndexedDB) — it's never uploaded to a server just by using the app. The only things that leave your device are: (1) whatever you explicitly export/download, (2) if you use the optional real-time collaboration **Share** feature, the elements you draw are relayed live to whoever else you've shared that session's link with (and nowhere else — see below), and (3) if you use **AI Diagram Generation** with your own API key, the text prompt you type is sent directly to whichever provider you configured (see [AI Diagram Generation](/docs/ai-generation)).

**Does the collaboration feature store anything on a server?**
No. The collaboration relay server only passes updates between connected browsers in real time — it doesn't write anything to a database. Each participant's browser keeps its own full local copy.

**Can I self-host it?**
Yes — that's the point of it being open source. Clone the [GitHub repo](https://github.com/krishundre/draw), `npm install && npm run dev`, and you have your own copy running locally. See the repo's README for deployment instructions.

**Is it open source? Where's the repo?**
Yes, under the [MIT License](https://github.com/krishundre/draw/blob/main/LICENSE). Repo: [github.com/krishundre/draw](https://github.com/krishundre/draw).

**How is this different from the real Excalidraw?**
DrawBoard is an independent, original implementation inspired by Excalidraw's design and behavior — not a copy of its source code. It covers the core drawing/styling/export workflow plus true vector SVG export, multi-point arrow editing, arrow-to-shape binding, elbow/flowchart connectors, web-embeds, and AI-assisted text-to-diagram generation. A few things still aren't built — a Mermaid-to-diagram converter, a laser pointer, real-time collaboration-aware undo, and end-to-end-encrypted collaboration among them. See [GAP-ANALYSIS.md](https://github.com/krishundre/draw/blob/main/GAP-ANALYSIS.md) in the repo for the full, current comparison.

**Does the AI diagram generator send my drawings anywhere?**
No — it only sends the text prompt you type, and only to whichever AI provider (OpenAI or Anthropic) you've configured, using an API key you provide yourself. That call goes straight from your browser to the provider's API; DrawBoard has no backend involved and never sees your key or your prompt. See [AI Diagram Generation](/docs/ai-generation) for the details and the privacy tradeoffs of keeping an API key in your browser.

**Why can I only embed certain websites?**
Embedding a web page means DrawBoard loads it in a live iframe on your canvas — allowing *any* URL would make DrawBoard a general-purpose way to iframe arbitrary, potentially malicious sites, which is a real security risk. Instead, the Embed tool only accepts a curated list of known services (YouTube, Figma, CodeSandbox, and similar) — the same approach Excalidraw itself takes. See [Toolbar Guide](/docs/toolbar).

**I found a bug / have an idea — what do I do?**
Use the in-app [feedback form](/docs/feedback), or open an issue on GitHub. See [Contributing](/docs/contributing).
