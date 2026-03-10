"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { Lock, Eye, EyeOff, Download, RotateCcw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { protectPDF } from "@/lib/pdf-protect";

export default function ProtectPage() {
  const [file, setFile] = useState<File | null>(null);
  const [userPw, setUserPw] = useState("");
  const [ownerPw, setOwnerPw] = useState("");
  const [showUser, setShowUser] = useState(false);
  const [showOwner, setShowOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setError(null);
    setResultUrl(null);
  }, []);

  const handleRemove = useCallback(() => {
    setFile(null);
    setError(null);
    setResultUrl(null);
  }, []);

  const handleProtect = async () => {
    if (!file || !userPw) return;
    setIsLoading(true);
    setError(null);
    setProgress("Loading pdfcpu (first time may take a moment)...");
    try {
      setProgress("Encrypting PDF...");
      const bytes = await protectPDF(file, userPw, ownerPw);
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
      setProgress(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Encryption failed.");
      setProgress(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `protected_${file.name}`;
    a.click();
  };

  const reset = () => {
    setFile(null);
    setUserPw("");
    setOwnerPw("");
    setError(null);
    setResultUrl(null);
    setProgress(null);
  };

  return (
    <ToolLayout
      title="Protect PDF"
      description="Encrypt a PDF with a password to prevent unauthorized access"
      icon={Lock}
    >
      <div className="space-y-5">
        <PdfDropzone
          onFiles={handleFiles}
          files={file ? [file] : []}
          onRemove={handleRemove}
          label="Drop your PDF here"
        />

        {/* User password */}
        <div className="space-y-1.5">
          <Label htmlFor="userPw">User Password <span className="text-destructive">*</span></Label>
          <div className="relative">
            <Input
              id="userPw"
              type={showUser ? "text" : "password"}
              placeholder="Password to open the PDF"
              value={userPw}
              onChange={(e) => setUserPw(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowUser(!showUser)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showUser ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Owner password */}
        <div className="space-y-1.5">
          <Label htmlFor="ownerPw">Owner Password <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <div className="relative">
            <Input
              id="ownerPw"
              type={showOwner ? "text" : "password"}
              placeholder="Password to edit/print the PDF (defaults to user password)"
              value={ownerPw}
              onChange={(e) => setOwnerPw(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowOwner(!showOwner)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showOwner ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">If omitted, the owner password will match the user password</p>
        </div>

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

        {resultUrl && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary text-sm">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              PDF encrypted successfully!
            </div>
            <Button onClick={handleDownload} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Download protected PDF
            </Button>
          </div>
        )}

        {!resultUrl ? (
          <Button onClick={handleProtect} disabled={!file || !userPw || isLoading} className="w-full">
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Encrypting...</>
            ) : (
              <><Lock className="h-4 w-4 mr-2" /> Protect PDF</>
            )}
          </Button>
        ) : (
          <Button onClick={reset} variant="outline" className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" /> Protect Another PDF
          </Button>
        )}
      </div>
    </ToolLayout>
  );
}
