"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { Scissors, Download, RotateCcw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { splitPDF, parseRanges } from "@/lib/pdf-split";
import { PDFDocument } from "pdf-lib";

export default function SplitPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [rangeInput, setRangeInput] = useState("");
  const [extractAll, setExtractAll] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ bytes: Uint8Array; name: string }[] | null>(null);

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setError(null);
    setResults(null);
    setRangeInput("");
    // get page count
    try {
      const bytes = await f.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      setPageCount(doc.getPageCount());
    } catch {
      setPageCount(null);
    }
  }, []);

  const handleRemove = useCallback(() => {
    setFile(null);
    setPageCount(null);
    setError(null);
    setResults(null);
  }, []);

  const handleSplit = async () => {
    if (!file || !pageCount) return;
    setIsLoading(true);
    setError(null);
    try {
      let ranges: number[][];
      if (extractAll) {
        ranges = Array.from({ length: pageCount }, (_, i) => [i]);
      } else {
        if (!rangeInput.trim()) throw new Error("Please enter page ranges.");
        ranges = parseRanges(rangeInput, pageCount);
      }
      const parts = await splitPDF(file, ranges);
      setResults(parts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Split failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadAll = () => {
    if (!results) return;
    results.forEach(({ bytes, name }) => {
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  };

  const reset = () => {
    setFile(null);
    setPageCount(null);
    setRangeInput("");
    setExtractAll(false);
    setError(null);
    setResults(null);
  };

  return (
    <ToolLayout
      title="Split PDF"
      description="Extract pages or split a PDF into multiple files"
      icon={Scissors}
    >
      <div className="space-y-5">
        <PdfDropzone
          onFiles={handleFiles}
          files={file ? [file] : []}
          onRemove={handleRemove}
          label="Drop your PDF here"
        />

        {pageCount !== null && (
          <p className="text-xs text-muted-foreground">
            Document has <strong className="text-foreground">{pageCount}</strong> pages
          </p>
        )}

        {file && pageCount && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="extractAll"
                checked={extractAll}
                onChange={(e) => setExtractAll(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="extractAll">Extract all pages individually</Label>
            </div>

            {!extractAll && (
              <div className="space-y-1.5">
                <Label htmlFor="ranges">Page ranges</Label>
                <Input
                  id="ranges"
                  placeholder={`e.g. 1-3, 5, 7-${pageCount}`}
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Each comma-separated range becomes a separate PDF
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {results && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary text-sm">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              Split into {results.length} file{results.length !== 1 ? "s" : ""}!
            </div>
            <Button onClick={downloadAll} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Download All ({results.length} files)
            </Button>
          </div>
        )}

        {!results ? (
          <Button onClick={handleSplit} disabled={!file || isLoading} className="w-full">
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Splitting...</>
            ) : (
              <><Scissors className="h-4 w-4 mr-2" /> Split PDF</>
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
