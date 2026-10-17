import type { PdfFacts } from "./pdf-inspect";

export interface Suggestion {
  href: string;
  /** Why this tool fits this particular file. */
  reason: string;
}

const MB = 1024 * 1024;

/**
 * Rank tools for the dropped file(s). The first suggestion is the one the
 * file most likely needs; the rest are common next steps.
 */
export function suggestTools(files: PdfFacts[]): Suggestion[] {
  if (files.length > 1) {
    return [
      { href: "/merge", reason: `Combine these ${files.length} files into one` },
      { href: "/compare", reason: "See what changed between two versions" },
    ];
  }

  const [f] = files;
  if (!f) return [];

  if (f.damaged) {
    return [{ href: "/repair", reason: "It didn't open cleanly. Try rebuilding it." }];
  }

  if (f.encrypted) {
    return [{ href: "/unlock", reason: "Password-protected. Unlock it first." }];
  }

  const out: Suggestion[] = [];
  if (f.formFields > 0) {
    out.push({ href: "/forms", reason: `Fill its ${f.formFields} form field${f.formFields === 1 ? "" : "s"}` });
  }
  if (f.size > 5 * MB) {
    out.push({ href: "/compress", reason: `Shrink it from ${(f.size / MB).toFixed(1)} MB, keeping text` });
  }
  out.push({ href: "/edit", reason: "Write, highlight or draw on it" });
  out.push({ href: "/sign", reason: "Add your signature" });
  if (f.pages && f.pages > 1) {
    out.push({ href: "/split", reason: `Pull out some of its ${f.pages} pages` });
    out.push({ href: "/organize", reason: "Reorder or delete pages" });
  }
  if (f.size <= 5 * MB) out.push({ href: "/compress", reason: "Make it smaller, keeping text" });
  out.push({ href: "/protect", reason: "Lock it with a password" });
  out.push({ href: "/redact", reason: "Black out private details" });

  return out.slice(0, 6);
}
