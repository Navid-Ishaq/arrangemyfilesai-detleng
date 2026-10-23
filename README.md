# Arrange My Files AI by DeTLeng

A private local organizer for desktop Chrome/Edge. No Ollama, Qwen, AI account or model download is required. Local readers and literal folder rules build a complete output plan. The cloud AI Guide is separate optional help.

## Complete-batch workflow

1. **Drop multiple files or folders**, or choose **Add files** / **Add folder**. Additions accumulate and preserve existing edits/exclusions. The browser folder picker selects one folder at a time; use it repeatedly. Clear / replace batch is explicit.
2. **Build organization plan.** Every inventoried file is included by default. Useful filenames stay; title metadata/headings/opening text can replace generic names. Keyword rules suggest categories.
3. Review clickable **Total / To organize / Needs Review / Excluded / Unreadable** counts. These filter the view; they never change inclusion. Uncheck only to deliberately exclude a file. Accept a warned category plan explicitly, or keep the original in Needs Review.
4. **Copy all N files** shows category-plan and Needs Review counts before writing to a separate output folder. Clear/accepted plans go into category folders. Uncertain, unsupported or unaccepted plans copy unchanged into **Needs Review**, keeping source-relative names/subfolders. Duplicate output paths receive numbered suffixes. Excluded files are not copied.
5. Results distinguish **Organized / Needs Review / Excluded / Failed / Pending**. Copies are reopened and SHA-256 verified. Recheck reads the actual saved bytes again. CSV includes original source, output destination, copy status, hash, recheck, outcome and reason. A JSON manifest is saved after every result.

A successful 83-organized + 48-review batch means **all 131 included files were copied**, not just 83. File bytes and originals remain unchanged. Verification confirms byte integrity, not category accuracy.

## Limits and scan completeness

- **1,000 combined input files**, **12 nested folder levels**. Limits are visible at the drop box.
- **20 MB per file for content analysis**, not a ban on copying larger readable files. Larger/unsupported readable files copy unchanged into Needs Review. Large-file verification streams chunks to avoid whole-file hash allocation; time/storage still depend on file sizes and disk performance.
- Supported readers: TXT, MD, CSV, DOCX, text PDF, XLSX, PPTX. Image analysis, scanned-PDF OCR, encrypted/legacy DOC/XLS reading are unsupported. Such files can still be copied unchanged to Needs Review if readable.
- PDF first 2 pages; Word opening paragraphs (no reliable pagination); first 4 slides; first 2 workbook sheets / 12 rows. Rules inspect at most 3,600 characters after bounded extraction. Office archive expansion ceiling: 60 MB.
- Unreadable individual files remain accounted for and fail explicitly if copying cannot read them. Inaccessible folders/limit truncation are listed as **unscanned**: unknown contents are not claimed as inventoried or copied. Copying the known subset requires explicit acknowledgement. This is not a complete-input success.
- Empty directories are not reproduced; this release organizes files. Native destination path/filesystem restrictions can still cause explicit failures.

## Safety and recovery

Planning never writes originals. Output must be separate from every known source folder and its parents/subfolders. Source handles are retained across multi-folder additions, reopened and compared to scanned snapshots before copying. Individual file-picker selections use their File snapshots. Existing outputs are never intentionally overwritten; each run gets a unique session folder.

Unreadable sources/copy errors are recorded per file and healthy files continue. If manifest persistence fails, copying stops, retains the last saved report and shows **Incomplete**, including pending/unrecorded counts. A file written just before interruption may exist without a recorded result. Do not treat zero failures as completion while pending or unscanned content remains.

After refresh: **Check an existing copy session → Open saved output folder** loads the report for read-only inspection and rechecking bytes. Opening operation-manifest.json alone shows recorded results only. No automatic resume or retry into an existing session is implemented. Rollback in the current open session removes only unchanged generated copies; modified outputs and originals remain. Saved reports do not restore rollback write access after reload.

## Run and verify

Requires Node.js 24. Use trusted localhost or HTTPS and current desktop Chrome/Edge.

```powershell
npm.cmd ci
npm.cmd run dev
npm.cmd test
npm.cmd run build
```

Development Quick Guide exposes synthetic acceptance tools excluded from production: 100/500 mixed-format benchmark and **Run complete 131-file workflow** (two synthetic source folders, actual local planning, production copy, recheck, original retention). It writes browser-owned OPFS only. See [User guide](docs/USER-GUIDE.md), [testing](docs/TESTING.md) and [performance](docs/PERFORMANCE.md). Generated fixture performance is not a guarantee for private archives, physical disks or network drives.

## Optional cloud Guide

`npm.cmd run dev:api` starts online help. Keep existing GROQ_API_KEY in ignored .env private; frontend uses VITE_GUIDE_API_URL. Render/Groq/Mastra configuration is unchanged. Updated Guide product instructions need the existing backend redeployed after source push. Only chat text, bounded history and opt-in stage/error enums reach the Guide; no filenames, paths, inventory or document content are attached automatically.
