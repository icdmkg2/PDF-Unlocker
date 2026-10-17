import fs from "node:fs";
import path from "node:path";

// pdfcpu-wasm fetches "/pdfcpu.wasm" like it would in the browser; serve it from public/.
const wasm = fs.readFileSync(path.resolve(__dirname, "../../public/pdfcpu.wasm"));
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  if (String(input).endsWith("pdfcpu.wasm")) {
    return new Response(wasm, { headers: { "content-type": "application/wasm" } });
  }
  return realFetch(input, init);
}) as typeof fetch;

// pdfcpu logs progress lines to stdout; keep test output readable.
const log = console.log;
console.log = (...args: unknown[]) => {
  const first = String(args[0] ?? "");
  if (/^(optimizing|writing|installing user font|Roboto|decrypting|encrypting|extracting|using AES|validating)/i.test(first)) return;
  log(...args);
};
