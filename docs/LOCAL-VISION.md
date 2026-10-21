# Local image support and workflow progress

- Text documents remain on qwen3:4b. JPG/JPEG/PNG use qwen3-vl:4b over the fixed http://127.0.0.1:11434/api/chat endpoint only.
- Browser validates extension, magic bytes, actual decoding, 20 MB input limit and 24 megapixel decoded limit. Private images are not passed to the cloud Guide.
- Text inference is verified during connection. Vision installation is detected during connection, but real vision verification happens only after a successful user-triggered image analysis. Missing/failed vision does not disable text. Restart Connection rechecks API/models/inference only; no OS/service restart.
- Image failure, ambiguity or invalid model JSON produces no new suggestion; previous approval and stale suggestion are cleared on analysis.
- Existing explicit approval, separate output, hash verification and copy-only protections apply to image bytes too. The original image is copied byte-for-byte with a proposed filename; no image conversion is written to disk.
- Review step completes when at least one valid proposed change is approved, or a manifest contains a verified copied result. Empty/failed/rolled-back-only manifests do not complete it. Copy progress also requires a copied result.
- Tests use memory-only filesystem handles. No new native copy operation was run for this patch.

Verification commands:

    npm.cmd test
    npm.cmd run build
    npx.cmd tsx scripts/check-vision.ts

The last command sends only an embedded synthetic printed page and synthetic text to local Ollama. It never reads user folders. Vision interpretation remains fallible; review every proposal. OCR quality is not guaranteed, and PDFs still use their existing extraction path (no scanned-PDF conversion added).

No automatic deployment. Cloud Guide, GroqCloud, Render and Mastra configuration are unchanged by this patch.

API reference: https://docs.ollama.com/capabilities/vision . The installed model emitted reasoning despite think:false during the first synthetic test; responses without complete valid final JSON are rejected. No reasoning text is used as a filename suggestion.

Automated verification: 65 tests passed, including regression coverage for review progress, invalid and oversized images, missing/failed models, truncated replies, local-only routing, extension preservation, and in-memory JPG/JPEG/PNG copy checks. Production build passed. Native real-file copying was deliberately not rerun. Browser connection labels were visually checked locally. Real synthetic model compatibility is tested separately by scripts/check-vision.ts; installation alone is not proof of inference readiness.

Real vision smoke test PASS: qwen3-vl:4b returned title synthetic_test_page, category project_management, and a reason grounded in the visible printed project-planning/tasks/milestones page (needsReview=false). The image-only assistant prefill closes the reasoning turn, addressing the installed model's ignored think:false toggle without changing models or services. Real-world photographs, handwriting and difficult scans still require owner review; the smoke test is not a guarantee of recognition quality.

Real text regression smoke test PASS: qwen3:4b returned Synthetic Project Planning Notes with a valid category and needsReview=false. Final production build passed. Browser-selected image to editable review remains a manual acceptance check; no native output/copy operation was run.

Performance correction: connection no longer runs an extra vision inference or loads the image model solely for setup. Image inference itself may still be slow on CPU; no latency improvement is claimed without a fresh browser timing. Tests: 68 passed; production build passed.
