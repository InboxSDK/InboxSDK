# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

InboxSDK is a Yarn 4 monorepo for building Gmail browser extensions. There is no standalone web app or backend — development centers on building the `@inboxsdk/core` SDK and testing via example Chrome MV3 extensions under `examples/`.

### Services

| Service | Command | Notes |
|---------|---------|-------|
| Dev builder (watch) | `yarn start` | Runs `gulp default -w --reloader`; rebuilds SDK + all examples on file changes |
| One-shot build | `yarn gulp` | Builds `packages/core/` bundles and all example extensions |
| Unit tests | `yarn test` | Jest in jsdom; 384 tests |
| Typecheck | `yarn typecheck` | `tsc` |
| Lint | `yarn lint` | ESLint + Prettier |
| CSS lint | `yarn lint:stylelint` | Stylelint |

### Node version

CI (CircleCI) uses **Node 20.9.0**. `.nvmrc` specifies `lts/*`. Node 22 also works for build/test in this environment.

### Manual E2E testing (requires local Chrome + Gmail)

1. Run `yarn start` to start the watch builder.
2. Load an example extension (e.g. `examples/hello-world/` or `examples/app-menu/`) as an unpacked extension in Chrome via `chrome://extensions`.
3. Open Gmail while logged in and refresh after SDK changes.

The hello-world example adds a compose button that inserts "Hello World!" into the email body — a good smoke test for the full extension flow.

Optional: install the [Chrome Extensions Reloader](https://chrome.google.com/webstore/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid) extension; `--reloader` auto-triggers it on rebuild (macOS Chrome paths only in `live/extReloader.ts`).

### Remote-loading dev mode

To mimic production CDN loading with a local server on port 4567:

```bash
yarn gulp --remote server -w --reloader
```

Chrome must be launched with `--allow-running-insecure-content` because Gmail (HTTPS) loads `http://localhost:4567/platform-implementation.js`.

### Gotchas

- `yarn puppeteer` references `test/chrome/` which does not exist in the repo (legacy).
- Peer dependency warnings from Yarn on install are expected and non-blocking.
- After `yarn gulp`, verify outputs: `packages/core/inboxsdk.js`, `examples/*/dist/content.js`.
- Browserslist "caniuse-lite is outdated" warnings during build are harmless.
