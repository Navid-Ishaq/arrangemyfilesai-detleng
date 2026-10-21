import "dotenv/config";
import { createGuide } from "../server/agent";
import { answerSchema } from "../server/contracts";
if (!process.env.GROQ_API_KEY) {
  console.log("GROQ_API_KEY not configured. No provider request sent.");
  process.exit(2);
}
const agent = createGuide();
for (const message of [
  "I am a beginner. Explain how to set up local AI for this organizer. Keep it under 90 words.",
  "Mere university notes aur training certificates ke liye simple folder strategy suggest karein. Never ask me to upload anything. Keep it under 90 words.",
]) {
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
      answerSchema.parse(result.object),
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
