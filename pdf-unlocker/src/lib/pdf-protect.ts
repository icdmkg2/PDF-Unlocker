export async function protectPDF(
  file: File,
  userPw: string,
  ownerPw: string
): Promise<Uint8Array> {
  const { Pdfcpu } = await import("pdfcpu-wasm");
  const pdfcpu = new Pdfcpu("/pdfcpu.wasm");

  const inputFile = new File([await file.arrayBuffer()], "input.pdf", { type: "application/pdf" });
  const result = await pdfcpu.run(
    ["encrypt", "-upw", userPw, "-opw", ownerPw || userPw, "/input/input.pdf", "/output/output.pdf"],
    [inputFile]
  );

  const output = await result.readFile("output.pdf", "application/pdf");
  if (!output) throw new Error("Encryption failed.");

  const buf = await output.arrayBuffer();
  return new Uint8Array(buf);
}
