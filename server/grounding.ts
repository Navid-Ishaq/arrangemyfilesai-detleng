import type { z } from "zod";
import { answerSchema } from "./contracts";
type Answer = z.infer<typeof answerSchema>;
// Defense in depth for known first-person capability errors. Not a general factuality guarantee.
export function groundAnswer(answer: Answer, message: string): Answer {
  const unsupported =
    /\bI(?:[’']ll| will| can)?\s+(?:run|scan|access|read|rename|move|delete|copy)\b|\bmain\s+(?:aapki|tuhadi(?:yan)?|tumhari|files?\s+ko).*?(?:scan|move|copy|parh|padh)\s+(?:kar\s+sakta|karunga|karda)\b|Open Setup|automatically (?:analy[sz]e|move|rename)/i;
  if (!unsupported.test(answer.reply)) return answer;
  let reply =
    "I’m DeTLeng AI Guide. I explain setup and organization steps; I cannot access or operate on your files. In the organizer, choose a folder, click Build organization plan, review categories and Needs Review, then confirm copying the included batch to a separate output folder. All inventoried files are included unless explicitly excluded. Originals stay untouched.";
  if (/\b(hola|puedes|carpeta|archivos|español)\b/i.test(message))
    reply =
      "Soy DeTLeng AI Guide. Te explico los pasos, pero no accedo a tus archivos ni los modifico. En la aplicación, elige una carpeta, pulsa Build organization plan, revisa las sugerencias y aprueba las copias. Los originales permanecen intactos.";
  else if (/\b(tusi|tuhad|punjabi|sakde|deo)\b/i.test(message))
    reply =
      "Main DeTLeng AI Guide haan. Main app samajhan vich madad karda haan; main tuhadiyan files khud access ya move nahi karda. App vich folder chuno, Build organization plan dabao, te categories te Needs Review vekh ke included batch di copying confirm karo. Original files apni jagah rehndiyan ne.";
  else if (/\b(aap|meri|janab|sakte|urdu|karna)\b/i.test(message))
    reply =
      "Main DeTLeng AI Guide hoon. Main steps samjhata hoon; aapki files khud access ya operate nahi karta. App mein folder choose karein, Build organization plan dabayein, phir categories aur Needs Review dekh kar included batch ki copying confirm karein. Sab inventoried files included hoti hain jab tak aap explicitly exclude na karein. Original files apni jagah rehti hain.";
  return { reply, action: "none" };
}
