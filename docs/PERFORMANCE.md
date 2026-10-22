# Document-only release performance

Connection checks local API/model availability without loading a model. Real inference is verified by the first successful document analysis.

Successful reviewed suggestions are retained when retrying. SHA-256 caching reuses exact duplicate document results within the current inventory (64 results maximum, memory only). Failures are not cached; new folder selection clears the cache.

The progress panel shows measured elapsed time, current stage and processed/reused counts. It does not promise an ETA. Cancellation aborts the active request.

A prior controlled warm text benchmark with six files / two unique contents measured 27.7 seconds without reuse versus 11.4 seconds with reuse. This is not a guarantee for unique documents or other hardware.

JPG, JPEG and PNG analysis was removed following owner acceptance testing: a five-file mixed workload took 613 seconds. Vision is outside this release scope. No private file data is sent to cloud AI for organization.

## Long-document and copy correction

Owner acceptance: five real Word documents took 475 seconds versus 43 seconds for twelve small fixture entries. File size on disk is not the amount of extracted text. Long inputs reached the previous 14,000-character inference limit; fixtures did not represent that workload.

Analysis now samples at most 3,600 characters from the beginning, middle and end of the extracted text. Context is 4,096 tokens and output budget 220 tokens with a concise reason. Sampled documents retain a visible warning and require individual review; the app does not claim a full-document analysis.

Step 1 now completes on confirmed service/model availability. Inference verification remains separately displayed after an actual successful request.

The old individual-file picker was preview-only (no source directory handle), which disabled copying. Individual selections now support hash-verified copies of the selected File snapshots into a fresh output session. Folder selections still reopen and revalidate source files and reject overlapping output folders. Browser output-directory support is required. Original files are never overwritten.

Copy errors now include the actual failure message and the finished notice gives verified/failed counts and output session location. A confirmation dialog alone is never reported as success. Owner screenshots of the Word batch show zero approvals; the bulk safe-selection action intentionally skips sampled files. New guidance explains individual approval. The precise cause of the owner's earlier unsuccessful copy is not established without its failure result.

Measured synthetic local run (same concise output/context settings): 14,000 characters took 115.0 s (97.9 s prompt evaluation, 5.9 s model loading); the 3,533-character excerpt took 17.2 s (10.5 s prompt evaluation, model already loaded). Both returned Project Planning Training Assignment / Education. Cold/warm differences are included; this is not a controlled speed guarantee for private files. Ollama reported size_vram=0 in this check. Browser connection step became rail-step done immediately on availability; dropdown synthetic selection was exercised successfully.
