# Arrange My Files AI by DeTLeng

**Your Files. Your Computer. Your AI.**

A Windows desktop browser workspace for understanding documents locally, reviewing naming suggestions, and copying approved files into a separate organized output folder. The optional DeTLeng AI Guide uses GroqCloud through a secure Node.js/Mastra backend.

## Start locally

Requires Node.js 24, current Chrome/Edge, Ollama, and `qwen3:4b`.

```powershell
npm ci
npm run fixtures
npm run dev
```

Open http://127.0.0.1:5173. In a second terminal, optionally start the Guide:

```powershell
Copy-Item .env.example .env
# Edit .env privately and set GROQ_API_KEY. Never paste the key into chat.
npm run dev:api
```

Do not overwrite an existing `.env`. The secret file is ignored by Git. Restart the API after changing it. `GROQ_MODEL` is configurable; no automatic model or paid fallback is enabled.

Install local AI:

```powershell
ollama pull qwen3:4b
ollama run qwen3:4b
```

Use **Check local AI** in the app. A reachable server or installed model alone does not mark inference ready. Download is roughly 2.5 GB; actual runtime RAM/VRAM and speed depend on hardware/context. Qwen3-4B's upstream licence is Apache 2.0; see the [official model card](https://huggingface.co/Qwen/Qwen3-4B).

## Architecture

- `src/domain.ts`: deterministic naming, extension preservation, reserved names, path limits and collision validation.
- `src/extract.ts`: lazy browser-side TXT/MD/CSV, DOCX, PDF, XLSX and PPTX extraction. No document upload.
- `src/ollama.ts`: fixed loopback endpoint, `qwen3:4b`, non-thinking structured inference and Zod validation.
- `src/files.ts`: recursive inventory, explicit approvals, source-change checks, copy-first operation, SHA-256 verification, local manifest and verified rollback.
- `src/App.tsx`: workspace, review, setup, offline synthetic demo, AI Family, cloud Guide UI.
- `server/agent.ts`: Mastra agent `detleng-ai-guide`, Groq model configuration, curated troubleshooting tool.
- `server/app.ts`: strict request contracts, CORS, request limits, rate limits, global daily cap, concurrency cap, sanitized error handling. No chat persistence or content logging.
- `src/BrowserChecks.tsx`: development-only real browser OPFS tests. Never accesses personal folders.

The organizer works independently of the Guide. All cloud requests use a separate endpoint. Browser sends only user-written messages, bounded recent chat history, and opt-in stage/error enums. Filenames, paths, excerpts, inventories, file handles and raw diagnostics are never automatically attached. User-written messages can contain sensitive information: the interface warns users to keep private information out.

## Browser permissions and troubleshooting

`showDirectoryPicker` requires a supported secure context (HTTPS or trusted local development). Use current Chrome/Edge on Windows. Folder selection is an explicit user action. Read-only inventory precedes separately authorized output writing. Restricted system folders may be denied. Mobile/unsupported browsers can explore the tour/demo and use individual file selection where available. Copying selected file snapshots requires a browser with output-directory writing support.

For browser-to-Ollama requests, allow the exact frontend origin using `OLLAMA_ORIGINS`, then restart Ollama. Local development uses `http://127.0.0.1:5173`. Future public use requires the HTTPS custom origin. Browser Local Network Access permission may also apply. Do not expose Ollama to the public internet or configure wildcard origins. For local-only Ollama, set `OLLAMA_NO_CLOUD=1` and restart it. No automatic OS/network configuration changes are made by this app.

## Safety and recovery

Choose a small synthetic folder first (`work/fixtures`, created by `npm run fixtures`). Use `work/output` as a separate output destination. Never test against the owner's Coursera backup without separate authorization.

The app creates a unique `.arrangemyfiles-<uuid>` output session. The source and output must be separate (neither contains the other). Names/extensions are validated in deterministic code; AI cannot execute file operations. Selected conflicts block copying. Every planned operation is recorded, and each completed/failed result is written into `operation-manifest.json`. Copies are hash-verified; originals are never moved or deleted. Editing a suggestion clears its individual approval.

Rollback is available while the run remains in this browser session. It verifies each output's SHA-256 hash before deleting only unchanged generated copies. Changed outputs are retained. It retains the manifest and empty folders as recovery evidence. Reloading loses handle/state access: use the output manifest for manual recovery. Interrupted or failed writes can leave a partial/untracked output; inspect it manually rather than deleting it automatically. Filesystem writes are not transactional; external concurrent changes cannot be completely excluded.

## Limits

- 250 inventoried files; 12 subfolder levels; 20 MB per file; expanded Office archive ceiling 60 MB.
- At most 14,000 characters extracted per document; local inference receives at most 3,600 characters with representative beginning/middle/end excerpts when needed. Sampling is visibly flagged. PDFs: up to 35 pages. XLSX: up to five sheets and 100 rows per sheet. PPTX: up to 40 slides. Partial extraction is flagged.
- No OCR, encrypted document support, legacy DOC/XLS or automatic move/delete.
- PPTX extracts slide text, not images, notes, or charts. XLSX uses values/cached formula results and does not calculate formulas. Complex layouts can affect reading order.
- Sequential local inference; cancellation aborts the active request. Closing/reloading the page loses unsaved suggestions.
- AI can misinterpret documents. Suggested categories may need manual consolidation. Readiness is a point-in-time check.
- Guide history is in browser memory only and recent messages are resent for conversation continuity. Closing the Guide clears it.
- API limits are per process, reset on restart, and do not establish a provider billing guarantee. CORS does not stop non-browser abuse. Public deployment needs owner review of quotas, proxy behavior and exposure controls.

## Verification

```powershell
npm test
npm run build
npm run check:ollama
```

In development, Quick Guide → Developer verification → Run synthetic browser checks tests real OPFS copy/rollback and all fixture formats. This does not verify a native desktop folder permission dialog. Complete the native picker/manual checklist in `docs/TESTING.md` before public readiness.

Dependencies are bundled into the frontend; no remote scripts, fonts or analytics are used. Document libraries load only when needed. `npm audit --omit=dev` currently reports moderate transitive advisories in Mammoth's CLI dependency chain and ExcelJS's UUID dependency; no high/critical finding was reported during the initial implementation. See `docs/TESTING.md` for the assessment.

## Deployment boundary

No push or external deployment is part of local development. Existing repository/CNAME identity is preserved. Frontend build goes to `dist`; Guide runs separately on Node. See `docs/DEPLOYMENT.md` and the prepared `render.yaml`. Do not connect Mastra Platform, create Render services, modify DNS, enable billing or alter other projects without owner approval.

## Live website connection troubleshooting

If Check local AI reports a network failure on the public domain, see docs/HOSTED-LOCAL-AI-FIX.md. The inline Windows setup panel and public/connect-local-ai.cmd helper configure only the official website origin. Restart Ollama after the setting changes. Folder permission and local AI permission are independent.

## Document-only release

Supported: TXT, MD, CSV, DOCX, XLSX, PPTX and text-based PDF. JPG/JPEG/PNG images are not supported in this release; mixed folders retain them as unsupported, with originals preserved. Scanned PDFs without readable text are unsupported. Only qwen3:4b is required. No vision model or image analysis controls are included.
