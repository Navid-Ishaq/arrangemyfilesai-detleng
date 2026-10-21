# Product privacy boundaries

Document extraction and Qwen inference take place in the browser/loopback Ollama workflow. Contents are bounded and kept in runtime memory, not uploaded to the Guide. Application state is not saved to localStorage, IndexedDB, or a server. Browser handles/files remain governed by browser permissions. Development sandbox checks deliberately create synthetic data in origin-private browser storage.

GroqCloud Guide is optional and explicitly online. It receives user chat text, up to four bounded recent chat messages, and opt-in stage/error codes. Strict validation rejects additional context properties. Users must avoid placing private document content or secrets in their chat messages. There is no claim that free text can be perfectly sanitized.

Server uses no chat database, file tools, document routes, content logging or tracing. Mastra logging is disabled. No server-side folder reading or Ollama proxy is included. The backend has no document inventory connection. UI navigation recommendations use a strict enum and require a click in the client. They cannot authorize file operations.

Guide failure never blocks local analysis, authored help, the family tour, or the synthetic demo. API errors are returned as curated messages rather than raw provider responses.

Only approved file copies are written to a new session in a separately authorized output. Original files are never intentionally changed. Manifest includes relative source/destination paths and hashes, stored in the output directory and optionally downloaded by the user. Treat manifests as private local records.

Dependencies, fonts, and app assets are local to the build. External ecosystem and official-resource links open only when clicked. No analytics, remote font requests or cloud document fallback are included.
