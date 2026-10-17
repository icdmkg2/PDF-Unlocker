"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { ResultCard, formatSize } from "@/components/result-card";
import { ErrorNote, Step, Steps, Working } from "@/components/steps";
import { Lock, Eye, EyeOff } from "lucide-react";
import { protectPDF } from "@/lib/pdf-protect";
import {
  RememberPassword,
  SavedPasswordPicker,
  useSavedPasswords,
  type RememberChoice,
} from "@/components/saved-passwords";
import { markPasswordUsed, savePassword } from "@/lib/saved-passwords";
import { addHistoryEntry } from "@/lib/local-history";

const NO_REMEMBER: RememberChoice = { remember: false, name: "" };

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        autoComplete="new-password"
        onChange={(e) => onChange(e.target.value)}
        className="pr-10"
      />
      <button
        type="button"
        aria-label={show ? "Hide password" : "Show password"}
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function ProtectPage() {
  const saved = useSavedPasswords();
  const [remember, setRemember] = useState<RememberChoice>(NO_REMEMBER);
  const [file, setFile] = useState<File | null>(null);
  const [userPw, setUserPw] = useState("");
  const [userPwConfirm, setUserPwConfirm] = useState("");
  const [ownerPw, setOwnerPw] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Blob | null>(null);
  const [savedName, setSavedName] = useState<string | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setError(null);
    setResult(null);
  }, []);

  const reset = () => {
    setFile(null);
    setUserPw("");
    setUserPwConfirm("");
    setOwnerPw("");
    setRemember(NO_REMEMBER);
    setError(null);
    setResult(null);
    setSavedName(null);
  };

  const handleProtect = async () => {
    if (!file || !userPw) return;
    if (userPw !== userPwConfirm) {
      setError("The two passwords don't match.");
      return;
    }
    setWorking(true);
    setError(null);
    try {
      const bytes = await protectPDF(file, userPw, ownerPw);
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResult(blob);
      const existing = saved.find((p) => p.password === userPw);
      if (remember.remember && !existing) {
        savePassword(userPw, remember.name);
        setSavedName(remember.name.trim() || "your saved passwords");
      } else {
        setSavedName(existing?.name ?? null);
      }
      markPasswordUsed(userPw);
      await addHistoryEntry({ tool: "Protect", fileName: file.name, size: blob.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Encryption failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <ToolLayout title="Protect PDF" description="Lock a PDF so it needs a password to open" icon={Lock} medium>
      <Steps>
        <Step n={1} title="Add a PDF" state={file ? "done" : "current"} summary={file && `${file.name} · ${formatSize(file.size)}`} onChange={reset}>
          <PdfDropzone onFiles={handleFiles} label="Drop the PDF to lock" />
        </Step>

        <Step
          n={2}
          title="Set a password"
          state={!file ? "todo" : result ? "done" : "current"}
          summary="AES-256"
          onChange={() => setResult(null)}
        >
          <div className="space-y-1.5">
            <Label htmlFor="userPw">Password to open <span className="text-destructive">*</span></Label>
            <PasswordInput id="userPw" value={userPw} onChange={setUserPw} placeholder="Needed to open the PDF" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="userPwConfirm">Confirm password</Label>
            <PasswordInput id="userPwConfirm" value={userPwConfirm} onChange={setUserPwConfirm} placeholder="Type it again" />
          </div>

          <SavedPasswordPicker
            selected={userPw}
            onPick={(pw) => {
              setUserPw(pw);
              setUserPwConfirm(pw);
            }}
          />
          {userPw && !saved.some((p) => p.password === userPw) && (
            <RememberPassword id="protect" value={remember} onChange={setRemember} />
          )}

          <details className="group rounded-lg border border-border px-3 py-2">
            <summary className="cursor-pointer text-xs text-muted-foreground group-open:mb-3">
              Separate owner password (optional)
            </summary>
            <div className="space-y-1.5">
              <Label htmlFor="ownerPw">Owner password</Label>
              <PasswordInput id="ownerPw" value={ownerPw} onChange={setOwnerPw} placeholder="Defaults to the password above" />
              <p className="text-xs text-muted-foreground">Some apps ask for this one to change permissions.</p>
            </div>
          </details>

          {working && <Working>Encrypting (first run loads pdfcpu)…</Working>}
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button onClick={handleProtect} disabled={!userPw || working} className="w-full">
            <Lock className="h-4 w-4" /> Protect PDF
          </Button>
        </Step>

        <Step n={3} title="Save" state={result ? "current" : "todo"}>
          {result && file && (
            <ResultCard
              verb="Locked"
              blob={result}
              fileName={file.name.replace(/\.pdf$/i, "") + "_protected.pdf"}
              note={
                savedName
                  ? `The password is in “${savedName}” on this device.`
                  : "Keep the password somewhere safe. Without it the file can't be opened, here or anywhere."
              }
              onReset={reset}
              resetLabel="Protect another"
            />
          )}
        </Step>
      </Steps>
    </ToolLayout>
  );
}
