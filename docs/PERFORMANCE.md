# Document-only release performance

Connection checks local API/model availability without loading a model. Real inference is verified by the first successful document analysis.

Successful reviewed suggestions are retained when retrying. SHA-256 caching reuses exact duplicate document results within the current inventory (64 results maximum, memory only). Failures are not cached; new folder selection clears the cache.

The progress panel shows measured elapsed time, current stage and processed/reused counts. It does not promise an ETA. Cancellation aborts the active request.

A prior controlled warm text benchmark with six files / two unique contents measured 27.7 seconds without reuse versus 11.4 seconds with reuse. This is not a guarantee for unique documents or other hardware.

JPG, JPEG and PNG analysis was removed following owner acceptance testing: a five-file mixed workload took 613 seconds. Vision is outside this release scope. No private file data is sent to cloud AI for organization.
