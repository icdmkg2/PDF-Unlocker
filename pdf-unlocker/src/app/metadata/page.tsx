"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { EncryptedNotice } from "@/components/encrypted-notice";
import { ResultCard, formatSize } from "@/components/result-card";
import { ErrorNote, Step, Steps, Working } from "@/components/steps";
import { Tags } from "lucide-react";
import { readPdfMetadata, writePdfMetadata, type PdfMetadata } from "@/lib/pdf-metadata";
import { addHistoryEntry } from "@/lib/local-history";

const FIELDS = [
  ["title", "Title"],
  ["author", "Author"],
  ["subject", "Subject"],
  ["keywords", "Keywords"],
  ["creator", "Creator"],
] as const;

export default function MetadataPage() {
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<PdfMetadata | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Blob | null>(null);

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setError(null);
    setResult(null);
    setWorking("Reading details…");
    try {
      setMeta(await readPdfMetadata(f));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read metadata.");
      setMeta(null);
    } finally {
      setWorking(null);
    }
  }, []);

  const reset = () => {
    setFile(null);
    setMeta(null);
    setError(null);
    setResult(null);
  };

  const handleSave = async () => {
    if (!file || !meta) return;
    setWorking("Saving…");
    setError(null);
    try {
      const bytes = await writePdfMetadata(file, {
        title: meta.title,
        author: meta.author,
        subject: meta.subject,
        keywords: meta.keywords,
        creator: meta.creator,
      });
      setResult(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" }));
      await addHistoryEntry({ tool: "Metadata", fileName: file.name, size: file.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setWorking(null);
    }
  };

  return (
    <ToolLayout title="PDF Metadata" description="See and change the title, author, subject and keywords" icon={Tags} medium>
      <Steps>
        <Step n={1} title="Add a PDF" state={file ? "done" : "current"} summary={file && `${file.name} · ${formatSize(file.size)}`} onChange={reset}>
          <PdfDropzone onFiles={handleFiles} label="Drop the PDF to edit" />
        </Step>

        <Step n={2} title="Edit details" state={!file ? "todo" : result ? "done" : "current"} summary={meta?.title || "Untitled"} onChange={() => setResult(null)}>
          <EncryptedNotice file={file} />
          {meta && (
            <>
              <p className="font-label text-muted-foreground">
                {meta.pageCount} pages · Made with {meta.producer || "unknown"} · Created {meta.creationDate || "unknown"}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {FIELDS.map(([key, label]) => (
                  <div key={key} className={key === "keywords" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
                    <Label htmlFor={key}>{label}</Label>
                    <Input id={key} value={meta[key]} onChange={(e) => setMeta({ ...meta, [key]: e.target.value })} />
                  </div>
                ))}
              </div>
            </>
          )}
          {working && <Working>{working}</Working>}
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button onClick={handleSave} disabled={!meta || !!working} className="w-full">
            <Tags className="h-4 w-4" /> Save details
          </Button>
        </Step>

        <Step n={3} title="Save" state={result ? "current" : "todo"}>
          {result && file && (
            <ResultCard
              verb="Details updated"
              blob={result}
              fileName={file.name}
              onReset={reset}
              resetLabel="Edit another"
            />
          )}
        </Step>
      </Steps>
    </ToolLayout>
  );
}
