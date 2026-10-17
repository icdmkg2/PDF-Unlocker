"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Check, Upload } from "lucide-react";

export interface Signature {
  dataUrl: string;
  /** Height divided by width. */
  aspect: number;
}

/** Crop a canvas to its drawn pixels so the stamp has no empty margin. */
function trimToInk(src: HTMLCanvasElement): Signature | null {
  const ctx = src.getContext("2d")!;
  const { width, height } = src;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  const pad = 6;
  const w = maxX - minX + 1 + pad * 2;
  const h = maxY - minY + 1 + pad * 2;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  out.getContext("2d")!.drawImage(src, minX - pad, minY - pad, w, h, 0, 0, w, h);
  return { dataUrl: out.toDataURL("image/png"), aspect: h / w };
}

/** Draw with mouse, finger or pen on a transparent canvas, or upload an image of a signature. */
export function SignaturePad({ onDone }: { onDone: (sig: Signature) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);
  const [color, setColor] = useState("#1a2340");

  useEffect(() => {
    const c = canvasRef.current!;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = Math.round(rect.width * dpr);
    c.height = Math.round(rect.height * dpr);
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const point = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onDown = (e: React.PointerEvent) => {
    canvasRef.current!.setPointerCapture(e.pointerId);
    drawing.current = point(e);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = point(e);
    ctx.strokeStyle = color;
    // Pens report pressure; mouse and touch report 0.5.
    ctx.lineWidth = 1.2 + (e.pressure || 0.5) * 2.4;
    ctx.beginPath();
    ctx.moveTo(drawing.current.x, drawing.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    drawing.current = p;
    if (empty) setEmpty(false);
  };

  const clear = () => {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setEmpty(true);
  };

  const upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      // Re-encode as PNG so pdf-lib can embed it whatever the source format.
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d")!.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      onDone({ dataUrl: c.toDataURL("image/png"), aspect: img.naturalHeight / img.naturalWidth });
    };
    img.src = url;
    e.target.value = "";
  };

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-lg border border-border bg-[#f2efe9]">
        <canvas
          ref={canvasRef}
          aria-label="Signature drawing area"
          className="block h-44 w-full touch-none cursor-crosshair"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={() => (drawing.current = null)}
          onPointerCancel={() => (drawing.current = null)}
        />
        <span className="pointer-events-none absolute inset-x-8 bottom-10 border-b border-dashed border-[#b9b4aa]" aria-hidden />
        {empty && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-[#8a8680]">
            Sign here with your mouse, finger or pen
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {["#1a2340", "#0c0c0c", "#1d4ed8"].map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Ink color ${c}`}
            aria-pressed={color === c}
            onClick={() => setColor(c)}
            className="h-6 w-6 rounded-full border-2"
            style={{ background: c, borderColor: color === c ? "var(--paper)" : "transparent" }}
          />
        ))}
        <Button variant="ghost" size="sm" onClick={clear} disabled={empty}>
          <Eraser className="h-4 w-4" /> Clear
        </Button>
        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm hover:bg-accent">
          <Upload className="h-4 w-4" /> Upload image
          <input id="signature-upload" type="file" accept="image/png,image/jpeg" className="hidden" onChange={upload} />
        </label>
        <Button
          className="ml-auto"
          disabled={empty}
          onClick={() => {
            const sig = trimToInk(canvasRef.current!);
            if (sig) onDone(sig);
          }}
        >
          <Check className="h-4 w-4" /> Use this signature
        </Button>
      </div>
    </div>
  );
}
