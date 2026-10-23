# Arrange My Files AI by DeTLeng

A private, document-focused organizer for desktop Chrome/Edge. Organization uses local code: descriptive filenames, document titles/headings and editable folder rules. **No Ollama, Qwen, model download or AI connection is required.** The DeTLeng AI Guide is separate optional online help.

## Use

1. Drop files or a folder, or use Add documents.
2. Optionally edit and explicitly save Folder rules on this browser (`Folder: keyword, keyword`). Literal case-insensitive keyword matches are scored; most matches wins, and rule order resolves ties with a review warning.
3. Build organization plan. Useful names are preserved; generic names use available title/heading evidence. Rows explain the evidence used.
4. Review/edit and select approved rows. Conflicting destinations must be edited before copying. Rebuild all with current rules explicitly clears previous edits/approvals.
5. Choose output & copy. A separate unique output session contains category folders and operation-manifest.json. Copies are SHA-256 verified; originals are untouched.

## Run locally

Requires Node.js 24 and current desktop Chrome/Edge; HTTPS or trusted localhost for folder writing.

```powershell
npm.cmd ci
npm.cmd run dev
```

Open http://127.0.0.1:5173. For tests/build:

```powershell
npm.cmd test
npm.cmd run build
```

Optional synthetic fixture generation: `npm.cmd run fixtures`. Use the generated `work/fixtures` folder and separate `work/output`; never test on private backups. In development, Quick Guide exposes synthetic browser checks and the 100/500-file acceptance benchmark. The benchmark writes only browser-owned synthetic OPFS data, not personal folders. It is excluded from production UI.

## What the engine actually does

- Preserves descriptive filenames, including useful existing document names.
- Extracts Word title metadata / Title or Heading styles, PDF title metadata / opening text, workbook sheet names, slide titles and opening text lines for generic names.
- Rules classify filenames and bounded opening evidence; a clear filename rule skips unnecessary content reading.
- Unknown titles retain the original name with a review warning. This is deterministic evidence extraction, not semantic understanding of arbitrary documents.
- One reusable parser worker keeps the interface responsive. An 8-second reader deadline and cancellation terminate the worker; later files can continue. Cancellation cannot undo an already approved copy run.
- Inventory-scoped File snapshot caching avoids unnecessary re-reading. Rules and filenames are part of the cache key; no private results are persisted or sent to a model.

## Supported formats / limits

TXT, MD, CSV, DOCX, text-based PDF, XLSX and PPTX. Up to 1,000 inventoried files, 12 subfolder levels, 20 MB per file; expanded Office archive ceiling 60 MB. Content evidence is bounded to 3,600 opening characters after extraction (14,000-character extraction ceiling).

PDF: first 2 pages. Word: opening paragraphs and title/heading evidence; reliable page boundaries are unavailable. PPTX: first 4 slides. XLSX: first 2 sheets, up to 12 opening rows per sheet; formulas are not recalculated. ZIP-based Word/slide extraction skips unrelated payloads while checking expanded archive limits.

JPG/JPEG/PNG content recognition, scanned-PDF OCR, encrypted files and legacy DOC/XLS reading are not supported. Unreadable supported documents can retain their original names for manually reviewed organization by name/type. Images are shown as unsupported and are never analyzed or copied by the organizer.

Large documents, damaged containers and slow disks can take longer. Benchmark results are controlled examples, not performance guarantees or proof of naming accuracy on personal archives.

## Safety / recovery

Read permission and output writing are separate explicit actions. Folder mode rejects source/output overlap, reopens source files and checks for changes. Individual selections copy the selected File snapshots into a fresh session. Existing destination files are never intentionally overwritten. Conflicts block approval/copy.

The manifest records the plan and each completed/failed copy, including hashes. A manifest write failure stops the run. Rollback in the open session deletes only generated copies whose hashes still match; modified outputs and originals are retained. Reload loses in-memory handles, review edits and rollback access; the saved manifest supports manual recovery. Interrupted writes can leave partial outputs; filesystem writes are not transactional. Persistent session recovery and desktop packaging remain future work, not implemented claims.

## Optional AI Guide

Start `npm.cmd run dev:api` only if online help is wanted. Set GROQ_API_KEY privately in the ignored .env file; do not overwrite an existing .env. Production frontend uses VITE_GUIDE_API_URL. Render/Groq/Mastra account setup is unchanged. Updated Guide product facts require backend redeployment to reach the live Guide.

Only user chat text, bounded recent history and opt-in stage/error enums reach GroqCloud via the Node/Mastra backend. No document names, paths, inventory, handles, excerpts or files are automatically attached. Do not paste sensitive information into chat. The organizer works without the Guide/API.

## Architecture

`naming.ts` — deterministic title/category decisions and literal rule validation.
`extract.ts` — bounded local readers; no file upload.
`planner.ts` / `planner.worker.ts` / `planner-worker-client.ts` — planning and worker lifecycle/deadline.
`analysis-engine.ts` — inventory cache and orchestration; no AI dependencies.
`files.ts` / `domain.ts` — inventory, approval/path validation, verified copy and rollback.
`server/` — optional help-only cloud Guide, contracts, CORS and request/resource controls.

See docs/PERFORMANCE.md for measured results and benchmark limitations.

## Bulk copy conflicts and verification

If Copy is disabled after approval, the workspace shows the number of approved files with destination errors. Use **Show copy blockers** to filter them. **Make duplicate names unique** adds numbered suffixes to approved duplicates, reserving existing names; review the updated destinations before copying. **Deselect blocked files** allows a reviewed, valid subset to proceed. No overwrite protection is bypassed.

The output results show the chosen folder/session, selected count, verified copies and failures. **Copy checker** searches source-to-destination mappings. **Recheck saved copies** reopens output bytes and compares SHA-256 against the hashes recorded during copying; it reports verified, changed, missing or unreadable outputs. **Download copy report (CSV)** includes selected results, hashes, latest recheck statuses and inventoried files that were not selected. The JSON manifest is also saved in the output session. After a reload, use **Check an existing copy session → Open saved output folder** to load the saved manifest and recheck outputs. Opening the JSON alone shows recorded results without reading output bytes. Incomplete sessions show explicit pending/unrecorded counts; an unrecorded file may already exist if report persistence failed after a write. No automatic retry or resume is performed.
