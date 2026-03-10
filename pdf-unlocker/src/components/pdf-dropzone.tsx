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
    // reset so same file can be re-selected
    e.target.value = "";
  };

  const hasFiles = files.length > 0;

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer text-center",
          isDragging
            ? "border-primary bg-primary/10"
            : hasFiles
            ? "border-primary/40 bg-primary/5 hover:border-primary/60"
            : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/40"
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
            <CheckCircle2 className="h-8 w-8 text-primary" />
          ) : (
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
          )}
          <p className="text-sm font-medium text-foreground">
            {label ?? (hasFiles ? "Add more files" : "Drop PDF here")}
          </p>
          <p className="text-xs text-muted-foreground">or click to browse</p>
        </div>
      </div>

      {/* File list */}
      {hasFiles && (
        <ul className="space-y-1.5">
          {files.map((f, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 px-3 py-2 bg-muted rounded-md text-sm"
            >
              <span className="truncate text-foreground">{f.name}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-muted-foreground text-xs">
                  {(f.size / 1024 / 1024).toFixed(2)} MB
                </span>
                {onRemove && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(i);
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors"
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
