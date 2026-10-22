import { planDocument } from "./planner";
self.onmessage = async (event: MessageEvent) => {
  if (event.data?.type !== "amf-plan") return;
  try {
    self.postMessage({
      type: "amf-plan",
      value: await planDocument(event.data.file, event.data.rules),
    });
  } catch (error) {
    self.postMessage({
      type: "amf-plan",
      error: error instanceof Error ? error.message : "Planning failed",
    });
  }
};
