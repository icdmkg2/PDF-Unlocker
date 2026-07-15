"use client";

import { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { UploadCloud, CheckCircle2, X } from "lucide-react";

interface PdfDropzoneProps {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  label?: string;
  files?: File[];
  onRemove?: (index: number) => void;
}

export function PdfDropzone({
  onFiles,
  multiple = false,
  label,
  files = [],
  onRemove,
}: PdfDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const dropped = Array.from(e.dataTransfer.files).filter(
        (f) => f.type === "application/pdf"
      );
      if (dropped.length) onFiles(dropped);
    },
    [onFiles]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length) onFiles(selected);
    e.target.value = "";
  };

  const hasFiles = files.length > 0;

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "relative cursor-pointer rounded-lg border border-dashed p-8 text-center transition-colors",
          isDragging
            ? "border-primary/50 bg-primary/5"
            : hasFiles
              ? "border-border bg-card hover:border-muted-foreground/40"
              : "border-border bg-card/40 hover:border-muted-foreground/40 hover:bg-card/70"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple={multiple}
          onChange={handleChange}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2">
          {hasFiles ? (
            <CheckCircle2 className="h-7 w-7 text-emerald-500/90" />
          ) : (
            <UploadCloud className="h-7 w-7 text-muted-foreground" />
          )}
          <p className="text-sm font-medium text-foreground">
            {label ?? (hasFiles ? "Add more files" : "Drop PDF here")}
          </p>
          <p className="font-label text-[9px] text-muted-foreground">
            or click to browse
          </p>
        </div>
      </div>

      {hasFiles && (
        <ul className="space-y-1.5">
          {files.map((f, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              <span className="truncate text-foreground">{f.name}</span>
              <div className="flex flex-shrink-0 items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {(f.size / 1024 / 1024).toFixed(2)} MB
                </span>
                {onRemove && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(i);
                    }}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Remove file"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
