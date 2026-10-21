import { Fragment } from "react";
// React escapes all model text. Only bold, paragraphs and simple lists are supported.
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <Fragment key={i}>{part}</Fragment>);
}
export function GuideReply({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: { type: "p" | "ol" | "ul"; lines: string[] }[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    const type = ordered ? "ol" : bullet ? "ul" : "p";
    const value = ordered?.[1] || bullet?.[1] || line;
    const previous = blocks[blocks.length - 1];
    if (type !== "p" && previous?.type === type) previous.lines.push(value);
    else blocks.push({ type, lines: [value] });
  }
  return <div className="guide-reply">{blocks.map((block, i) => {
    if (block.type === "p") return <p key={i}>{inline(block.lines[0])}</p>;
    const List = block.type;
    return <List key={i}>{block.lines.map((line, j) => <li key={j}>{inline(line)}</li>)}</List>;
  })}</div>;
}
