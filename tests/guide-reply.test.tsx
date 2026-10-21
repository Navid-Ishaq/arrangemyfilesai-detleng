import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GuideReply } from "../src/GuideReply";
describe("Guide response presentation", () => {
  it("renders readable emphasis and real ordered lists", () => {
    const html = renderToStaticMarkup(<GuideReply text={'**Steps**\n1. Choose folder\n2. Analyze locally'} />);
    expect(html).toContain('<strong>Steps</strong>');
    expect(html).toContain('<ol><li>Choose folder</li><li>Analyze locally</li></ol>');
    expect(html).not.toContain('**');
  });
  it("escapes model supplied HTML instead of executing it", () => {
    const html = renderToStaticMarkup(<GuideReply text={'<script>alert(1)</script>'} />);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
  it.each(['Hola, elige una carpeta.', 'Folder chun lein janab.', 'Tusi folder chuno.', 'Choose a folder.'])("preserves language: %s", text => {
    expect(renderToStaticMarkup(<GuideReply text={text} />)).toContain(text);
  });
});
