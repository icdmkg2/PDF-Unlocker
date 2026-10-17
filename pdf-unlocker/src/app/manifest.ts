import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PDF Studio",
    short_name: "PDF Studio",
    description: "Work on PDFs without uploading them. Merge, edit, unlock, redact and compress on your device.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c0c0c",
    theme_color: "#0c0c0c",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    file_handlers: [
      { action: "/edit", accept: { "application/pdf": [".pdf"] } },
    ],
  } as MetadataRoute.Manifest;
}
