/**
 * The versions of one document as it moves through tools in this session:
 * the original, then each tool's result. Lives in memory only (a reload
 * clears it) and holds the files themselves, so nothing is written to disk
 * or storage.
 *
 * The chain grows when a result is handed to the next tool; dropping a new
 * file starts a new chain; opening an earlier version cuts off everything
 * after it, which is how undo works.
 */
export interface Version {
  id: number;
  /** Tool path that produced it, or null for the original. */
  tool: string | null;
  file: File;
  /** What the tool produced, so its result card can find this version again. */
  source: Blob;
  at: number;
}

let chain: Version[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  chain = [...chain];
  listeners.forEach((l) => l());
}

export function getChain(): Version[] {
  return chain;
}

export function subscribeChain(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/**
 * A tool received files. `fresh` means the user dropped or chose them (start
 * over); otherwise they were handed over from another tool or the landing page.
 */
export function noteInput(files: File[], fresh: boolean): void {
  if (!fresh) {
    const at = chain.findIndex((v) => files.length === 1 && v.file === files[0]);
    if (at >= 0) {
      if (at < chain.length - 1) {
        chain = chain.slice(0, at + 1);
        emit();
      }
      return;
    }
  }
  // A new single PDF starts a chain with itself; several files (merge, batch) have no single original.
  const pdf = files.length === 1 && (files[0].type === "application/pdf" || /\.pdf$/i.test(files[0].name));
  chain = pdf ? [{ id: nextId++, tool: null, file: files[0], source: files[0], at: Date.now() }] : [];
  emit();
}

/**
 * A tool produced a PDF. Re-running the same tool on the same input (after
 * Adjust) replaces its previous result instead of stacking a new step.
 */
export function recordResult(tool: string, blob: Blob, name: string): Version {
  const existing = chain.find((v) => v.source === blob || v.file === blob);
  if (existing) return existing;
  const version: Version = {
    id: nextId++,
    tool,
    file: blob instanceof File && blob.name === name ? blob : new File([blob], name, { type: blob.type || "application/pdf" }),
    source: blob,
    at: Date.now(),
  };
  const last = chain[chain.length - 1];
  if (last && last.tool === tool) chain = [...chain.slice(0, -1), version];
  else chain = [...chain, version];
  emit();
  return version;
}

/** Drop every version after this one. */
export function rewindTo(id: number): Version | null {
  const at = chain.findIndex((v) => v.id === id);
  if (at < 0) return null;
  chain = chain.slice(0, at + 1);
  emit();
  return chain[at];
}

/** Test helper. */
export function resetChain(): void {
  chain = [];
  emit();
}

/** Swap a version's file for a renamed copy, keeping its place in the chain. */
export function replaceVersionFile(id: number, file: File): void {
  const at = chain.findIndex((v) => v.id === id);
  if (at < 0) return;
  chain[at] = { ...chain[at], file };
  emit();
}
