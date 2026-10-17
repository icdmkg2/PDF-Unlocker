/**
 * Tools that commonly follow each tool. The result card offers these with
 * the output already loaded. Tools whose output isn't a usable PDF (an
 * encrypted file, images, text) have no entry.
 */
export const NEXT_STEPS: Record<string, string[]> = {
  "/merge": ["/page-numbers", "/compress", "/organize", "/protect"],
  "/split": ["/merge", "/compress"],
  "/organize": ["/page-numbers", "/compress", "/merge"],
  "/compress": ["/protect", "/merge", "/sign"],
  "/repair": ["/compress", "/edit", "/organize"],
  "/edit": ["/compress", "/protect", "/merge"],
  "/rotate": ["/page-numbers", "/compress", "/merge"],
  "/page-numbers": ["/protect", "/compress", "/merge"],
  "/watermark": ["/protect", "/compress"],
  "/crop": ["/compress", "/page-numbers"],
  "/forms": ["/sign", "/protect", "/compress"],
  "/metadata": ["/protect", "/compress"],
  "/unlock": ["/edit", "/forms", "/compress", "/organize"],
  "/sign": ["/protect", "/compress"],
  "/redact": ["/protect", "/compress"],
  "/jpg-to-pdf": ["/compress", "/merge", "/page-numbers"],
  "/html-to-pdf": ["/compress", "/merge"],
  "/scan": ["/compress", "/merge", "/protect"],
  "/pdf-to-pdfa": ["/protect", "/compress"],
};
