"use client";

import { useState, useRef, useEffect, useMemo, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { Camera, ImageIcon, QrCode, X } from "lucide-react";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { ResultCard } from "@/components/result-card";
import { ErrorNote, Step, Steps, Working } from "@/components/steps";
import { imagesToPDF } from "@/lib/images-to-pdf";
import { cn } from "@/lib/utils";
import { addHistoryEntry } from "@/lib/local-history";

type Tab = "camera" | "upload" | "qr";

export default function ScanPage() {
  const [tab, setTab] = useState<Tab>("camera");
  const [isMobile, setIsMobile] = useState(false);
  const [capturedImages, setCapturedImages] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Blob | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    const mobile = window.matchMedia("(pointer: coarse)").matches;
    setIsMobile(mobile);
    if (mobile) setTab("camera");
    else setTab("qr");
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      setError(null);
    } catch {
      setError("Could not access camera. Please grant permission.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")!.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `scan_${Date.now()}.jpg`, { type: "image/jpeg" });
      setCapturedImages((prev) => [...prev, file]);
    }, "image/jpeg", 0.92);
  };

  const handleConvert = async () => {
    if (!capturedImages.length) return;
    setIsLoading(true);
    setError(null);
    try {
      const bytes = await imagesToPDF(capturedImages);
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResult(blob);
      stopCamera();
      void addHistoryEntry({ tool: "Scan", fileName: `${capturedImages.length} scanned pages`, size: blob.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setCapturedImages([]);
    setError(null);
    setResult(null);
  };

  const tabs: { id: Tab; label: string; icon: typeof Camera; hidden?: boolean }[] = [
    { id: "camera", label: "Camera", icon: Camera },
    { id: "upload", label: "Upload", icon: ImageIcon },
    { id: "qr", label: "QR Code", icon: QrCode, hidden: isMobile },
  ];

  return (
    <ToolLayout title="Scan to PDF" description="Photograph paper pages with your camera and save them as one PDF" icon={Camera} medium>
      <Steps>
        <Step
          n={1}
          title="Capture pages"
          state={result ? "done" : "current"}
          summary={`${capturedImages.length} page${capturedImages.length === 1 ? "" : "s"}`}
          onChange={() => setResult(null)}
        >
          <div className="flex gap-1 border-b border-border" role="tablist">
            {tabs.filter((t) => !t.hidden).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => { if (id !== "camera" && cameraActive) stopCamera(); setTab(id); }}
                className={cn(
                  "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {tab === "camera" && (
            <div className="space-y-3">
              <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
                <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
                {!cameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button onClick={startCamera} variant="outline">
                      <Camera className="h-4 w-4" /> Start camera
                    </Button>
                  </div>
                )}
              </div>
              {cameraActive && (
                <Button onClick={capturePhoto} className="w-full">
                  <Camera className="h-4 w-4" /> Capture page {capturedImages.length + 1}
                </Button>
              )}
            </div>
          )}

          {tab === "upload" && (
            <PdfDropzone kind="image" multiple onFiles={(files) => setCapturedImages((prev) => [...prev, ...files])} label="Drop photos of the pages" />
          )}

          {tab === "qr" && (
            <div className="space-y-4 py-4 text-center">
              <QrCodeDisplay />
              <p className="text-sm text-muted-foreground">Scan this with your phone to open Scan there and use its camera.</p>
            </div>
          )}

          {capturedImages.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Captured pages">
              {capturedImages.map((f, i) => (
                <li key={`${f.name}-${i}`} className="relative">
                  <Thumb file={f} alt={`Page ${i + 1}`} />
                  <button
                    type="button"
                    aria-label={`Remove page ${i + 1}`}
                    onClick={() => setCapturedImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {isLoading && <Working>Building the PDF…</Working>}
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button onClick={handleConvert} disabled={!capturedImages.length || isLoading} className="w-full">
            Create PDF from {capturedImages.length || "the"} page{capturedImages.length === 1 ? "" : "s"}
          </Button>
        </Step>

        <Step n={2} title="Save" state={result ? "current" : "todo"}>
          {result && (
            <ResultCard verb="Scanned" blob={result} fileName="scan.pdf" onReset={reset} resetLabel="Scan more" />
          )}
        </Step>
      </Steps>
    </ToolLayout>
  );
}

/** Preview of a captured image. URLs live as long as the page; scans are a handful of photos. */
function Thumb({ file, alt }: { file: File; alt: string }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className="h-16 w-16 rounded-md border border-border object-cover" />;
}

const noopSubscribe = () => () => {};

function QrCodeDisplay() {
  const url = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin + "/scan",
    () => ""
  );

  if (!url) return null;

  return (
    <div className="inline-block p-4 bg-white rounded-xl border border-border mx-auto">
      <QrCodeSvg value={url} size={180} />
    </div>
  );
}

function QrCodeSvg({ value, size }: { value: string; size: number }) {
  const [QRCodeSVG, setQRCodeSVG] = useState<React.ComponentType<{ value: string; size: number }> | null>(null);
  useEffect(() => {
    import("qrcode.react").then((m) => setQRCodeSVG(() => m.QRCodeSVG));
  }, []);
  if (!QRCodeSVG) return <div style={{ width: size, height: size }} className="bg-muted animate-pulse rounded" />;
  return <QRCodeSVG value={value} size={size} />;
}
