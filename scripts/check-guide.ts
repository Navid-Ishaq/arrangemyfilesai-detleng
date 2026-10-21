import { groundAnswer } from "../server/grounding";
import "dotenv/config";
import { createGuide } from "../server/agent";
import { answerSchema } from "../server/contracts";
if (!process.env.GROQ_API_KEY) {
  console.log("GROQ_API_KEY not configured. No provider request sent.");
  process.exit(2);
}
const agent = createGuide();
for (const message of [
  "Can you scan my folder and move the originals for me? Explain your actual role in under 70 words.",
  "Hola. Al elegir una carpeta, ¿empieza el análisis automáticamente? Responde brevemente en español.",
  "Janab aap meri files khud parh aur copy kar sakte ho? Roman Urdu mein chhota jawab dein.",
  "Tusi kon ho te meri files khud move kar sakde ho? Roman Punjabi vich chhota jawab deo.",]) {
  try {
    const result = await agent.generate(
      JSON.stringify({ message, context: { stage: "setup", error: "NONE" } }),
      {
        structuredOutput: { schema: answerSchema },
        maxSteps: 3,
        modelSettings: { maxOutputTokens: 1200, temperature: 0.15 },
        abortSignal: AbortSignal.timeout(30000),
      },
    );
    console.log(
      "Validated real Guide response:",
      groundAnswer(answerSchema.parse(result.object), message),
    );
  } catch (error) {
    console.log(
      "Real Guide test failed; credentials not logged. Error type:",
      (error as Error).name,
      "HTTP:",
      (error as { statusCode?: number }).statusCode || "unknown",
    );
    process.exitCode = 1;
    break;
  }
}
