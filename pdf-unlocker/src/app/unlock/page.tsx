"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import {
  RememberPassword,
  SavedPasswordPicker,
  useSavedPasswords,
  type RememberChoice,
} from "@/components/saved-passwords";
import { Unlock, Eye, EyeOff, Download, Printer, RotateCcw, Loader2, CheckCircle2, AlertCircle, KeyRound } from "lucide-react";
import { unlockPDF, unlockWithAny, type UnlockResult } from "@/lib/pdf-unlock";
import { markPasswordUsed, savePassword } from "@/lib/saved-passwords";
import { addHistoryEntry } from "@/lib/local-history";
import { revokeUrl } from "@/lib/pdf-utils";

const NO_REMEMBER: RememberChoice = { remember: false, name: "" };

export default function UnlockPage() {
  const saved = useSavedPasswords();
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState<RememberChoice>(NO_REMEMBER);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlockedUrl, setUnlockedUrl] = useState<string | null>(null);
  const [usedName, setUsedName] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const isSaved = saved.some((p) => p.password === password);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setError(null);
    setUnlockedUrl((url) => (revokeUrl(url), null));
  }, []);

  const handleRemove = useCallback(() => {
    setFile(null);
    setError(null);
    setUnlockedUrl((url) => (revokeUrl(url), null));
    setProgress(null);
  }, []);

  const finish = async (result: UnlockResult) => {
    if (!file) return;
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (result.password) {
      if (remember.remember && !saved.some((p) => p.password === result.password)) {
        savePassword(result.password, remember.name);
      }
      markPasswordUsed(result.password);
    }
    setUsedName(saved.find((p) => p.password === result.password)?.name ?? null);
    const blob = new Blob([result.bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
    setUnlockedUrl(URL.createObjectURL(blob));
    await addHistoryEntry({ tool: "Unlock", fileName: file.name, size: blob.size });
  };

  const run = async (task: () => Promise<UnlockResult>) => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    setUnlockedUrl((url) => (revokeUrl(url), null));
    setProgress("Decrypting (first run loads pdfcpu)…");
    try {
      await finish(await task());
    } catch (err) {
      setError("Couldn't unlock this PDF. " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setProgress(null);
      setIsLoading(false);
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

  const handleDownload = () => {
    if (!unlockedUrl || !file) return;
    const a = document.createElement("a");
    a.href = unlockedUrl;
    a.download = `unlocked_${file.name}`;
    a.click();
  };

  const handlePrint = () => {
    if (!unlockedUrl) return;
    const w = window.open(unlockedUrl, "_blank");
    if (w) w.addEventListener("load", () => w.print());
  };

  const reset = () => {
    revokeUrl(unlockedUrl);
    setFile(null);
    setPassword("");
    setRemember(NO_REMEMBER);
    setError(null);
    setUnlockedUrl(null);
    setUsedName(null);
    setProgress(null);
  };

  return (
    <ToolLayout
      title="Unlock PDF"
      description="Remove password protection while keeping all text"
      icon={Unlock}
    >
      <div className="space-y-5">
        <PdfDropzone
          onFiles={handleFiles}
          files={file ? [file] : []}
          onRemove={handleRemove}
          label="Drop your password-protected PDF here"
        />

        {!unlockedUrl && (
          <>
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
                  onKeyDown={(e) => e.key === "Enter" && file && !isLoading && handleUnlock()}
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

            {password && !isSaved && (
              <RememberPassword id="unlock" value={remember} onChange={setRemember} />
            )}
          </>
        )}

        {progress && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
            {progress}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {unlockedUrl && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary text-sm">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              {usedName ? `Unlocked with “${usedName}”. Text is preserved.` : "Unlocked. Text is preserved."}
            </div>
            <div className="flex gap-3">
              <Button onClick={handleDownload} className="flex-1">
                <Download className="h-4 w-4 mr-2" /> Download
              </Button>
              <Button onClick={handlePrint} variant="secondary" className="flex-1">
                <Printer className="h-4 w-4 mr-2" /> Print
              </Button>
            </div>
          </div>
        )}

        {!unlockedUrl ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={handleUnlock} disabled={!file || isLoading} className="flex-1">
              {isLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Unlocking…</>
              ) : (
                <><Unlock className="h-4 w-4 mr-2" /> Unlock PDF</>
              )}
            </Button>
            {saved.length > 0 && (
              <Button onClick={handleTrySaved} disabled={!file || isLoading} variant="outline" className="flex-1">
                <KeyRound className="h-4 w-4 mr-2" /> Try saved passwords
              </Button>
            )}
          </div>
        ) : (
          <Button onClick={reset} variant="outline" className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" /> Unlock another PDF
          </Button>
        )}
      </div>
    </ToolLayout>
  );
}
