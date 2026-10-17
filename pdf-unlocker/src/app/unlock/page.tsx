"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { ResultCard, formatSize } from "@/components/result-card";
import { ErrorNote, Step, Steps, Working } from "@/components/steps";
import {
  RememberPassword,
  SavedPasswordPicker,
  useSavedPasswords,
  type RememberChoice,
} from "@/components/saved-passwords";
import { Unlock, Eye, EyeOff, Printer, KeyRound } from "lucide-react";
import { unlockPDF, unlockWithAny, type UnlockResult } from "@/lib/pdf-unlock";
import { markPasswordUsed, savePassword } from "@/lib/saved-passwords";
import { addHistoryEntry } from "@/lib/local-history";

const NO_REMEMBER: RememberChoice = { remember: false, name: "" };

export default function UnlockPage() {
  const saved = useSavedPasswords();
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState<RememberChoice>(NO_REMEMBER);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Blob | null>(null);
  const [usedName, setUsedName] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const isSaved = saved.some((p) => p.password === password);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setError(null);
    setResult(null);
  }, []);

  const finish = async (r: UnlockResult) => {
    if (!file) return;
    if (!r.ok) {
      setError(r.message);
      return;
    }
    if (r.password) {
      if (remember.remember && !saved.some((p) => p.password === r.password)) {
        savePassword(r.password, remember.name);
      }
      markPasswordUsed(r.password);
    }
    setUsedName(saved.find((p) => p.password === r.password)?.name ?? null);
    const blob = new Blob([r.bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
    setResult(blob);
    await addHistoryEntry({ tool: "Unlock", fileName: file.name, size: blob.size });
  };

  const run = async (task: () => Promise<UnlockResult>) => {
    if (!file) return;
    setError(null);
    setResult(null);
    setProgress("Decrypting (first run loads pdfcpu)…");
    try {
      await finish(await task());
    } catch (err) {
      setError("Couldn't unlock this PDF. " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setProgress(null);
    }
  };

  const handleUnlock = () => run(() => unlockPDF(file!, password));

  const handleTrySaved = () =>
    run(() =>
      unlockWithAny(
        file!,
        saved.map((p) => p.password),
        (i) => setProgress(`Trying “${saved[i].name}” (${i + 1} of ${saved.length})…`)
      )
    );

  const handlePrint = () => {
    if (!result) return;
    const w = window.open(URL.createObjectURL(result), "_blank");
    if (w) w.addEventListener("load", () => w.print());
  };

  const reset = () => {
    setFile(null);
    setPassword("");
    setRemember(NO_REMEMBER);
    setError(null);
    setResult(null);
    setUsedName(null);
    setProgress(null);
  };

  return (
    <ToolLayout title="Unlock PDF" description="Remove password protection while keeping all text" icon={Unlock} medium>
      <Steps>
        <Step n={1} title="Add a PDF" state={file ? "done" : "current"} summary={file && `${file.name} · ${formatSize(file.size)}`} onChange={reset}>
          <PdfDropzone onFiles={handleFiles} label="Drop your password-protected PDF here" />
        </Step>

        <Step
          n={2}
          title="Enter the password"
          state={!file ? "todo" : result ? "done" : "current"}
          summary={usedName ? `“${usedName}”` : "Password accepted"}
          onChange={() => setResult(null)}
        >
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Leave empty if the PDF opens without one"
                value={password}
                autoComplete="off"
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !progress && handleUnlock()}
                className="pr-10"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <SavedPasswordPicker onPick={setPassword} selected={password} />
          {password && !isSaved && <RememberPassword id="unlock" value={remember} onChange={setRemember} />}

          {progress && <Working>{progress}</Working>}
          {error && <ErrorNote>{error}</ErrorNote>}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={handleUnlock} disabled={!!progress} className="flex-1">
              <Unlock className="h-4 w-4" /> Unlock PDF
            </Button>
            {saved.length > 0 && (
              <Button onClick={handleTrySaved} disabled={!!progress} variant="outline" className="flex-1">
                <KeyRound className="h-4 w-4" /> Try saved passwords
              </Button>
            )}
          </div>
        </Step>

        <Step n={3} title="Save" state={result ? "current" : "todo"}>
          {result && file && (
            <ResultCard
              verb={usedName ? `Unlocked with “${usedName}”` : "Unlocked"}
              blob={result}
              fileName={file.name.replace(/\.pdf$/i, "") + "_unlocked.pdf"}
              note="Text, links and forms are preserved."
              actions={
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4" /> Print
                </Button>
              }
              onReset={reset}
              resetLabel="Unlock another PDF"
            />
          )}
        </Step>
      </Steps>
    </ToolLayout>
  );
}
