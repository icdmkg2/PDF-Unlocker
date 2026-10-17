import { asPdfcpuInput, runPdfcpu } from "./pdfcpu";

export type UnlockResult =
  | { ok: true; bytes: Uint8Array; password: string }
  | { ok: false; wrongPassword: boolean; message: string };

/** Decrypt a PDF with pdfcpu. Text and structure are preserved. */
export async function unlockPDF(file: File, password = ""): Promise<UnlockResult> {
  const args = ["decrypt"];
  if (password) args.push("-upw", password, "-opw", password);
  args.push("/input/input.pdf", "/output/output.pdf");

  const out = await runPdfcpu(args, [await asPdfcpuInput(file)]);
  const result = await out.read("output.pdf");
  if (result) {
    return { ok: true, bytes: new Uint8Array(await result.arrayBuffer()), password };
  }

  const message = out.errors.join(" ");
  const wrongPassword = /password/i.test(message);
  return {
    ok: false,
    wrongPassword,
    message: wrongPassword
      ? password
        ? "That password didn't work."
        : "This PDF needs a password to open."
      : `Couldn't unlock this PDF. ${message.replace(/^pdfcpu:\s*/, "")}`.trim(),
  };
}

/**
 * Try each password in order and return the first that opens the file.
 * Stops early on errors that aren't about the password.
 */
export async function unlockWithAny(
  file: File,
  passwords: string[],
  onTry?: (index: number) => void
): Promise<UnlockResult> {
  let last: UnlockResult = { ok: false, wrongPassword: true, message: "No saved passwords to try." };
  for (let i = 0; i < passwords.length; i++) {
    onTry?.(i);
    last = await unlockPDF(file, passwords[i]);
    if (last.ok || !last.wrongPassword) return last;
  }
  return last.ok
    ? last
    : { ...last, message: last.wrongPassword ? "None of your saved passwords opened this PDF." : last.message };
}
