# Deployment preparation — owner approval required

No deployment has been executed. Existing CNAME is preserved in both repository root and `public/CNAME` for the production bundle.

## Frontend: GitHub Pages

1. Review and approve the tested local source before committing/pushing.
2. Run `npm ci`, `npm test`, and `npm run build`.
3. The publish artifact is `dist/` (includes CNAME). The current branch-root Pages configuration will not build Vite automatically. After owner approval, change Pages to an appropriate Actions build/publish workflow or deliberately publish the built artifact through the owner's chosen process. Merely pushing the source is insufficient.
4. Set the public non-secret `VITE_GUIDE_API_URL` to the approved HTTPS backend origin before building. Without it, the Guide is unavailable; the organizer/demo still work. Never use a `VITE_` prefix for secrets.
5. Confirm the custom domain's HTTPS certificate and HTTPS enforcement before local folder testing. The previous screenshot showed HTTP; current HTTPS deployment remains unverified.
6. Verify actual hosted-origin CORS and browser Local Network Access permissions against local Ollama. Configure only the exact app origin in Ollama, and restart it. Localhost success does not prove hosted-origin connectivity.
7. Check navigation, assets, extraction worker, external links, and browser console in the deployed build.

The app uses in-memory page navigation, so static hosting does not require server rewrites. A refresh returns Home. All document dependencies are bundled locally.

## Guide backend: Render

Prepared name: `arrangemyfilesai-guide-api`. `render.yaml` describes a Node Web Service with auto deploys off, a free compute plan, health route, and secret placeholder. No service has been created. Schema validation is separate from Render platform validation.

Build: `npm ci --include=dev && npm run build`
Start: `npm start`
Health: `GET /health` (configuration status, not proof of inference)
Port: Render supplies `PORT`; production listens on `0.0.0.0`.

Secrets: `GROQ_API_KEY` server-side only. Non-secret settings: `GROQ_MODEL=openai/gpt-oss-20b`, exact `ALLOWED_ORIGINS`, request caps. Model was selected from the owner's live models API after the initially documented Llama ID returned unavailable. No automatic fallback or billing changes.

Before deployment, review whether the reserved service name already exists; do not attach this Blueprint to an unrelated service. Recheck free plan availability and limits. Do not purchase anything or accept paid upgrades automatically.

Current safeguards: 8 requests/minute per direct client IP, 100 requests/day globally per process, two active requests, 30-second inference timeout, strict body/context/action schemas, no server chat history, and disabled Mastra logging. Limits reset on process restart and are not shared across instances. CORS is a browser policy, not API authentication. Before a public rollout, confirm reverse proxy configuration, provider free-tier quotas, and an appropriate public abuse-control strategy with the owner. Do not treat request limits as a billing guarantee. The API never auto-upgrades or changes account limits.

## Mastra Platform — separate future connection

Project name: `Arrange My Files AI Guide`
Agent ID: `detleng-ai-guide`
Local framework entry: `src/mastra/index.ts`
Agent instructions/tools: `server/agent.ts`

The existing local Guide runs Mastra directly inside Node; it does not require Mastra Platform. The owner may connect the repository/project only after approval. Review current Mastra Platform deployment conventions and environment settings at that time. Keep file access absent from agent tools and disable content tracing/persistence. Do not connect any existing Mastra project as a shortcut.

## Release gate

- Passing build, meaningful automated tests, real local Qwen and Groq responses.
- Native desktop folder read/write permission flow, approved copy, collision and rollback checks on synthetic disk folders.
- Hosted-origin Ollama secure-context/CORS/LNA validation.
- Provider quota/rate-limit behavior and public API protection review.
- No credentials in tracked files or browser bundle.
- Owner approval before push, Pages changes, Mastra Platform connection, Render service creation, DNS or billing actions.

References: [Render Blueprint specification](https://render.com/docs/blueprint-spec), [Render secrets](https://render.com/docs/configure-environment-variables), [Mastra agents](https://mastra.ai/docs/agents/overview), [Groq models](https://console.groq.com/docs/models), [Ollama FAQ](https://docs.ollama.com/faq).
