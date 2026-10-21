import "dotenv/config";
import { createMastra } from "../../server/agent";
// Local framework entry point. No Mastra Platform connection is created.
export const mastra = createMastra();
