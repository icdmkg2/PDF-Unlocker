"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { EncryptedNotice } from "@/components/encrypted-notice";
import { ResultCard } from "@/components/result-card";
import { ErrorNote, Working } from "@/components/steps";
import { usePdfDoc } from "@/components/workbench";
import { DockDivider, PageCanvas, Viewer } from "@/components/viewer";
import { ClipboardList, Loader2, SlidersHorizontal } from "lucide-react";
import { listFormFields, fillFormFields, type FormFieldInfo } from "@/lib/pdf-forms";
import { cn } from "@/lib/utils";
import { addHistoryEntry } from "@/lib/local-history";

const isCheck = (f: FormFieldInfo) => f.type === "CheckBox";
const isOn = (v: string) => /^(1|true|yes|on|checked)$/i.test(v.trim());

export default function FormsPage() {
  const [file, setFile] = useState<File | null>(null);
  const { doc, pageCount } = usePdfDoc(file);
  const [page, setPage] = useState(0);
  const [fields, setFields] = useState<FormFieldInfo[] | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [flatten, setFlatten] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Blob | null>(null);

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setPage(0);
    setError(null);
    setResult(null);
    setFields(null);
    setWorking("Finding form fields…");
    try {
      const list = await listFormFields(f);
      setFields(list);
      setValues(Object.fromEntries(list.map((field) => [field.name, field.value])));
      const first = list.find((field) => field.widgets.length)?.widgets[0];
      if (first) setPage(first.pageIndex);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read form fields.");
      setFields([]);
    } finally {
      setWorking(null);
    }
  }, []);

  const reset = () => {
    setFile(null);
    setFields(null);
    setValues({});
    setError(null);
    setResult(null);
  };

  const set = (name: string, value: string) => setValues((v) => ({ ...v, [name]: value }));

  const handleFill = async () => {
    if (!file) return;
    setWorking("Saving…");
    setError(null);
    try {
      const bytes = await fillFormFields(file, values, flatten);
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResult(blob);
      await addHistoryEntry({ tool: "Fill Forms", fileName: file.name, size: blob.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fill failed.");
    } finally {
      setWorking(null);
    }
  };

  const all = fields ?? [];
  const filled = all.filter((f) => (isCheck(f) ? isOn(values[f.name] ?? "") : (values[f.name] ?? "").trim())).length;
  const unplaced = all.filter((f) => f.widgets.length === 0);
  const fieldsOnPage = (i: number) => all.filter((f) => f.widgets.some((w) => w.pageIndex === i)).length;

  return (
    <ToolLayout title="Fill PDF Forms" description="Type straight into the form's fields on the page" icon={ClipboardList} wide>
      {!file ? (
        <PdfDropzone onFiles={handleFiles} label="Drop a fillable PDF" />
      ) : result ? (
        <ResultCard
          verb={flatten ? "Filled and locked" : "Filled"}
          blob={result}
          fileName={file.name.replace(/\.pdf$/i, "") + "_filled.pdf"}
          facts={[{ label: "Fields filled", value: `${filled} of ${all.length}` }]}
          actions={
            <Button variant="outline" onClick={() => setResult(null)}>
              <SlidersHorizontal className="h-4 w-4" /> Adjust
            </Button>
          }
          onReset={reset}
          resetLabel="Fill another"
        />
      ) : fields && fields.length === 0 ? (
        <div className="space-y-3 rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
          <p>
            <span className="text-foreground">{file.name}</span> has no fillable fields. To write on it anyway, use{" "}
            <Link href="/edit" className="text-foreground underline underline-offset-2">Edit</Link>.
          </p>
          <Button variant="outline" onClick={reset}>Choose another file</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <EncryptedNotice file={file} />
          {working && !fields && <Working>{working}</Working>}
          {error && <ErrorNote>{error}</ErrorNote>}
          <Viewer
            file={file}
            doc={fields ? doc : null}
            pageCount={pageCount}
            page={page}
            onPage={setPage}
            onChangeFile={reset}
            badgeOf={(i) => {
              const n = fieldsOnPage(i);
              return n ? <span className="absolute right-1 top-1 rounded bg-[#1d4ed8] px-1 font-mono text-[9px] text-white">{n}</span> : null;
            }}
            dock={
              <>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {filled} of {all.length} fields filled
                </span>
                <DockDivider />
                <label htmlFor="flatten" className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <input id="flatten" type="checkbox" checked={flatten} onChange={(e) => setFlatten(e.target.checked)} className="h-4 w-4 accent-[var(--paper)]" />
                  Lock fields after filling
                </label>
                <Button size="sm" onClick={handleFill} disabled={!!working || !fields}>
                  {working && fields ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />} Save
                </Button>
              </>
            }
          >
            {doc && fields && (
              <PageCanvas doc={doc} index={page}>
                {(box) => {
                  const k = box.width / box.ptWidth;
                  return all.flatMap((f) =>
                    f.widgets
                      .map((w, wi) => ({ w, wi }))
                      .filter(({ w }) => w.pageIndex === page)
                      .map(({ w, wi }) => {
                        const style = { left: w.x * k, top: w.y * k, width: w.width * k, height: w.height * k, fontSize: Math.max(9, Math.min(14, w.height * k * 0.6)) };
                        const common = "absolute rounded-[2px] border border-[#1d4ed8]/50 bg-[#dbeafe]/70 text-[#0c0c0c] outline-none focus:border-[#1d4ed8] focus:bg-white";
                        const key = `${f.name}-${wi}`;
                        if (isCheck(f)) {
                          return (
                            <input key={key} type="checkbox" aria-label={f.name} disabled={f.readOnly} checked={isOn(values[f.name] ?? "")} onChange={(e) => set(f.name, e.target.checked ? "Yes" : "No")} className={cn(common, "m-0 cursor-pointer accent-[#1d4ed8]")} style={style} />
                          );
                        }
                        if (f.type === "RadioGroup" && f.options) {
                          const option = f.options[wi];
                          return (
                            <input key={key} type="radio" name={f.name} aria-label={`${f.name}: ${option}`} disabled={f.readOnly} checked={values[f.name] === option} onChange={() => set(f.name, option)} className={cn(common, "m-0 cursor-pointer accent-[#1d4ed8]")} style={style} />
                          );
                        }
                        if (f.options && f.options.length) {
                          return (
                            <select key={key} aria-label={f.name} disabled={f.readOnly} value={values[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)} className={cn(common, "px-1")} style={style}>
                              <option value="" />
                              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          );
                        }
                        return (
                          <input key={key} type="text" aria-label={f.name} title={f.name} disabled={f.readOnly} value={values[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)} className={cn(common, "px-1")} style={style} />
                        );
                      })
                  );
                }}
              </PageCanvas>
            )}
          </Viewer>

          {unplaced.length > 0 && (
            <div className="space-y-3 rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">These fields don&apos;t say where they sit on the page, so fill them here:</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {unplaced.map((f) => (
                  <div key={f.name} className="space-y-1.5">
                    <Label htmlFor={`unplaced-${f.name}`}>{f.name}</Label>
                    <Input id={`unplaced-${f.name}`} value={values[f.name] ?? ""} disabled={f.readOnly} onChange={(e) => set(f.name, e.target.value)} placeholder={isCheck(f) ? "Yes / No" : ""} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
