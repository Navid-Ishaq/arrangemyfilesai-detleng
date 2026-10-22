import { extension, safeSegment, type Suggestion } from "./domain";
export type FolderRule = { category: string; keywords: string[] };
export const DEFAULT_RULES = `Study & Learning: study, lesson, lecture, course, assignment, workshop, learning, notes, education, training
Projects: project, milestone, roadmap, authentication, specification, architecture, deployment
Finance: invoice, receipt, budget, payment, expense, tax, salary
Administration: contract, agreement, application, policy, certificate
Data & Reports: report, analysis, dataset, metrics, statistics`;
export function parseRules(value: string): FolderRule[] {
  const lines = value
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length > 20) throw new Error("Use at most 20 folder rules.");
  return lines.map((line, index) => {
    const split = line.indexOf(":");
    if (split < 1)
      throw new Error(`Rule ${index + 1}: use Folder: keyword, keyword.`);
    const category = line.slice(0, split).trim();
    if (safeSegment(category) !== category || category.length > 60)
      throw new Error(
        `Rule ${index + 1}: use a valid folder name of at most 60 characters.`,
      );
    const keywords = line
      .slice(split + 1)
      .split(",")
      .map((s) => s.trim().toLocaleLowerCase())
      .filter(Boolean);
    if (
      !keywords.length ||
      keywords.length > 20 ||
      keywords.some((k) => k.length > 60)
    )
      throw new Error(
        `Rule ${index + 1}: use 1–20 keywords, each at most 60 characters.`,
      );
    return { category, keywords };
  });
}
export function meaningfulName(name: string): boolean {
  const stem = name.replace(/\.[^.]+$/, "").trim();
  const tokens = stem
    .toLowerCase()
    .split(/[\s_().-]+/)
    .filter(Boolean);
  if (
    tokens.every((token) =>
      /^(?:document|doc|scan|file|untitled|final|notes?|copy|report|presentation|book|sheet|img|image|v\d+|\d+)$/.test(
        token,
      ),
    )
  )
    return false;
  return (
    /\p{L}/u.test(stem) &&
    !/^(?:\d+|(?:document|doc|scan|file|untitled|final|notes?|copy|report|presentation|book|sheet|img|image)[\s_()\-\d.]*)$/i.test(
      stem,
    )
  );
}
function usefulTitle(value: string): string | undefined {
  const clean = value
    .replace(/^[#\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length < 5 || clean.length > 110 || !/\p{L}/u.test(clean)) return;
  if (
    /^(?:untitled|document\d*|microsoft word|page \d+|table of contents|contents|sheet\d*)$/i.test(
      clean,
    )
  )
    return;
  if (/https?:|@|[.!?]\s+\p{L}|^[=\-]+$/u.test(clean)) return;
  return clean;
}
export function propose(
  name: string,
  text: string,
  hints: string[],
  rules: FolderRule[],
): Suggestion {
  const preserve = meaningfulName(name);
  const heading = hints.map(usefulTitle).find(Boolean);
  const opening = text
    .split(/\r?\n/)
    .slice(0, 16)
    .map(usefulTitle)
    .find(Boolean);
  const title = preserve
    ? name.replace(/\.[^.]+$/, "")
    : heading || opening || name.replace(/\.[^.]+$/, "");
  const evidence = preserve
    ? "Existing descriptive filename preserved"
    : heading
      ? "Document title or heading"
      : opening
        ? "Opening text line"
        : "No usable title; original filename preserved";
  const haystack =
    `${name} ${hints.join(" ")} ${text.slice(0, 3600)}`.toLocaleLowerCase();
  // Literal phrase/word matches; rules are data, never executable regular expressions.
  const matches = rules
    .map((rule) => ({
      rule,
      score: rule.keywords.filter((keyword) => {
        let start = haystack.indexOf(keyword);
        while (start >= 0) {
          const before = haystack[start - 1] || " ",
            after = haystack[start + keyword.length] || " ";
          if (!/[\p{L}\p{N}]/u.test(before) && !/[\p{L}\p{N}]/u.test(after))
            return true;
          start = haystack.indexOf(keyword, start + 1);
        }
        return false;
      }).length,
    }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);
  const tie = matches.length > 1 && matches[0].score === matches[1].score;
  const fallback =
    extension(name) === "xlsx" || extension(name) === "csv"
      ? "Data & Reports"
      : extension(name) === "pptx"
        ? "Presentations"
        : "Documents";
  const category = matches[0]?.rule.category || fallback;
  return {
    title: safeSegment(title),
    category,
    subcategory: "",
    reason: `${evidence}; ${matches.length ? `keyword rule: ${category}${tie ? " (tie resolved by rule order)" : ""}` : "file-type folder"}.`,
    needsReview: (!preserve && !heading && !opening) || tie,
  };
}
