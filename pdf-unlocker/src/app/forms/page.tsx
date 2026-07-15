"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { EncryptedNotice } from "@/components/encrypted-notice";
import { ClipboardList, Download, RotateCcw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { listFormFields, fillFormFields, type FormFieldInfo } from "@/lib/pdf-forms";
import { revokeUrl } from "@/lib/pdf-utils";
import { addHistoryEntry } from "@/lib/local-history";

export default function FormsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fields, setFields] = useState<FormFieldInfo[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [flatten, setFlatten] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    revokeUrl(resultUrl);
    setFile(f);
    setError(null);
    setResultUrl(null);
    setIsLoading(true);
    try {
      const list = await listFormFields(f);
      setFields(list);
      const initial: Record<string, string> = {};
      for (const field of list) initial[field.name] = field.value;
      setValues(initial);
      if (!list.length) {
        setError("No fillable form fields found in this PDF.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read form fields.");
      setFields([]);
    } finally {
      setIsLoading(false);
    }
  }, [resultUrl]);

  const handleRemove = useCallback(() => {
    revokeUrl(resultUrl);
    setFile(null);
    setFields([]);
    setValues({});
    setError(null);
    setResultUrl(null);
  }, [resultUrl]);

  const handleFill = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    try {
      const bytes = await fillFormFields(file, values, flatten);
      revokeUrl(resultUrl);
      setResultUrl(URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" })));
      await addHistoryEntry({ tool: "Fill Forms", fileName: file.name, size: file.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fill failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = file.name.replace(/\.pdf$/i, "_filled.pdf");
    a.click();
  };

  return (
    <ToolLayout
      title="Fill PDF Forms"
      description="Detect AcroForm fields, fill them in, and optionally flatten"
      icon={ClipboardList}
      wide
    >
      <div className="space-y-5">
        <PdfDropzone
          onFiles={handleFiles}
          files={file ? [file] : []}
          onRemove={handleRemove}
          label="Drop a fillable PDF here"
        />
        <EncryptedNotice file={file} />

        {fields.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{fields.length} field(s) detected</p>
            <div className="max-h-[28rem] overflow-y-auto space-y-3 pr-1">
              {fields.map((field) => (
                <div key={field.name} className="space-y-1.5 rounded-xl border border-border bg-card/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={field.name} className="truncate">{field.name}</Label>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{field.type}</span>
                  </div>
                  <Input
                    id={field.name}
                    value={values[field.name] ?? ""}
                    disabled={field.readOnly}
                    onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                    placeholder={field.type === "CheckBox" ? "Yes / No" : "Value"}
                  />
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={flatten}
                onChange={(e) => setFlatten(e.target.checked)}
                className="rounded"
              />
              Flatten form (make fields non-editable)
            </label>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {resultUrl && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary text-sm">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              Form filled successfully
            </div>
            <Button onClick={handleDownload} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Download PDF
            </Button>
          </div>
        )}

        {fields.length > 0 && !resultUrl && (
          <Button onClick={handleFill} disabled={isLoading} className="w-full">
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Filling…</>
            ) : (
              <><ClipboardList className="h-4 w-4 mr-2" /> Fill &amp; Download</>
            )}
          </Button>
        )}

        {resultUrl && (
          <Button onClick={handleRemove} variant="outline" className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" /> Start Over
          </Button>
        )}
      </div>
    </ToolLayout>
  );
}
