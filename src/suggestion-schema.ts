import { z } from "zod";
export const suggestionSchema = z
  .object({
    title: z.string().min(1).max(120),
    category: z.string().min(1).max(90),
    subcategory: z.string().max(90),
    reason: z.string().min(1).max(500),
    needsReview: z.boolean(),
  })
  .strict();
