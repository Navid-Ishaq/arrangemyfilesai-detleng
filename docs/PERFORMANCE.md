# Local performance patch — 22 October 2026

## Changes

- Connect/Restart Connection checks service and model availability only. No model is loaded just to connect. Installed models are not presented as inference verified; the first successful real analysis sets that badge.
- Balanced image mode downsamples analysis-only previews to a maximum 1536-pixel long edge (JPEG quality 0.9). Original file bytes and the copy pipeline are unchanged. Full-detail mode bypasses resampling; the explicit full-detail reanalysis action resets approvals only on the images being reprocessed.
- Pending work is grouped by model, reducing unnecessary swaps. Requests remain sequential to avoid resource contention.
- Successful reviewed entries are skipped during ordinary retries, preserving owner edits and approvals. Failed/unprocessed files are retried.
- SHA-256 content keys reuse successful results for identical files in the current inventory. Cache includes extension, model and detail policy; at most 64 result entries; no raw documents/images or results are persisted. Cache clears on a new folder/file selection. Failures are never cached. Identical suggestions can still conflict at copy time; existing validation still blocks overwrites.
- Processing panel shows elapsed time, current stage/file, processed/failed/reused counts, actual file-count progress and cancellation. No made-up remaining-time countdown.
- Optional benchmark captures Ollama model-load, input evaluation and output generation timings without private file contents.

## Verified results

1. Warm-model local text benchmark: six synthetic TXT files containing two unique contents. Baseline: 27,740 ms / six inference calls. Optimized: 11,420 ms / two calls / four reuses. Each phase has an excluded warm-up. This is a duplicate-work benchmark, not a guarantee for six unique scans.
2. Browser connection button action plus resulting accessibility observation: 535 ms, with models detected and inference explicitly still unverified. This is one observation, not a network latency SLA.
3. Browser built-in text fixtures: 22 seconds, four suggestions and one correctly flagged empty file. Edited title and approval survived failed-only retry; retry did not reprocess successful entries.
4. Browser mixed synthetic batch: three byte-identical 2048x1024 printed-page PNGs and three identical TXT notes. 104 seconds; six valid suggestions; zero failures; four reused results. Balanced preview correctly identified PROJECT PLANNING NOTES and category Project Management. This includes model loading/switching and must not be compared as an identical workload to the owner's earlier 7–8 minute run.
5. Clicking Analyze again after all six succeeded caused no new analysis; existing results were retained.
6. No real user documents or native copy/output operations were used. Cloud Guide, GroqCloud, Render and Mastra were not changed. No push or deployment performed.

## Reproduce

    npm.cmd test
    npm.cmd run build
    npx.cmd tsx scripts/benchmark-performance.ts

Benchmark uses only generated synthetic text and local Ollama. JSON timing report is in ignored work/benchmarks/performance.json. Synthetic browser fixtures are under ignored work/benchmarks/performance-fixtures. Do not commit work/ or .env.

## Limits

Unique detailed scans still require expensive local vision inference. Downsampling can obscure fine print: use Full-detail images when needed and review every proposal. Recognition is not guaranteed. Cache is exact-byte based and does not treat differently compressed copies as duplicates. Performance depends on hardware, model load and document resolution. ETA prediction, persistent caching, approximate deduplication, new models, GPU configuration and cloud file processing were deliberately not introduced.
