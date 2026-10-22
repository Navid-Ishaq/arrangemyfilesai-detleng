// Bounded representative excerpts: never silently treat a sample as a full read.
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
  if (clean.length <= ANALYSIS_CHAR_LIMIT)
    return { text: clean, sampled: false };
  const first = clean.slice(0, 1800);
  const middle = clean.slice(
    Math.floor(clean.length / 2) - 450,
    Math.floor(clean.length / 2) + 450,
  );
  const end = clean.slice(-800);
  return {
    text: `${first}\n[Middle excerpt]\n${middle}\n[End excerpt]\n${end}`,
    sampled: true,
  };
}
