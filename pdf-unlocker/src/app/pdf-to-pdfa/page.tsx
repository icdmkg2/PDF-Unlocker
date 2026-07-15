"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { EncryptedNotice } from "@/components/encrypted-notice";
import { Archive, Download, RotateCcw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { revokeUrl } from "@/lib/pdf-utils";
import { addHistoryEntry } from "@/lib/local-history";

/**
 * Experimental: adds PDF/A-2b identification XMP metadata.
 * This is NOT a full PDF/A conversion (no ICC profile, font subsetting, or validation).
 */
export default function PdfToPdfAPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    revokeUrl(resultUrl);
    setFile(files[0]);
    setError(null);
    setResultUrl(null);
  }, [resultUrl]);

  const handleRemove = useCallback(() => {
    revokeUrl(resultUrl);
    setFile(null);
    setError(null);
    setResultUrl(null);
  }, [resultUrl]);

  const handleConvert = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    try {
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);

      doc.setTitle(file.name.replace(/\.pdf$/i, ""));
      doc.setCreator("PDF Studio");
      doc.setProducer("PDF Studio - experimental PDF/A metadata");
      const now = new Date();
      doc.setCreationDate(now);
      doc.setModificationDate(now);

      const xmpMetadata = `<?xpacket begin='\uFEFF' id='W5M0MpCehiHzreSzNTczkc9d'?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>2</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end='w'?>`;

      const xmpStream = doc.context.stream(xmpMetadata, {
        Type: "Metadata",
        Subtype: "XML",
      });
      const xmpRef = doc.context.register(xmpStream);
      doc.catalog.set(doc.context.obj("Metadata"), xmpRef);

      const saved = await doc.save();
      revokeUrl(resultUrl);
      setResultUrl(URL.createObjectURL(new Blob([saved as Uint8Array<ArrayBuffer>], { type: "application/pdf" })));
      await addHistoryEntry({ tool: "PDF/A metadata", fileName: file.name, size: file.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = file.name.replace(/\.pdf$/i, "_pdfa_meta.pdf");
    a.click();
  };

  const reset = () => handleRemove();

  return (
    <ToolLayout
      title="PDF/A Metadata"
      description="Experimental: embed PDF/A-2b identification metadata"
      icon={Archive}
      notice="This does not create a fully compliant PDF/A file. It only adds PDF/A-2b XMP identification. Validate with a dedicated PDF/A validator before archival use. Fonts, color profiles, and transparency are not converted."
    >
      <div className="space-y-5">
        <PdfDropzone
          onFiles={handleFiles}
          files={file ? [file] : []}
          onRemove={handleRemove}
          label="Drop your PDF here"
        />
        <EncryptedNotice file={file} />

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {resultUrl && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary text-sm">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              Metadata embedded (experimental)
            </div>
            <Button onClick={handleDownload} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Download PDF
            </Button>
          </div>
        )}

        {!resultUrl ? (
          <Button onClick={handleConvert} disabled={!file || isLoading} className="w-full">
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing…</>
            ) : (
              <><Archive className="h-4 w-4 mr-2" /> Add PDF/A Metadata</>
            )}
          </Button>
        ) : (
          <Button onClick={reset} variant="outline" className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" /> Start Over
          </Button>
        )}
      </div>
    </ToolLayout>
  );
}
