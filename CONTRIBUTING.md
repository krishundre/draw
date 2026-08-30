# Contributing to DrawBoard

Thanks for considering a contribution! DrawBoard is a small, personal-tool-turned-open-source project, so the process is intentionally lightweight.

## Reporting bugs / requesting features

Open a [GitHub issue](../../issues). Please include:

- **Bugs**: steps to reproduce, what you expected, what happened instead, and your browser/OS.
- **Feature requests**: what problem it solves and, if you have one, how you'd expect it to work.

Check existing issues first to avoid duplicates.

## Submitting a pull request

1. Fork the repo and create a branch off `main`: `git checkout -b my-fix`.
2. Install dependencies: `npm install`.
3. Make your change. Keep it focused — small, single-purpose PRs are much easier to review than large ones.
4. Verify it locally:
   ```bash
   npm run dev        # sanity-check in the browser
   npx tsc --noEmit    # type-check
   npm run build       # confirm the production build still succeeds
   ```
5. Commit with a clear message describing *why*, not just *what*.
6. Open a PR against `main` describing the change and, for UI changes, include a screenshot or short clip.

## Code style

- TypeScript, strict-ish settings (`noUnusedLocals`/`noUnusedParameters` are on — the build will fail on unused code).
- No linter/formatter is enforced yet; match the style of the surrounding code (2-space indent, no semicolizing debates — just be consistent with the file you're editing).
- Avoid adding new dependencies for something a few lines of code can do.

## Project structure

See the [README](README.md#project-layout) for where things live — `src/canvas` for rendering/geometry, `src/state` for the store, `src/components` for UI, `src/collab` for the Yjs real-time layer, `api/` for the Vercel serverless feedback endpoint.

## Questions

Open a [Discussion](../../discussions) (if enabled) or an issue — or email chef@designpav.in.
