> Historical investigation of the removed Ollama implementation. Not setup instructions for the current deterministic organizer. See README.md.

# Hosted local AI connection incident — 21 October 2026

## Verified cause

The production HTTPS frontend serves built Vite assets successfully (HTTP 200). Folder selection/inventory works in the owner's screenshots. The local Ollama `/api/tags` endpoint returns 200 without a website Origin header, but returns **403 Forbidden** when supplied with `Origin: https://arrangemyfilesai.detleng.com`.

This confirms an Ollama allowed-origin configuration issue. It does not establish whether a browser Local Network Access permission is also blocked. Browser JavaScript often receives only a generic network error for CORS failures; it cannot reliably infer the exact cause from that error alone.

Selecting a local folder does not upload it to GitHub Pages and does not authorize the Ollama connection. These are separate permissions.

## Local fixes

- Added validated network/model-response errors and useful recovery text instead of the raw `Failed to fetch` message.
- Added inline Windows connection guidance below the local AI check.
- Added `public/connect-local-ai.cmd`: asks before adding the exact production origin, preserves other origins, restarts an existing Ollama process, and probes the production-origin API request. It does not change Ollama's bind address, firewall, or wildcard origins.
- Added SVG/ICO favicon and Apple touch icon, explicitly linked in HTML and included in `dist`.
- Added six regression tests for network rejection, 403, malformed tags/model JSON, missing model, and timeout.

## Verification

31 automated tests passed. TypeScript and Vite production build passed. Setup helper's PowerShell syntax parsed with zero errors. Favicon resources are present in the build. Browser verification of the new panel is separate from live deployment.

The execution sandbox denied writes to the Windows user environment registry. No successful configuration change was claimed. The owner approved the exact setting and restart and received a local helper to apply it in their own Windows session. Record actual post-helper browser inference separately before declaring the hosted connection fixed.

## Run the live website

The static live website does not need `npm run dev` or the local Guide server for document analysis. Each visitor needs local Ollama, the installed qwen3:4b model, the exact website origin allowed, and applicable browser local-network permission.

The public cloud Guide remains a separate backend deployment task. Do not expose its key in Pages assets and do not proxy private documents through that backend.

## Release

Changes remain local on the existing `codex-progress` checkout. No push, merge, Pages deployment, DNS change, Render service creation, or Mastra Platform connection was performed by this repair session. The icon and UI fixes will not appear publicly until the owner approves publication through the existing tested workflow. The origin setting can repair the currently deployed build without a code deployment.

Use `npm.cmd test` and `npm.cmd run build` in PowerShell. Avoid resetting execution policy. The existing GitHub Actions workflow builds and uploads `dist` on main; no new repository, hosting platform, or branch arrangement is necessary.

Official references: [Ollama allowed origins and Windows environment configuration](https://docs.ollama.com/faq), [Chrome Local Network Access](https://developer.chrome.com/blog/local-network-access).

## Post-helper verification

The owner ran the approved helper and reported PASS. The same production-origin tags request changed from 403 to 200, with `Access-Control-Allow-Origin: https://arrangemyfilesai.detleng.com`. POST preflight returned 204 with the exact origin. A real synthetic Qwen inference carrying that Origin header returned a validated Project Planning Notes suggestion. This proves the origin-policy repair and actual inference at the Ollama service layer.

The in-app browser's hosted check still timed out. This may be a browser permission or environment restriction; no browser success is claimed from a command-line test. Owner Edge/Chrome check is pending. The repaired build provides setup guidance automatically when connection fails. Its favicon.ico, favicon.svg, and apple-touch-icon.png all returned HTTP 200 with the expected image content types on the local production preview.
