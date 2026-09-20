# Vendored browser libraries

This app is a static site. Runtime UI/crypto libraries live in this folder, are committed to git, and are referenced from `index.html` with `libs/...` paths. Versions are pinned in `manifest.json`.

## Current status (2026-09-20)

| Library | Pinned | Latest on npm (checked 2026-09-20) | In repo? | Notes |
| --- | --- | --- | --- | --- |
| Vue | 3.5.43 | 3.5.43 | Yes | Current stable 3.5 (not 3.6 RC) |
| Axios | 1.20.0 | 1.20.0 | Yes | Current; official UMD build |
| Bootstrap | 5.3.8 | 5.3.8 | Yes | Current 5.3 |
| Bootstrap Icons | 1.13.1 | 1.13.1 | Yes | Current; CSS + `fonts/*.woff{2}` |
| qrcode (soldair) | 1.5.4 | 1.5.4 | Yes | Current; browser IIFE bundle of `lib/browser.js` |
| buffer | 6.0.3 | 6.0.3 | Yes | Current; browserify standalone `Buffer` |
| bitcoinjs-lib | 5.2.1 | 7.0.2 | Yes | Latest 5.x. 6/7 remove `ECPair` and 7 uses `bigint` satoshis |

Pinned copies of Vue, Axios, Bootstrap, and Bootstrap Icons match the official npm tarball bytes (SHA-256 in `manifest.json`). qrcode, buffer, and bitcoinjs-lib are custom browser bundles because those packages do not ship a ready UMD file that this app can load.

### Already local (no CDN)

`index.html` loads Vue, Axios, Bootstrap, Bootstrap Icons, qrcode, buffer, and bitcoinjs-lib from `libs/`. Icon fonts are local (`fonts/bootstrap-icons.woff2` and `.woff`), as required by the icons CSS.

### Still external (not libraries we can vendor)

These are **services**, not copyable libraries:

| Dependency | Where | Why it stays external |
| --- | --- | --- |
| Esplora / mempool RPC | `app.js` network list | Blockchain access (UTXOs, broadcast, genesis) |
| Block explorers | `app.js` `NETWORK_EXPLORERS` | Optional “view on explorer” links after send |

There are **no** remaining CDN script/style tags in `index.html`. Tests fail if an `http(s):` `src`/`href` is added there.

### Dev-only (npm, not shipped)

| Package | Pinned in `package.json` | Latest (2026-09-20) |
| --- | --- | --- |
| vitest | 3.2.7 | 5.0.1 |
| jsdom | 26.1.0 | 30.1.0 |

These are for `npm test` / CI only. They are not loaded by `index.html`. GitHub Actions (`actions/checkout`, `actions/setup-node`, Pages deploy actions) are CI infrastructure, not app libraries.

## How to upgrade a vendored library

1. Edit `version` for that library in `manifest.json`.
2. Run `npm run vendor` (needs network once: `npm pack` / `npx esbuild` or `npx browserify`).
3. Run `npm test`.
4. Smoke-test the app: open `index.html`, create/import a wallet, render the Receive QR code, send on a testnet if the bump was bitcoinjs-lib/Bootstrap.

`npm run vendor` will:

- Copy (or rebuild bundled libs) into versioned dest names
- Rewrite `index.html` tags marked with `data-lib="..."`
- Refresh the README file tree and architecture version markers
- Write new SHA-256 values into `manifest.json`
- Delete stale top-level files in `libs/` that are no longer listed

`npm run vendor:check` (also covered by unit tests) verifies dest files, hashes, HTML refs, and that no CDN URLs remain — **no network**.

Re-bundle even when the version is unchanged:

```bash
npm run vendor -- --force
```

## Follow-ups

- Optional: vendor Bootstrap `.map` files **or** strip `sourceMappingURL` on copy so DevTools stop 404ing
- Keep bitcoinjs-lib on 5.2.1 until there is a reason to take 6/7 (needs `ecpair` + an ECC library; 7 also uses `bigint` values)
- Vue 3.6 is still RC; stay on 3.5.43 until 3.6 is stable
- Keep Vitest 3.2.7 / jsdom 26.1.0 until there is a reason to take Vitest 5 and jsdom 30 (major, test-only)

## Policy

- **Do not** add jsDelivr, unpkg, cdnjs, or other CDN tags for UI or crypto libraries.
- **Do** commit the minified (or font / bundle) files in this folder. The GitHub Pages workflow deploys the repo as-is; there is no bundler step at deploy time.
- **Do** pin exact versions in `manifest.json` (runtime) and `package.json` (test tools).
- Esplora RPCs and block explorers are allowed network calls. They are not third-party UI libraries.
