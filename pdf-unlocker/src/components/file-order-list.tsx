"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, GripVertical, X } from "lucide-react";
import { formatSize } from "@/components/result-card";
import { cn } from "@/lib/utils";

/** Files in output order. Drag, or use the arrows, to reorder. */
export function FileOrderList({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= files.length || from === to) return;
    const next = [...files];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  if (!files.length) return null;

  return (
    <ol className="space-y-1.5" aria-label="Files in order">
      {files.map((f, i) => (
        <li
          key={`${f.name}-${f.size}-${f.lastModified}-${i}`}
          draggable
          onDragStart={() => setDragIndex(i)}
          onDragOver={(e) => {
            e.preventDefault();
            if (dragIndex === null || dragIndex === i) return;
            move(dragIndex, i);
            setDragIndex(i);
          }}
          onDragEnd={() => setDragIndex(null)}
          className={cn(
            "flex cursor-grab items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-sm active:cursor-grabbing",
            dragIndex === i && "opacity-60"
          )}
        >
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="w-5 shrink-0 font-mono text-[11px] text-muted-foreground">{i + 1}</span>
          <span className="min-w-0 flex-1 truncate">{f.name}</span>
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{formatSize(f.size)}</span>
          <span className="flex shrink-0">
            <button type="button" aria-label={`Move ${f.name} up`} disabled={i === 0} onClick={() => move(i, i - 1)} className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label={`Move ${f.name} down`} disabled={i === files.length - 1} onClick={() => move(i, i + 1)} className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onChange(files.filter((_, idx) => idx !== i))} className="rounded p-1 text-muted-foreground hover:text-destructive">
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        </li>
      ))}
    </ol>
  );
}
