import { PDFDocument } from "pdf-lib";
import { compressLossless } from "./pdf-compress";
import { protectPDF } from "./pdf-protect";
import { unlockPDF } from "./pdf-unlock";
import { addWatermark } from "./pdf-watermark";
import { addPageNumbers, type PageNumberPosition } from "./pdf-page-numbers";
import { rotatePDF } from "./pdf-rotate";
import { writePdfMetadata } from "./pdf-metadata";

export type BatchStep =
  | { kind: "unlock"; password: string }
  | { kind: "rotate"; angle: 90 | 180 | 270 }
  | { kind: "pageNumbers"; position: PageNumberPosition }
  | { kind: "watermark"; text: string }
  | { kind: "metadata"; title: string; author: string }
  | { kind: "compress" }
  | { kind: "protect"; password: string };

export const STEP_LABELS: Record<BatchStep["kind"], string> = {
  unlock: "Unlock",
  rotate: "Rotate every page",
  pageNumbers: "Add page numbers",
  watermark: "Add a watermark",
  metadata: "Set title and author",
  compress: "Compress (keep text)",
  protect: "Protect with a password",
};

/**
 * Order steps so each one can read the file: unlocking first, protecting
 * last. Everything else keeps the order the user chose.
 */
export function orderSteps(steps: BatchStep[]): BatchStep[] {
  const rank = (s: BatchStep) => (s.kind === "unlock" ? 0 : s.kind === "protect" ? 2 : 1);
  return steps
    .map((s, i) => ({ s, i }))
    .sort((a, b) => rank(a.s) - rank(b.s) || a.i - b.i)
    .map(({ s }) => s);
}

/** Problems that would make a run fail for every file, in plain words. */
export function validateSteps(steps: BatchStep[]): string | null {
  if (!steps.length) return "Add at least one step.";
  for (const s of steps) {
    if (s.kind === "protect" && !s.password) return "Protect needs a password.";
    if (s.kind === "watermark" && !s.text.trim()) return "Watermark needs some text.";
    if (s.kind === "metadata" && !s.title.trim() && !s.author.trim()) return "Set a title, an author, or both.";
  }
  return null;
}

async function applyStep(file: File, step: BatchStep): Promise<Uint8Array> {
  switch (step.kind) {
    case "unlock": {
      const r = await unlockPDF(file, step.password);
      if (!r.ok) throw new Error(r.message);
      return r.bytes;
    }
    case "rotate": {
      const count = (await PDFDocument.load(await file.arrayBuffer())).getPageCount();
      return rotatePDF(file, Array.from({ length: count }, (_, i) => i), step.angle);
    }
    case "pageNumbers":
      return addPageNumbers(file, { position: step.position, startFrom: 1, fontSize: 10, color: [0, 0, 0] });
    case "watermark":
      return addWatermark(file, { text: step.text, opacity: 0.3, fontSize: 48, rotation: 45, tiled: false, color: [0.53, 0.53, 0.53] });
    case "metadata":
      return writePdfMetadata(file, {
        ...(step.title.trim() ? { title: step.title.trim() } : {}),
        ...(step.author.trim() ? { author: step.author.trim() } : {}),
      });
    case "compress":
      return compressLossless(file);
    case "protect":
      return protectPDF(file, step.password, "");
  }
}

/** Run every step on one file and return the final bytes. */
export async function runSteps(file: File, steps: BatchStep[]): Promise<Uint8Array> {
  let current = file;
  let bytes: Uint8Array = new Uint8Array(await file.arrayBuffer());
  for (const step of orderSteps(steps)) {
    bytes = await applyStep(current, step);
    current = new File([bytes as Uint8Array<ArrayBuffer>], file.name, { type: "application/pdf" });
  }
  return bytes;
}

/**
 * Output file name from a pattern. {name} is the original name without
 * .pdf, {n} the file's position (1, 2, …). Always ends in .pdf, and names
 * that would collide get " (2)", " (3)"… so nothing in the ZIP is lost.
 */
export function outputNames(pattern: string, inputs: string[]): string[] {
  const used = new Map<string, number>();
  return inputs.map((input, i) => {
    const base = input.replace(/\.pdf$/i, "");
    let name = (pattern.trim() || "{name}").replaceAll("{name}", base).replaceAll("{n}", String(i + 1));
    name = name.replace(/[\\/:*?"<>|]/g, "-").trim() || base;
    const key = name.toLowerCase();
    const seen = used.get(key) ?? 0;
    used.set(key, seen + 1);
    return `${seen ? `${name} (${seen + 1})` : name}.pdf`;
  });
}
