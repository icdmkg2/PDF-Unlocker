"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { FileOrderList } from "@/components/file-order-list";
import { ResultCard, formatSize } from "@/components/result-card";
import { ErrorNote, Step, Steps } from "@/components/steps";
import { Pills } from "@/components/workbench";
import { Layers, Plus, X, CheckCircle2, AlertCircle, Loader2, Circle } from "lucide-react";
import { STEP_LABELS, orderSteps, outputNames, runSteps, validateSteps, type BatchStep } from "@/lib/batch";
import { downloadBlob } from "@/lib/pdf-utils";
import { addHistoryEntry } from "@/lib/local-history";
import { cn } from "@/lib/utils";

type Stage = "add" | "steps" | "running" | "done";
type FileResult = { name: string; status: "waiting" | "working" | "done" | "failed"; bytes?: Uint8Array; message?: string };

const DEFAULTS: Record<BatchStep["kind"], BatchStep> = {
  unlock: { kind: "unlock", password: "" },
  rotate: { kind: "rotate", angle: 90 },
  pageNumbers: { kind: "pageNumbers", position: "bottom-center" },
  watermark: { kind: "watermark", text: "CONFIDENTIAL" },
  metadata: { kind: "metadata", title: "", author: "" },
  compress: { kind: "compress" },
  protect: { kind: "protect", password: "" },
};

function StepSettings({ step, onChange }: { step: BatchStep; onChange: (s: BatchStep) => void }) {
  switch (step.kind) {
    case "unlock":
    case "protect":
      return (
        <Input
          id={`batch-${step.kind}-password`}
          type="password"
          aria-label={`${STEP_LABELS[step.kind]} password`}
          placeholder={step.kind === "unlock" ? "Password, if the files need one" : "Password for every file"}
          value={step.password}
          autoComplete="new-password"
          onChange={(e) => onChange({ ...step, password: e.target.value })}
          className="h-8"
        />
      );
    case "rotate":
      return (
        <Pills
          label="Rotation"
          options={[{ id: 90, label: "↻ 90°" }, { id: 180, label: "180°" }, { id: 270, label: "↺ 90°" }]}
          value={step.angle}
          onChange={(angle) => onChange({ ...step, angle: angle as 90 | 180 | 270 })}
        />
      );
    case "pageNumbers":
      return (
        <Pills
          label="Position"
          options={[{ id: "bottom-center", label: "Bottom center" }, { id: "bottom-right", label: "Bottom right" }, { id: "top-right", label: "Top right" }]}
          value={step.position}
          onChange={(position) => onChange({ ...step, position })}
        />
      );
    case "watermark":
      return <Input id="batch-watermark" aria-label="Watermark text" value={step.text} onChange={(e) => onChange({ ...step, text: e.target.value })} className="h-8" />;
    case "metadata":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input id="batch-title" aria-label="Title" placeholder="Title" value={step.title} onChange={(e) => onChange({ ...step, title: e.target.value })} className="h-8" />
          <Input id="batch-author" aria-label="Author" placeholder="Author" value={step.author} onChange={(e) => onChange({ ...step, author: e.target.value })} className="h-8" />
        </div>
      );
    case "compress":
      return <p className="text-xs text-muted-foreground">Keeps text, links and forms. Files that can&apos;t shrink stay as they are.</p>;
  }
}

