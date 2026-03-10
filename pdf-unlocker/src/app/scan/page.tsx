"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ToolLayout } from "@/components/tool-layout";
import { Camera, Download, RotateCcw, Loader2, CheckCircle2, AlertCircle, ImageIcon, QrCode } from "lucide-react";
import { imagesToPDF } from "@/lib/images-to-pdf";
import { cn } from "@/lib/utils";

type Tab = "camera" | "upload" | "qr";

export default function ScanPage() {
  const [tab, setTab] = useState<Tab>("camera");
  const [isMobile, setIsMobile] = useState(false);
  const [capturedImages, setCapturedImages] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
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

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    if (files.length) setCapturedImages((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const handleConvert = async () => {
    if (!capturedImages.length) return;
    setIsLoading(true);
    setError(null);
    try {
      const bytes = await imagesToPDF(capturedImages);
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = "scan.pdf";
    a.click();
  };

  const reset = () => {
    setCapturedImages([]);
    setError(null);
    setResultUrl(null);
  };

  const tabs: { id: Tab; label: string; icon: typeof Camera; hidden?: boolean }[] = [
    { id: "camera", label: "Camera", icon: Camera },
    { id: "upload", label: "Upload", icon: ImageIcon },
    { id: "qr", label: "QR Code", icon: QrCode, hidden: isMobile },
  ];

  return (
    <ToolLayout
      title="Scan to PDF"
      description="Convert photos or camera captures to a PDF"
      icon={Camera}
    >
      <div className="space-y-5">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {tabs.filter((t) => !t.hidden).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { if (id !== "camera" && cameraActive) stopCamera(); setTab(id); }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                tab === id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Camera tab */}
        {tab === "camera" && (
          <div className="space-y-3">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              {!cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button onClick={startCamera} variant="outline">
                    <Camera className="h-4 w-4 mr-2" /> Start Camera
                  </Button>
                </div>
              )}
            </div>
            {cameraActive && (
              <Button onClick={capturePhoto} className="w-full">
                <Camera className="h-4 w-4 mr-2" /> Capture Photo
              </Button>
            )}
          </div>
        )}

        {/* Upload tab */}
        {tab === "upload" && (
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
            <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">Drop images here or click to browse</p>
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
              Choose Images
            </label>
          </div>
        )}

        {/* QR Code tab */}
        {tab === "qr" && (
          <div className="text-center space-y-4 py-6">
            <QrCodeDisplay />
            <p className="text-sm text-muted-foreground">
              Scan this QR code with your phone to open the Scan tool on mobile and use your camera directly.
            </p>
          </div>
        )}

        {/* Captured images list */}
        {capturedImages.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">{capturedImages.length} image{capturedImages.length !== 1 ? "s" : ""} ready</p>
            <div className="flex flex-wrap gap-2">
              {capturedImages.map((f, i) => (
                <div key={i} className="relative">
                  <img
                    src={URL.createObjectURL(f)}
                    alt={`Scan ${i + 1}`}
                    className="h-16 w-16 object-cover rounded-md border border-border"
                  />
                  <button
                    onClick={() => setCapturedImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-white text-xs flex items-center justify-center leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
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
              PDF created from {capturedImages.length} image{capturedImages.length !== 1 ? "s" : ""}!
            </div>
            <Button onClick={handleDownload} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Download scan.pdf
            </Button>
          </div>
        )}

        {capturedImages.length > 0 && (
          !resultUrl ? (
            <Button onClick={handleConvert} disabled={isLoading} className="w-full">
              {isLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating PDF...</>
              ) : (
                <><Download className="h-4 w-4 mr-2" /> Create PDF</>
              )}
            </Button>
          ) : (
            <Button onClick={reset} variant="outline" className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" /> Scan More
            </Button>
          )
        )}
      </div>
    </ToolLayout>
  );
}

function QrCodeDisplay() {
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl(window.location.origin + "/scan");
  }, []);

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
