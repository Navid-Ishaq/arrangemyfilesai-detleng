import express from "express";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { answerSchema, chatSchema } from "./contracts";
export type Generate = (
  message: string,
  context?: { stage: string; error: string },
  history?: { role: "user" | "assistant"; content: string }[],
) => Promise<unknown>;
export function createApp(
  generate: Generate,
  configured = Boolean(process.env.GROQ_API_KEY),
) {
  const app = express();
  app.disable("x-powered-by");
  const origins = (
    process.env.ALLOWED_ORIGINS || "http://127.0.0.1:5173,http://localhost:5173"
  )
    .split(",")
    .map((s) => s.trim());
  app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const origin = req.headers.origin;
    if (origin && !origins.includes(origin)) {
      res.status(403).json({ error: "Origin is not allowed." });
      return;
    }
    next();
  });
  app.use(
    cors({
      origin: origins,
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type"],
    }),
  );
  app.use(express.json({ limit: "32kb" }));
  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      guide: configured ? "configured-unverified" : "not-configured",
    });
  });
  app.use(
    "/api/guide",
    rateLimit({
      windowMs: 60000,
      limit: Number(process.env.GUIDE_MAX_REQUESTS_PER_MINUTE) || 8,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        error: "Please wait a minute before sending another message.",
      },
    }),
  );
  let day = new Date().toISOString().slice(0, 10),
    used = 0,
    active = 0;
  app.post("/api/guide", async (req, res) => {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Send a message and optional stage/error codes only." });
      return;
    }
    if (!configured) {
      res
        .status(503)
        .json({
          error:
            "The online Guide is not configured. Local organization and the Quick Guide remain available.",
        });
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (today !== day) {
      day = today;
      used = 0;
    }
    if (
      used >= (Number(process.env.GUIDE_MAX_REQUESTS_PER_DAY) || 100) ||
      active >= 2
    ) {
      res
        .status(429)
        .json({
          error:
            "Guide usage limit reached. Please use the Quick Guide or try later.",
        });
      return;
    }
    used++;
    active++;
    try {
      const result = answerSchema.parse(
        await generate(
          parsed.data.message,
          parsed.data.context,
          parsed.data.history,
        ),
      );
      res.json(result);
    } catch {
      res
        .status(502)
        .json({
          error:
            "The Guide could not respond. The provider may be unavailable or rate limited. Please retry later; local organization is still available.",
        });
    } finally {
      active--;
    }
  });
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res
        .status(
          (error as { type?: string }).type === "entity.too.large" ? 413 : 400,
        )
        .json({ error: "Request could not be accepted." });
    },
  );
  return app;
}
