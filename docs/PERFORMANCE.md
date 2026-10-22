# Deterministic organizer performance — 22 October 2026

The organizer no longer calls a language model. It preserves descriptive filenames, extracts title/heading/opening evidence for generic names, and applies literal keyword rules. The online Guide is independent help only.

## Final measured browser run

| Synthetic batch | Organization plan | Copy + verification + read-back | Verified | Failed |
|---|---:|---:|---:|---:|
| 100 varied files | 2.143 s | 5.171 s | 100 | 0 |
| 500 varied files | 6.506 s | 21.783 s | 500 | 0 |

Both batches contained unique TXT, MD, CSV, DOCX, PDF, XLSX and PPTX files. Names/content varied; file generation was excluded from timing. Known titles and categories matched expected results in every generated fixture. This is **not** a real-world accuracy rate: fixtures deliberately contain clear title evidence and known keyword rules. No AI requests occurred. The same browser/parser worker may have warmed caches between batches.

Planning used the actual browser worker and production readers. Copying used the production copyApproved implementation to write actual files and operation manifests in browser-owned OPFS. Each copy was SHA-256 verified and reopened to confirm presence/size. Native destination-picker permissions, physical disk/NAS/cloud-sync performance, full review-list rendering overhead and arbitrary private archives are not represented by these timings.

An earlier run of the same controlled suite measured 6.350 s / 7.414 s for planning; 100 verified copies took 6.195 s. Report the final recorded complete run above, not a universal latency promise. Timing evidence is saved in the task outputs as deterministic-benchmark.txt and deterministic-benchmark.png.

## Boundaries and protections

- Up to 1,000 files, 12 nested levels, 20 MB per file and 60 MB expanded Office limit.
- No AI setup/loading/inference delay. Filename rules can avoid content reading altogether.
- PDF first 2 pages; Word title metadata/styled headings/opening text; slides first 4; workbooks first 2 sheets and 12 rows. At most 3,600 opening characters for keyword decisions.
- One parser worker is reused. The 8-second file deadline terminates the worker; the next file starts a new worker. Cancellation terminates current parsing. Unit tests inject a stuck worker and verify deadline/recovery.
- The snapshot cache is inventory-scoped and includes filename and rule policy. Unlike old AI inference caching, separate files are not assumed to share a title merely because their bytes match.
- Unknown/corrupt documents keep original names with visible review warnings. Images remain unsupported. Rules do not provide semantic understanding or OCR.
- Copy/rollback tests cover source changes, approval, path safety, conflicts and retaining modified outputs. A hash-verified copy is the success criterion, not a confirmation dialog.

## Reproduce

Run npm.cmd run dev, open the local site, choose Quick Guide and Run organizer benchmark (development only). This creates synthetic browser-private storage, not files in the owner's folders. Run npm.cmd test and npm.cmd run build for automated regression/build checks.

Next acceptance work: owner-selected representative archives and native disk destinations, plus beta usability testing. Persistent session recovery, desktop packaging and broader content recognition are not implemented claims.
