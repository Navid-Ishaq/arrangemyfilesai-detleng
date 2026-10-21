import { models, suggest } from "../src/ollama";
import { SYNTHETIC_VISION_IMAGE } from "../src/vision-probe";
const installed = await models();
console.log("Installed local models:", installed.map((m) => m.name).join(", "));
const vision = await suggest(
  "Synthetic printed page only. Give its visible topic as a concise filename and category.",
  undefined,
  SYNTHETIC_VISION_IMAGE,
);
console.log("Real synthetic vision response:", JSON.stringify(vision));
if (
  vision.needsReview ||
  !/project|planning|task|milestone|test/i.test(
    vision.title + " " + vision.reason,
  )
)
  throw new Error("Vision response did not identify the synthetic page");
const text = await suggest(
  "Synthetic project planning notes about tasks and milestones.",
);
console.log("Real synthetic text response:", JSON.stringify(text));
