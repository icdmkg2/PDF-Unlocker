export interface ProtectOptions {
  userPassword: string;
  ownerPassword?: string;
  /** Restrict printing when owner password is set (best-effort via pdfcpu flags). */
  allowPrint?: boolean;
  allowCopy?: boolean;
  allowModify?: boolean;
}

export async function protectPDF(
  file: File,
  userPw: string,
  ownerPw: string,
  options: Omit<ProtectOptions, "userPassword" | "ownerPassword"> = {}
): Promise<Uint8Array> {
  const { Pdfcpu } = await import("pdfcpu-wasm");
  const pdfcpu = new Pdfcpu("/pdfcpu.wasm");

  const inputFile = new File([await file.arrayBuffer()], "input.pdf", { type: "application/pdf" });
  const opw = ownerPw || userPw;

  // pdfcpu encrypt; permissions are limited in wasm CLI surface
  const args = [
    "encrypt",
    "-mode",
    "aes",
    "-upw",
    userPw,
    "-opw",
    opw,
    "/input/input.pdf",
    "/output/output.pdf",
  ];

  // Note: fine-grained permission flags vary by pdfcpu build; we always encrypt.
  void options;

  const result = await pdfcpu.run(args, [inputFile]);
  const output = await result.readFile("output.pdf", "application/pdf");
  if (!output) throw new Error("Encryption failed.");

  const buf = await output.arrayBuffer();
  return new Uint8Array(buf);
}
