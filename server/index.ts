import "dotenv/config";
import { createApp } from "./app";
import { createGuide } from "./agent";
import { answerSchema } from "./contracts";
let agent: ReturnType<typeof createGuide> | undefined;
const app = createApp(async (message, context, history) => {
  agent ||= createGuide();
  const result = await agent.generate(
    JSON.stringify({ message, context, history }),
    {
      structuredOutput: { schema: answerSchema },
      maxSteps: 3,
      modelSettings: { maxOutputTokens: 1200, temperature: 0.15 },
      abortSignal: AbortSignal.timeout(30000),
    },
  );
  return result.object;
});
const port = Number(process.env.PORT) || 3001;
const server = app.listen(
  port,
  process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1",
  () =>
    console.log(
      `DeTLeng Guide API listening on port ${port}. Credentials and chat content are not logged.`,
    ),
);
process.on("SIGTERM", () => server.close(() => process.exit(0)));
