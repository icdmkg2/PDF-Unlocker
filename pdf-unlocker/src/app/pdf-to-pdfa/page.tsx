"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { Archive, Download, RotateCcw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { PDFDocument } from "pdf-lib";

export default function PdfToPdfAPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setError(null);
    setResultUrl(null);
  }, []);

  const handleRemove = useCallback(() => {
    setFile(null);
    setError(null);
    setResultUrl(null);
  }, []);

  const handleConvert = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    try {
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);

      doc.setTitle(file.name.replace(/\.pdf$/i, ""));
      doc.setCreator("PDF Studio");
      doc.setProducer("PDF Studio — pdf-lib");

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
      const blob = new Blob([saved as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
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
    a.download = file.name.replace(/\.pdf$/i, "_pdfa.pdf");
    a.click();
  };

  const reset = () => {
    setFile(null);
    setError(null);
    setResultUrl(null);
  };

  return (
    <ToolLayout
      title="PDF to PDF/A"
      description="Convert to PDF/A-2b for long-term archiving"
      icon={Archive}
    >
      <div className="space-y-5">
        <PdfDropzone
          onFiles={handleFiles}
          files={file ? [file] : []}
          onRemove={handleRemove}
          label="Drop your PDF here"
        />

        <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
          Embeds PDF/A-2b conformance metadata. For strict compliance, validate the output with a PDF/A validator.
        </div>

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
              PDF/A-2b metadata applied successfully!
            </div>
            <Button onClick={handleDownload} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Download PDF/A
            </Button>
          </div>
        )}

        {!resultUrl ? (
          <Button onClick={handleConvert} disabled={!file || isLoading} className="w-full">
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Converting...</>
            ) : (
              <><Archive className="h-4 w-4 mr-2" /> Convert to PDF/A</>
            )}
          </Button>
        ) : (
          <Button onClick={reset} variant="outline" className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" /> Convert Another PDF
          </Button>
        )}
      </div>
    </ToolLayout>
  );
}
