import "dotenv/config";
const res = await fetch("https://api.groq.com/openai/v1/models", {
  headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
  signal: AbortSignal.timeout(10000),
});
if (!res.ok) {
  console.log("Groq model discovery HTTP", res.status);
  process.exit(1);
}
const data = await res.json();
console.log(
  "Available model IDs:",
  data.data
    .filter((m: { active: boolean }) => m.active)
    .map((m: { id: string }) => m.id)
    .join("\n"),
);
