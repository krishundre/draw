# FAQ

**Is it free?**
Yes, completely — no paid tier, no feature paywalled behind an account.

**Do I need an account?**
No. There's no login system at all. Open the link and start drawing.

**Is my data private?**
Yes. Your drawing is stored only in your own browser (local storage/IndexedDB) — it's never uploaded to a server just by using the app. The only things that leave your device are: (1) whatever you explicitly export/download, and (2) if you use the optional real-time collaboration **Share** feature, the elements you draw are relayed live to whoever else you've shared that session's link with (and nowhere else — see below).

**Does the collaboration feature store anything on a server?**
No. The collaboration relay server only passes updates between connected browsers in real time — it doesn't write anything to a database. Each participant's browser keeps its own full local copy.

**Can I self-host it?**
Yes — that's the point of it being open source. Clone the [GitHub repo](https://github.com/krishundre/draw), `npm install && npm run dev`, and you have your own copy running locally. See the repo's README for deployment instructions.

**Is it open source? Where's the repo?**
Yes, under the [MIT License](https://github.com/krishundre/draw/blob/main/LICENSE). Repo: [github.com/krishundre/draw](https://github.com/krishundre/draw).

**How is this different from the real Excalidraw?**
DrawBoard is an independent, original implementation inspired by Excalidraw's design and behavior — not a copy of its source code. It covers the core drawing/styling/export workflow; a few advanced features (true vector SVG export, multi-point arrow editing, arrow-to-shape binding, a Mermaid-to-diagram converter) aren't built yet. See the [README](https://github.com/krishundre/draw#known-limitations) for the current list.

**I found a bug / have an idea — what do I do?**
Use the in-app [feedback form](/docs/feedback), or open an issue on GitHub. See [Contributing](/docs/contributing).
