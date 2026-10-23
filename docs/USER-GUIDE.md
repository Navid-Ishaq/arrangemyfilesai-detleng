# Organize a complete batch

## Add input

Drop several files/folders together. Alternatively Add files supports multiple files; Add folder opens the browser's one-folder picker and can be repeated. New input adds to the batch, rather than replacing it. Re-dropping the same unchanged file handle is ignored. Identical filenames from distinct input locations remain distinct. Clear / replace batch requires confirmation and never deletes original/saved output files.

Scan progress reports files found. The drop box shows the 1,000 combined-file / 12-level limits and the separate 20 MB analysis limit. A denied folder or limit produces an incomplete-scan list. Unknown contents cannot be counted as copied. Fix the input or explicitly acknowledge copying only known files. An unreadable known file appears under Unreadable and receives a failed result if it cannot be copied.

## Build and review

Build organization plan reads supported document evidence locally. Good descriptive names remain. Ambiguous titles or categories do not disappear: they retain original names/subfolders under Needs Review. Images and other unsupported readers have no content analysis, but their unchanged bytes can be copied to Needs Review.

All files are included by default. The checkbox means **include in output**, not **accept the suggested category**. Uncheck only to deliberately exclude a file. To accept an uncertain suggestion, open its proposed-name details and choose Accept this category plan. Keep original in Needs Review routes it to the review folder while preserving inclusion. Editing a name/category is a manual accepted plan. Unsupported formats cannot be made analyzable by ticking a box.

The count buttons filter views only. Before copying, To organize means proposed category destinations. After copying, Organized and Needs Review mean successful copies in those outcomes. Failed shows copy/read errors. Pending/other means no successful final copy outcome yet (including rolled-back/changed records). No files in a filtered view is explicitly explained.

Rebuild names and folders uses the Folder rules currently shown above. It resets manual name/category choices and re-plans included files; exclusion choices remain. It does not change originals. Editing rules is optional; rebuilding without changing them is normally unnecessary.

## Copy complete output

Example: 131 input files with 83 clear category plans and 48 uncertain/unsupported files means Copy all 131 files creates:

```
New output session/
  Study & Learning/...
  Finance/...
  Other category folders/...
  Needs Review/<original input paths>/...
  operation-manifest.json
```

If you deliberately exclude 5 files, only 126 are copied; 5 are listed as excluded. Same output names receive unique numbered suffixes. The displayed destination is authoritative. Empty directories are not recreated. Original files are never moved or deleted.

## Verify and audit

Every successful copy is reopened and its SHA-256 compared to original snapshot bytes. Recheck saved copies reads outputs again, reporting verified, missing, changed or unreadable. This verifies bytes, not classification correctness. Count cards provide quick views; Show copy or recheck issues only filters failures/pending/integrity issues without deleting anything. No issues displays an explicit message.

The CSV is an audit table, not a backup. It lists Source, Destination, Copy status, SHA-256, Recheck, Error, Outcome and Reason, plus excluded records. The JSON manifest stores the machine-readable plan/results and scan issues, updated after each recorded outcome.

After a refresh, open the session folder containing operation-manifest.json using Open saved output folder. JSON-only view can display historical records, but requires the output folder to recheck actual files. File access or moved folders may require choosing the location again.

## Incomplete runs

202 included with 72 recorded copies and 130 pending is incomplete even with zero recorded failures. Manifest-write interruptions stop copying; a file written immediately before the interruption may exist without a saved record. Keep outputs and inspect the report. No automatic resume is available. A successful known-file copy does not mean complete input when the scan has unscanned locations.

Rollback is available for the current open copy session. It checks hashes before deleting generated copies and retains modified outputs. Original files are unaffected. Read-only saved-report viewing after reload does not restore rollback.
