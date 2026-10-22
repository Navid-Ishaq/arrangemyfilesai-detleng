# Product privacy boundaries

Document organization runs in local browser code and a parser worker. It uses selected filenames, document metadata/headings/opening content and literal keyword rules. No Ollama, local model, AI inference endpoint or cloud document fallback is used. Current inventory/review/cache stays in memory. Folder rules can be explicitly saved on this browser in localStorage; no document data is saved there. Restore default rules removes this local rule configuration. Development checks write only synthetic browser-owned OPFS data.

The optional online GroqCloud Guide receives user-written chat, bounded recent chat history and explicitly opted-in stage/error enums. No filenames, paths, inventories, extracted text, file handles or raw diagnostics are automatically attached. Users should not paste private information into chat. Free text cannot be perfectly sanitized.

The Guide backend uses Mastra with logging disabled. There is no chat database, document upload route or filesystem tool. Guide navigation suggestions cannot authorize file operations, and Guide failure never blocks organization.

Only approved copies are written to a separately selected output session. Source documents are never intentionally changed. The local manifest contains relative paths and hashes; treat it as private. Rollback verifies outputs before removing only unchanged generated copies. Reload loses in-memory handles and edits; the output manifest remains on disk for manual recovery.

App assets/readers/fonts are bundled locally. External ecosystem links open when clicked. No analytics or remote-font dependency is included. Network requests needed to load the website/assets are distinct from optional online Guide chat.
