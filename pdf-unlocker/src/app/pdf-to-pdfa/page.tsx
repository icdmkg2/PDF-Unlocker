"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { EncryptedNotice } from "@/components/encrypted-notice";
import { ResultCard, formatSize } from "@/components/result-card";
import { ErrorNote, Step, Steps, Working } from "@/components/steps";
import { Archive } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { addHistoryEntry } from "@/lib/local-history";

/**
 * Experimental: adds PDF/A-2b identification XMP metadata.
 * This is NOT a full PDF/A conversion (no ICC profile, font subsetting, or validation).
 */
export default function PdfToPdfAPage() {
  const [file, setFile] = useState<File | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Blob | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setError(null);
    setResult(null);
  }, []);

  const reset = () => {
    setFile(null);
    setError(null);
    setResult(null);
  };

  const handleConvert = async () => {
    if (!file) return;
    setWorking(true);
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
      setResult(new Blob([saved as Uint8Array<ArrayBuffer>], { type: "application/pdf" }));
      await addHistoryEntry({ tool: "PDF/A metadata", fileName: file.name, size: file.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <ToolLayout title="PDF/A Metadata" description="Experimental: tag a PDF as PDF/A-2b" icon={Archive} medium>
      <Steps>
        <Step n={1} title="Add a PDF" state={file ? "done" : "current"} summary={file && `${file.name} · ${formatSize(file.size)}`} onChange={reset}>
          <PdfDropzone onFiles={handleFiles} label="Drop the PDF to tag" />
        </Step>

        <Step n={2} title="Add the tags" state={!file ? "todo" : result ? "done" : "current"}>
          <EncryptedNotice file={file} />
          <p className="rounded-lg border border-[#3d3420] bg-[#1a1610] px-3 py-2 text-xs leading-relaxed text-[#d4c4a0]">
            This only adds PDF/A-2b identification. It does not convert fonts, color profiles or transparency,
            so the file is not fully compliant. Check it with a PDF/A validator before archiving.
          </p>
          {working && <Working>Adding tags…</Working>}
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button onClick={handleConvert} disabled={working} className="w-full">
            <Archive className="h-4 w-4" /> Add PDF/A tags
          </Button>
        </Step>

        <Step n={3} title="Save" state={result ? "current" : "todo"}>
          {result && file && (
            <ResultCard
              verb="Tagged (experimental)"
              blob={result}
              fileName={file.name.replace(/\.pdf$/i, "") + "_pdfa.pdf"}
              onReset={reset}
              resetLabel="Tag another"
            />
          )}
        </Step>
      </Steps>
    </ToolLayout>
  );
}
