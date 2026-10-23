# Testing the deterministic organizer

Run npm.cmd test and npm.cmd run build. See RELEASE-ACCEPTANCE.md for the contract and PERFORMANCE.md for recorded 100/500-file planning and verified-copy timings.

Development browser checks use origin-private synthetic storage only. The 100/500-file benchmark exercises real reader workers and copy/manifest/hash verification. Tests also cover individual-file snapshot copying, directory overlap, changed sources, conflicting destinations, reserved names, unsupported images, cancel/deadline behavior and modified-output rollback protection.

## Native desktop acceptance still required

Use generated synthetic work/fixtures and separate work/output in Chrome/Edge. Drop/select files, build a plan without Ollama, edit a title, verify approval resets, create a conflict and confirm copy is blocked, then approve valid rows and verify category folders and manifest. Deny/cancel folder permission to test recovery. Change a source after inventory and confirm folder-mode copy rejects it. Test rollback only on generated copies; a modified output must remain. Reload should never resume an operation automatically.

Do not test on the owner's Coursera backup or private assignments. Private archive suitability, non-Latin complex title extraction, scanned/encrypted inputs and slow native/network storage need separate owner/beta validation. Existing browser-private benchmark performance is not a native disk benchmark.

Optional Guide smoke tests use synthetic questions and provider quota; no new live Guide test/deployment was performed for this core-engine change. Updated product instructions require backend redeployment.

### Bulk-copy regression
- Collision test: 273 colliding names plus an existing `(2)` destination; keep approvals, preserve originals, produce unique destinations and remain idempotent.
- Recheck test: read actual copied bytes, then inject changed and missing outputs and verify detection; keep unselected inventory in the manifest.
- Dev Quick Guide: **Run copy checker regression** writes three synthetic outputs to browser-owned storage and displays the production checker. Click **Recheck saved copies**, inspect search/results and download the CSV. This does not test native Windows output-folder permissions.

### Interrupted copy visibility
- Import a saved 202-plan / 72-result manifest: show **Incomplete**, 72 recorded verified copies, 130 pending/not recorded, even with zero failures.
- Inject report-write failure after writing an output: retain the last persisted manifest and output handle; do not count unrecorded output as confirmed.
- Reject malformed manifests, path traversal and unmatched results.
- Open a JSON-only report after reload; require selecting the actual output folder for hash recheck. This adds reporting, not automatic resume.
