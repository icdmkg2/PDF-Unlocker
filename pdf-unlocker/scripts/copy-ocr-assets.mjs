// Copies the OCR engine and English model from node_modules into public/ocr
// so OCR runs from this site, offline, without fetching from a CDN.
// Runs before dev and build (see package.json); public/ocr is gitignored.
import { cpSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = join(dirname(new URL(import.meta.url).pathname), "..");
const out = join(root, "public", "ocr");
const core = dirname(require.resolve("tesseract.js-core/package.json"));
const tess = dirname(require.resolve("tesseract.js/package.json"));
const eng = dirname(require.resolve("@tesseract.js-data/eng/package.json"));

const files = [
  [join(tess, "dist", "worker.min.js"), join(out, "worker.min.js")],
  // OEM 1 (LSTM only) loads one of these, whichever the browser supports.
  ...["tesseract-core-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js", "tesseract-core-relaxedsimd-lstm.wasm.js"].map((f) => [
    join(core, f),
    join(out, "core", f),
  ]),
  [join(eng, "4.0.0_best_int", "eng.traineddata.gz"), join(out, "lang", "eng.traineddata.gz")],
];

for (const [from, to] of files) {
  if (!existsSync(from)) throw new Error(`OCR asset missing: ${from}`);
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to);
}
console.log(`OCR assets copied to ${out}`);
