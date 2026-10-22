// Quick naming uses opening content only; this is not a full-document analysis.
export const ANALYSIS_CHAR_LIMIT = 3600;
export function documentSample(text: string): {
  text: string;
  sampled: boolean;
} {
  const clean = text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return {
    text: clean.slice(0, ANALYSIS_CHAR_LIMIT),
    sampled: clean.length > ANALYSIS_CHAR_LIMIT,
  };
}
