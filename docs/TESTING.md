# Verification record and manual checklist

## Initial implementation, 21 October 2026

- TypeScript and production Vite build pass.
- 25 automated tests cover reserved names, unsafe path characters, extension preservation, case-insensitive collisions, approval enforcement, malformed model responses, cloud context allowlist, malicious origins, invalid UI actions, missing key behavior, request limits, source changes, copy hashing, nested-output rejection, nested inventory, and rollback preservation.
- Real loopback Ollama API reports `qwen3:4b` installed. Actual structured inference passed both CLI and browser readiness checks. A synthetic Python course note produced `Python Data Wrangling with Pandas`.
- Real browser sandbox (OPFS) inventory, copy, SHA-256 verification, manifest write, rollback and original preservation passed. This uses genuine browser file handles, but does not cover the native directory permission dialog.
- Browser extraction passed synthetic DOCX, text PDF, XLSX, PPTX, CSV and Markdown. Empty PDF correctly flagged OCR_REQUIRED.
- Groq credentials configured privately by the owner. Live model discovery passed. Initial `llama-3.3-70b-versatile` request returned model unavailable; `openai/gpt-oss-20b` produced real schema-validated Guide responses through Mastra. Quality checks identified invented UI wording and wrong language script; instructions were tightened. Final bounded English and Roman Urdu inference tests passed, and a browser Guide response with opt-in stage/error context also passed. Model responses remain advisory, not authoritative.

## Run checks

```powershell
npm test
npm run build
npm run fixtures
npm run check:ollama
npx tsx scripts/check-guide.ts
```

Guide tests are opt-in and send synthetic help questions to Groq. They consume provider quota. Never test with owner documents or secrets as prompts. Do not repeat tests aggressively after a rate-limit response.

In the development browser: Quick Guide → Developer verification → Run synthetic browser checks. Fixtures are served only by Vite's development middleware, restricted to the synthetic fixture directory. The test component is eliminated from the production build.

## Required native desktop manual test

The browser automation available in this session cannot operate the Windows native directory-picker dialog. Complete this flow on Chrome/Edge:

1. Generate fixtures and open the app.
2. Check local AI. Confirm all three conditions pass.
3. Choose `work/fixtures`, granting read access only. Confirm nested inventory and unsupported/empty files.
4. Analyze locally. Review names and reasons. No output should exist yet.
5. Change a proposed filename and verify its approval clears. Select two conflicting destinations and verify copy is blocked.
6. Reject the unsupported/empty files. Approve a small set.
7. Select separate `work/output`, grant write permission, and confirm copying.
8. Verify output bytes match source hashes, originals remain, and the local manifest records planned/results data.
9. Modify one generated copy manually. Roll back: unchanged generated copies should be removed; edited copy preserved. Source remains untouched.
10. Cancel directory selection and deny permissions; verify helpful recovery without file changes.
11. Change a source after scanning and confirm copying detects the change.
12. Reload mid-session; verify no automatic operation resumes. Inspect saved manifest for recovery.

Do not use the protected Coursera backup directory.

## Dependency advisory assessment

`npm audit --omit=dev` reports moderate transitive advisories in `sprintf-js` through Mammoth's CLI argument parser and in ExcelJS's old UUID library. No high/critical findings appeared in the initial audit. The app uses Mammoth's browser entry, not its CLI. ExcelJS's identified UUID call is UUID v4 for conditional-formatting writing; the advisory concerns v3/v5/v6 with a supplied buffer. Spreadsheet parsing does not call this operation. These findings are recorded rather than applying npm's suggested breaking downgrades. Recheck upstream fixes before public release.

## Remaining release verification

Desktop (1280px) and mobile (390px) layout bounds showed no horizontal overflow. Mobile navigation, demo selection/rejection, Family Next and arbitrary-order navigation, and review approval reset were checked in the browser. Native picker permission flow, production-hosted HTTPS → local Ollama, real provider quota exhaustion, a full assistive-technology audit, hosted API proxy/abuse protection and public deployment smoke tests remain separate release checks. Code existence or a provider account never establishes public availability.
