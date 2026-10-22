# Deployment of the deterministic organizer

Local changes are prepared and tested; pushing/publishing is left to the owner. No deployment is performed by the implementation task.

## Frontend

The existing .github/workflows/deploy.yml runs tests and production build on main pushes and publishes dist to GitHub Pages. It sets the public VITE_GUIDE_API_URL to the existing HTTPS Guide backend. CNAME is retained. Review tests/build and commit/push, then wait for the Actions deployment to turn green before Ctrl+F5. Refresh clears the current in-memory review.

Check hosted assets, parser worker and nested PDF worker loading, navigation, file/drop selection, planning, explicit approval and verified output. Native folder writing requires current desktop Chrome/Edge and a secure context. The organizer no longer contacts localhost/Ollama; no Local Network Access/model configuration is required.

## Optional Guide backend

Product instructions and curated help were updated to the new deterministic workflow. Redeploy the existing arrangemyfilesai-guide-api service after publishing the source so the live Guide stops recommending obsolete Ollama setup. Render/Groq/Mastra service configuration and credentials are unchanged.

Existing Render build: npm ci --include=dev && npm run build. Start: npm start. Health: /health (configuration status, not proof of a model reply). The server listens on Render's PORT.

GROQ_API_KEY remains server-only in Render. GROQ_MODEL and ALLOWED_ORIGINS retain their existing values. Never put secrets in VITE_ variables. No new API, account, paid upgrade or Mastra Platform project is required.

The organizer remains functional even if the optional Guide backend is unavailable or its free instance sleeps. Do not claim new deployment success before observing the deployed release.
