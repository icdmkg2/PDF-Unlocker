"use client";

import { AlertCircle, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepState = "done" | "current" | "todo";

/**
 * One step of a tool's add → choose → save sequence. A finished step folds
 * into its summary line; only the current step shows its content.
 */
export function Step({
  n,
  title,
  state,
  summary,
  onChange,
  changeLabel = "Change",
  children,
}: {
  n: number;
  title: string;
  state: StepState;
  summary?: React.ReactNode;
  onChange?: () => void;
  changeLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      aria-current={state === "current" ? "step" : undefined}
      aria-label={`Step ${n}: ${title}`}
      className={cn(
        "rounded-lg border transition-colors",
        state === "current" ? "border-border bg-card/60" : "border-border/70",
        state === "todo" && "opacity-50"
      )}
    >
      <div className="flex min-h-12 items-center gap-3 px-4 py-3">
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-mono text-[10px]",
            state === "done" ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
          )}
          aria-hidden
        >
          {state === "done" ? <Check className="h-3 w-3" /> : n}
        </span>
        <h2 className={cn("text-sm", state === "current" ? "font-medium text-foreground" : "text-muted-foreground")}>
          {title}
        </h2>
        {state === "done" && summary && (
          <span className="ml-auto min-w-0 truncate text-right text-xs text-muted-foreground">{summary}</span>
        )}
        {state === "done" && onChange && (
          <button
            type="button"
            onClick={onChange}
            className={cn(
              "shrink-0 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground",
              !summary && "ml-auto"
            )}
          >
            {changeLabel}
          </button>
        )}
      </div>
      {state === "current" && children && <div className="space-y-4 px-4 pb-4">{children}</div>}
    </section>
  );
}

export function Steps({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2.5">{children}</div>;
}

export function Working({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
      {children}
    </div>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <div>{children}</div>
    </div>
  );
}

/** Pill-style single choice used for tool options. */
export function Choice<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string; desc?: string; badge?: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
            value === o.id ? "border-primary/60 bg-primary/5" : "border-border bg-card hover:border-muted-foreground/40"
          )}
        >
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            {o.label}
            {o.badge && <span className="font-label text-[9px] text-emerald-500/90">{o.badge}</span>}
          </span>
          {o.desc && <span className="text-xs leading-snug text-muted-foreground">{o.desc}</span>}
        </button>
      ))}
    </div>
  );
}
