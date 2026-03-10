"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToolLayout } from "@/components/tool-layout";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { Unlock, Eye, EyeOff, Download, Printer, RotateCcw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function UnlockPage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlockedUrl, setUnlockedUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setError(null);
    setUnlockedUrl(null);
  }, []);

  const handleRemove = useCallback(() => {
    setFile(null);
    setError(null);
    setUnlockedUrl(null);
    setProgress(null);
  }, []);

  const handleUnlock = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    setUnlockedUrl(null);
    setProgress("Loading pdfcpu (first time may take a moment)...");

    try {
      const { Pdfcpu } = await import("pdfcpu-wasm");
      const pdfcpu = new Pdfcpu("/pdfcpu.wasm");

      setProgress("Decrypting PDF (preserving text)...");

      const inputFile = new File([await file.arrayBuffer()], "input.pdf", { type: "application/pdf" });
      const args = ["decrypt"];
      if (password) {
        args.push("-upw", password, "-opw", password);
      }
      args.push("/input/input.pdf", "/output/output.pdf");

      const result = await pdfcpu.run(args, [inputFile]);
      const outputFile = await result.readFile("output.pdf", "application/pdf");

      if (!outputFile) throw new Error("Decryption failed. Please check the password and try again.");

      setUnlockedUrl(URL.createObjectURL(outputFile));
      setProgress(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("password") || msg.includes("Password") || msg.includes("encrypted")) {
        setError(password ? "Incorrect password. Please try again." : "This PDF is password-protected. Please enter the password.");
      } else if (msg.includes("Decryption failed")) {
        setError(msg);
      } else {
        setError("Failed to unlock PDF: " + msg);
      }
      setProgress(null);
    } finally {
      setIsLoading(false);
    }
  };

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
    setFile(null);
    setPassword("");
    setError(null);
    setUnlockedUrl(null);
    setProgress(null);
  };

  return (
    <ToolLayout
      title="Unlock PDF"
      description="Remove password protection while preserving all text content"
      icon={Unlock}
    >
      <div className="space-y-5">
        <PdfDropzone
          onFiles={handleFiles}
          files={file ? [file] : []}
          onRemove={handleRemove}
          label="Drop your password-protected PDF here"
        />

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password">PDF Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter the PDF password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Progress */}
        {progress && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
            {progress}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Success */}
        {unlockedUrl && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary text-sm">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              PDF unlocked — text fully preserved!
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

        {/* Actions */}
        {!unlockedUrl ? (
          <Button onClick={handleUnlock} disabled={!file || isLoading} className="w-full">
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Unlocking...</>
            ) : (
              <><Unlock className="h-4 w-4 mr-2" /> Unlock PDF</>
            )}
          </Button>
        ) : (
          <Button onClick={reset} variant="outline" className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" /> Unlock Another PDF
          </Button>
        )}
      </div>
    </ToolLayout>
  );
}
