/**
 * Carries files from one page to the next during client-side navigation,
 * e.g. from the landing page drop target into a tool. Kept in memory only:
 * a reload or a new tab starts empty.
 */
let pending: File[] | null = null;

export function setHandoff(files: File[]): void {
  pending = files.length ? files : null;
}

/** Returns the waiting files once, then clears them. */
export function takeHandoff(): File[] | null {
  const files = pending;
  pending = null;
  return files;
}
