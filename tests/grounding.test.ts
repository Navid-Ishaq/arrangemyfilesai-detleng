import { describe, expect, it } from "vitest";
import { groundAnswer } from "../server/grounding";
describe("Guide capability guard", () => {
  it("corrects false model execution and clears invented navigation", () => {
    const result = groundAnswer({reply:'I run qwen3 locally. Click Open Setup.', action:'open-setup'}, 'Can you move files?');
    expect(result.reply).toContain('cannot access');
    expect(result.reply).not.toContain('Open Setup');
    expect(result.action).toBe('none');
  });
  it.each([['Hola, archivos', 'Soy DeTLeng'], ['Janab meri files', 'Main DeTLeng'], ['Tusi Punjabi vich deo', 'Main DeTLeng']])('keeps correction in requested language', (message, start) => {
    expect(groundAnswer({reply:'I can scan your folder',action:'none'},message).reply).toContain(start);
  });
  it("retains an accurate answer", () => {
    const answer = {reply:'Choose folder does not start analysis. Click Analyze locally.',action:'none' as const};
    expect(groundAnswer(answer,'Help')).toEqual(answer);
  });
});
