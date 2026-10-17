/** Thin wrapper around pdfcpu-wasm that can list output files and surface errors. */

type WasiDir = { contents: Map<string, WasiEntry> };
type WasiEntry = { data?: Uint8Array; contents?: Map<string, WasiEntry> };

export interface PdfcpuOutput {
  /** Read one file from /output by path, e.g. "output.pdf". */
  read(path: string, type?: string): Promise<File | undefined>;
  /** Every file written anywhere under /output, with its path relative to /output. */
  list(): { path: string; bytes: Uint8Array }[];
  /** Lines pdfcpu printed to stderr. */
  errors: string[];
}

export async function runPdfcpu(args: string[], inputs: File[]): Promise<PdfcpuOutput> {
  const { Pdfcpu } = await import("pdfcpu-wasm");
  const pdfcpu = new Pdfcpu("/pdfcpu.wasm");

  // pdfcpu-wasm routes stderr to console.error; capture it while this run is active.
  const errors: string[] = [];
  const original = console.error;
  console.error = (...parts: unknown[]) => {
    errors.push(parts.map(String).join(" "));
  };
  let handle;
  try {
    handle = await pdfcpu.run(args, inputs);
  } finally {
    console.error = original;
  }

  const root = (handle as unknown as { dir: WasiDir }).dir;

  return {
    errors,
    read: (path, type) => handle.readFile(path, type),
    list() {
      const out: { path: string; bytes: Uint8Array }[] = [];
      const walk = (dir: WasiDir, prefix: string) => {
        for (const [name, entry] of dir.contents) {
          if (entry.contents) walk(entry as WasiDir, `${prefix}${name}/`);
          else if (entry.data) out.push({ path: prefix + name, bytes: entry.data });
        }
      };
      walk(root, "");
      return out;
    },
  };
}

/** Wrap an uploaded file under the fixed name pdfcpu commands read from /input. */
export async function asPdfcpuInput(file: File | Blob, name = "input.pdf"): Promise<File> {
  return new File([await file.arrayBuffer()], name, { type: "application/pdf" });
}