export default function BatchPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [stage, setStage] = useState<Stage>("add");
  const [steps, setSteps] = useState<BatchStep[]>([{ kind: "compress" }]);
  const [pattern, setPattern] = useState("{name}");
  const [results, setResults] = useState<FileResult[]>([]);
  const [zip, setZip] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback((added: File[]) => {
    setFiles((prev) => [...prev, ...added]);
  }, []);

  const reset = () => {
    setFiles([]);
    setStage("add");
    setResults([]);
    setZip(null);
    setError(null);
  };

  const available = (Object.keys(STEP_LABELS) as BatchStep["kind"][]).filter((k) => !steps.some((s) => s.kind === k));
  const ordered = orderSteps(steps);
  const names = outputNames(pattern, files.map((f) => f.name));
  const total = files.reduce((n, f) => n + f.size, 0);

  const run = async () => {
    const problem = validateSteps(steps);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setStage("running");
    const out: FileResult[] = files.map((_, i) => ({ name: names[i], status: "waiting" }));
    setResults([...out]);
    for (let i = 0; i < files.length; i++) {
      out[i] = { ...out[i], status: "working" };
      setResults([...out]);
      try {
        out[i] = { ...out[i], status: "done", bytes: await runSteps(files[i], steps) };
      } catch (err) {
        out[i] = { ...out[i], status: "failed", message: err instanceof Error ? err.message : "Failed." };
      }
      setResults([...out]);
    }
    const ok = out.filter((r) => r.status === "done");
    if (ok.length) {
      const JSZip = (await import("jszip")).default;
      const z = new JSZip();
      for (const r of ok) z.file(r.name, r.bytes!);
      setZip(await z.generateAsync({ type: "blob" }));
      void addHistoryEntry({ tool: "Batch", fileName: `${ok.length} files`, size: ok.reduce((n, r) => n + r.bytes!.length, 0) });
    }
    setStage("done");
  };

  const done = results.filter((r) => r.status === "done");
  const failed = results.filter((r) => r.status === "failed");

  return (
    <ToolLayout title="Batch" description="Run the same steps on many PDFs at once" icon={Layers} medium>
      <Steps>
        <Step
          n={1}
          title="Add PDFs"
          state={stage === "add" ? "current" : "done"}
          summary={`${files.length} file${files.length === 1 ? "" : "s"} · ${formatSize(total)}`}
          onChange={stage === "steps" ? () => setStage("add") : undefined}
        >
          <PdfDropzone onFiles={handleFiles} multiple label={files.length ? "Add more PDFs" : "Drop all the PDFs to process"} />
          <FileOrderList files={files} onChange={setFiles} />
          <Button onClick={() => setStage("steps")} disabled={!files.length} className="w-full">
            Continue
          </Button>
        </Step>

        <Step
          n={2}
          title="Choose steps"
          state={stage === "steps" ? "current" : stage === "add" ? "todo" : "done"}
          summary={ordered.map((s) => STEP_LABELS[s.kind]).join(" → ")}
          onChange={stage === "done" ? () => { setStage("steps"); setZip(null); setResults([]); } : undefined}
        >
          <ol className="space-y-2" aria-label="Steps">
            {ordered.map((step, i) => (
              <li key={step.kind} className="space-y-2 rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-mono text-[11px] text-muted-foreground">{i + 1}</span>
                  <span className="flex-1">{STEP_LABELS[step.kind]}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${STEP_LABELS[step.kind]}`}
                    onClick={() => setSteps(steps.filter((s) => s.kind !== step.kind))}
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <StepSettings step={step} onChange={(next) => setSteps(steps.map((s) => (s.kind === next.kind ? next : s)))} />
              </li>
            ))}
          </ol>

          {available.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs text-muted-foreground">Add a step:</span>
              {available.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSteps([...steps, DEFAULTS[k]])}
                  className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-3 w-3" /> {STEP_LABELS[k]}
                </button>
              ))}
            </div>
          )}
          {steps.some((s) => s.kind === "protect" || s.kind === "unlock") && (
            <p className="text-xs text-muted-foreground">Unlock always runs first and Protect always runs last, so the other steps can read the file.</p>
          )}

          <div className="space-y-1.5">
            <label htmlFor="batch-pattern" className="text-xs text-muted-foreground">
              File names. Use {"{name}"} for the original name and {"{n}"} for its position.
            </label>
            <Input id="batch-pattern" value={pattern} onChange={(e) => setPattern(e.target.value)} />
            {files.length > 0 && <p className="truncate font-mono text-[11px] text-muted-foreground">e.g. {names[0]}</p>}
          </div>

          {error && <ErrorNote>{error}</ErrorNote>}
          <Button onClick={run} disabled={!steps.length} className="w-full">
            <Layers className="h-4 w-4" /> Run on {files.length} file{files.length === 1 ? "" : "s"}
          </Button>
        </Step>

        <Step n={3} title="Save" state={stage === "running" || stage === "done" ? "current" : "todo"}>
          <ul className="divide-y divide-border rounded-lg border border-border bg-card" aria-label="Files">
            {results.map((r, i) => (
              <li key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                {r.status === "done" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : r.status === "failed" ? (
                  <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                ) : r.status === "working" ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{r.name}</span>
                  {r.message && <span className="block truncate text-xs text-destructive">{r.message}</span>}
                </span>
                {r.bytes && (
                  <>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {formatSize(files[i].size)} → {formatSize(r.bytes.length)}
                    </span>
                    <button
                      type="button"
                      onClick={() => downloadBlob(new Blob([r.bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" }), r.name)}
                      className={cn("text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground")}
                    >
                      Download
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>

          {stage === "done" && zip && (
            <ResultCard
              verb={failed.length ? `${done.length} of ${results.length} files done` : `All ${done.length} files done`}
              blob={zip}
              fileName="batch.zip"
              facts={[{ label: "Files", value: String(done.length) }]}
              inputSize={files.filter((_, i) => results[i]?.status === "done").reduce((n, f) => n + f.size, 0) || undefined}
              note={failed.length ? `${failed.length} file${failed.length === 1 ? "" : "s"} failed and ${failed.length === 1 ? "is" : "are"} not in the ZIP. The reason is under each name.` : undefined}
              onReset={reset}
              resetLabel="New batch"
            />
          )}
          {stage === "done" && !zip && (
            <div className="space-y-3">
              <ErrorNote>None of the files could be processed. The reasons are listed above.</ErrorNote>
              <Button variant="outline" onClick={() => setStage("steps")}>Change steps</Button>
            </div>
          )}
        </Step>
      </Steps>
    </ToolLayout>
  );
}
