"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { inspectPdf, type PdfFacts } from "@/lib/pdf-inspect";
import { suggestTools, type Suggestion } from "@/lib/suggest-tools";
import { setHandoff } from "@/lib/handoff";
import { toolSections } from "@/lib/tools";

const toolsByHref = new Map(toolSections.flatMap((s) => s.tools).map((t) => [t.href, t]));

type State =
  | { kind: "empty" }
  | { kind: "reading" }
  | { kind: "ready"; files: File[]; facts: PdfFacts[]; suggestions: Suggestion[] }
  | { kind: "error"; message: string };

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * The hero's paper sheet doubles as the start of every task: drop a PDF,
 * see what it is, and open the right tool with the file already loaded.
 */
export function LandingDrop() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ kind: "empty" });
  const [dragging, setDragging] = useState(false);

  const accept = useCallback(async (list: File[]) => {
    const files = list.filter((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
    if (!files.length) {
      setState({ kind: "error", message: "That isn't a PDF. Drop a .pdf file, or use JPG to PDF for images." });
      return;
    }
    setState({ kind: "reading" });
    const facts = await Promise.all(files.map(inspectPdf));
    // Any tool opened from here on, including the catalog below, starts with this file.
    setHandoff(files);
    setState({ kind: "ready", files, facts, suggestions: suggestTools(facts) });
  }, []);

  const open = (href: string) => {
    if (state.kind !== "ready") return;
    setHandoff(state.files);
    router.push(href);
  };

  return (
    <div
      className={cn(
        "paper-stack relative flex min-h-[26rem] flex-col rounded-sm border bg-[#1a1a1a] p-7 transition-[border-color,transform] duration-200 sm:p-8 lg:min-h-[30rem]",
        dragging ? "-translate-y-1 border-paper/40" : "border-border"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        accept(Array.from(e.dataTransfer.files));
      }}
    >
      <input
        ref={inputRef}
        id="landing-file"
        type="file"
        accept=".pdf,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          accept(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      {state.kind === "ready" ? (
        <Result
          state={state}
          onOpen={open}
          onReset={() => {
            setHandoff([]);
            setState({ kind: "empty" });
          }}
        />
      ) : (
        <>
          <span className="font-label flex items-center gap-2 text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80" aria-hidden />
            Stays on this device
          </span>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="group mt-auto text-left focus-visible:outline-none"
          >
            <span className="font-display block text-[2.5rem] leading-[1.05] sm:text-5xl">
              {state.kind === "reading" ? "Reading…" : dragging ? "Let go" : "Drop a PDF"}
            </span>
            <span className="font-display mt-1 block text-[2.5rem] leading-[1.05] text-muted-foreground underline decoration-border decoration-1 underline-offset-[10px] transition-colors group-hover:text-foreground group-hover:decoration-muted-foreground group-focus-visible:text-foreground sm:text-5xl">
              or choose one
            </span>
          </button>

          <p className="mt-6 max-w-xs text-sm leading-relaxed text-muted-foreground">
            {state.kind === "error"
              ? state.message
              : "We'll check what it needs and open the right tool with it loaded."}
          </p>

          <div className="mt-8 space-y-2.5" aria-hidden>
            {[100, 84, 92, 60].map((w, i) => (
              <div key={i} className="h-1.5 rounded-full bg-border" style={{ width: `${w}%` }} />
            ))}
          </div>
          {state.kind === "reading" && (
            <Loader2 className="absolute right-7 top-7 h-4 w-4 animate-spin text-muted-foreground" aria-label="Reading file" />
          )}
        </>
      )}
    </div>
  );
}

function Result({
  state,
  onOpen,
  onReset,
}: {
  state: Extract<State, { kind: "ready" }>;
  onOpen: (href: string) => void;
  onReset: () => void;
}) {
  const { facts, suggestions } = state;
  const single = facts.length === 1 ? facts[0] : null;
  const status = single?.encrypted ? "Locked" : single?.damaged ? "Damaged" : "Ready";
  const meta = single
    ? [
        single.pages != null && `${single.pages} page${single.pages === 1 ? "" : "s"}`,
        formatSize(single.size),
        single.formFields > 0 && `${single.formFields} form field${single.formFields === 1 ? "" : "s"}`,
      ].filter(Boolean).join(" · ")
    : `${facts.length} files · ${formatSize(facts.reduce((n, f) => n + f.size, 0))}`;

  return (
    <div className="flex flex-1 flex-col">
      <span
        className={cn(
          "font-label flex items-center gap-2",
          status === "Ready" ? "text-emerald-500/80" : "text-[#e0a4a4]"
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
        {status}
      </span>
      <p className="font-display mt-4 truncate text-3xl leading-tight" title={single?.name}>
        {single ? single.name.replace(/\.pdf$/i, "") : `${facts.length} PDFs`}
      </p>
      <p className="font-label mt-2 text-muted-foreground">{meta}</p>

      <ul className="mt-6 space-y-1" aria-label="Suggested tools">
        {suggestions.map((s, i) => {
          const tool = toolsByHref.get(s.href);
          if (!tool) return null;
          const Icon = tool.icon;
          return (
            <li key={s.href}>
              <button
                type="button"
                onClick={() => onOpen(s.href)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                  i === 0 ? "bg-paper text-ink hover:bg-white" : "hover:bg-[#232323]"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", i === 0 ? "text-ink" : "text-muted-foreground")} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{tool.label}</span>
                  <span className={cn("block truncate text-xs", i === 0 ? "text-ink/70" : "text-muted-foreground")}>
                    {s.reason}
                  </span>
                </span>
                <ArrowRight className={cn("h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5", i === 0 ? "" : "text-muted-foreground")} />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex items-center justify-between gap-4 pt-6 text-xs text-muted-foreground">
        <button type="button" onClick={onReset} className="underline-offset-4 hover:text-foreground hover:underline">
          Use a different file
        </button>
        <a href="#tools" className="underline-offset-4 hover:text-foreground hover:underline">
          Other tools
        </a>
      </div>
    </div>
  );
}
