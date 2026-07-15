# PDF Studio

Privacy-first PDF toolkit that runs entirely in your browser. Files never upload to a server.

## Stack

- **Next.js 16** (App Router) + React 19 + Tailwind CSS 4
- **pdf-lib** - create/edit PDFs
- **pdf.js** - render & text extract
- **pdfcpu-wasm** - unlock / protect / repair fallback
- **Fabric.js** - annotation canvas
- **html2canvas**, **JSZip**, **diff**

## Tools (24)

| Category | Tools |
|----------|--------|
| Organize | Merge, Split (ZIP), Organize, Compress (lossy), Repair |
| To PDF | JPG→PDF, HTML→PDF, Scan |
| From PDF | PDF→JPG, Extract Text, Extract Images, PDF/A metadata (experimental) |
| Edit | Edit/annotate, Rotate, Page numbers, Watermark (text/image), Crop (hard/soft), Forms, Metadata |
| Security | Unlock, Protect, Sign (image stamp), Redact (true raster), Compare (visual/pixel/text) |

## Honest limitations

- **Compress / Edit export / hard crop / redact** rasterize pages → text/links may be lost
- **Sign** is a visual stamp, not a certificate digital signature
- **PDF/A** only adds identification XMP (not full archival compliance)
- **HTML→PDF** renders as images (not selectable text)

## Develop

```bash
cd pdf-unlocker
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Privacy

All PDF processing uses WebAssembly and client-side libraries. There is no file upload API. The host only serves static assets and the Next.js app shell.
