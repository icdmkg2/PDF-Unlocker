import Link from "next/link";
import {
  GitMerge, Scissors, LayoutGrid, Minimize2, Wrench,
  ImageIcon, Globe, Camera, Images, Archive,
  PenTool, RotateCw, Hash, Droplets, Crop,
  Unlock, Lock, PenLine, EyeOff, GitCompare,
  ArrowUpRight, FileType, Tags, ClipboardList,
} from "lucide-react";
import { Logo } from "@/components/logo";

const TOOL_COUNT = 24;

const tools = [
  { icon: PenTool, title: "Edit", desc: "Annotate, draw, sign on canvas", href: "/edit", tone: "#f59e0b" },
  { icon: GitMerge, title: "Merge", desc: "Combine PDFs into one file", href: "/merge", tone: "#60a5fa" },
  { icon: Scissors, title: "Split", desc: "Extract pages or ranges", href: "/split", tone: "#818cf8" },
  { icon: Minimize2, title: "Compress", desc: "Shrink size (lossy flatten)", href: "/compress", tone: "#38bdf8" },
  { icon: Unlock, title: "Unlock", desc: "Decrypt password PDFs", href: "/unlock", tone: "#fb7185" },
  { icon: Lock, title: "Protect", desc: "Encrypt with passwords", href: "/protect", tone: "#f87171" },
  { icon: EyeOff, title: "Redact", desc: "Burn out sensitive content", href: "/redact", tone: "#fb923c" },
  { icon: LayoutGrid, title: "Organize", desc: "Reorder and delete pages", href: "/organize", tone: "#a78bfa" },
  { icon: RotateCw, title: "Rotate", desc: "Fix page orientation", href: "/rotate", tone: "#fbbf24" },
  { icon: Hash, title: "Page numbers", desc: "Stamp numbers anywhere", href: "/page-numbers", tone: "#facc15" },
  { icon: Droplets, title: "Watermark", desc: "Text or image overlay", href: "/watermark", tone: "#a3e635" },
  { icon: Crop, title: "Crop", desc: "Hard or soft trim", href: "/crop", tone: "#4ade80" },
  { icon: ImageIcon, title: "JPG → PDF", desc: "Images into a document", href: "/jpg-to-pdf", tone: "#c084fc" },
  { icon: Images, title: "PDF → JPG", desc: "Pages as images / ZIP", href: "/pdf-to-jpg", tone: "#34d399" },
  { icon: FileType, title: "Extract text", desc: "Dump text to .txt", href: "/extract-text", tone: "#4ade80" },
  { icon: Images, title: "Extract images", desc: "Pages as PNG ZIP", href: "/extract-images", tone: "#2dd4bf" },
  { icon: Camera, title: "Scan", desc: "Camera or photos to PDF", href: "/scan", tone: "#f472b6" },
  { icon: Globe, title: "HTML → PDF", desc: "Render HTML to pages", href: "/html-to-pdf", tone: "#e879f9" },
  { icon: PenLine, title: "Sign", desc: "Stamp a drawn signature", href: "/sign", tone: "#f9a8d4" },
  { icon: ClipboardList, title: "Forms", desc: "Fill and flatten fields", href: "/forms", tone: "#7dd3fc" },
  { icon: Tags, title: "Metadata", desc: "Title, author, keywords", href: "/metadata", tone: "#93c5fd" },
  { icon: GitCompare, title: "Compare", desc: "Visual / pixel / text diff", href: "/compare", tone: "#c4b5fd" },
  { icon: Wrench, title: "Repair", desc: "Rebuild broken structure", href: "/repair", tone: "#67e8f9" },
  { icon: Archive, title: "PDF/A meta", desc: "Experimental XMP tags", href: "/pdf-to-pdfa", tone: "#5eead4" },
];

export default function LandingPage() {
  return (
    <div className="min-h-full bg-background text-foreground">
      <style>{`
        .paper-stack {
          box-shadow:
            12px 12px 0 -1px #1a1a1a,
            12px 12px 0 0 #2a2a2a,
            24px 24px 0 -1px #141414,
            24px 24px 0 0 #222;
        }
        .tool-card:hover {
          background: #141414;
          border-color: #333;
        }
        .tool-card:hover .tool-arrow {
          opacity: 1;
          transform: translate(0, 0);
        }
      `}</style>

      <div
        className="pointer-events-none fixed inset-0 opacity-50"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 15% 0%, rgba(90,70,40,0.16), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 10%, rgba(40,55,80,0.16), transparent 50%)",
        }}
      />

      <div className="relative">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-8">
          <Logo size={32} subtitle={`Local · ${TOOL_COUNT} tools`} />
          <nav className="flex items-center gap-5 text-sm text-muted-foreground">
            <a href="#tools" className="transition hover:text-foreground">Tools</a>
            <Link
              href="/edit"
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold tracking-wide text-primary-foreground transition hover:bg-white"
            >
              Open editor
            </Link>
          </nav>
        </header>

        <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-16 pt-8 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-8 lg:pb-24 lg:pt-12">
          <div>
            <p className="font-label mb-6 text-muted-foreground">
              Browser-native PDF workbench
            </p>
            <h1 className="font-display text-[2.75rem] leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.25rem]">
              Work on PDFs
              <br />
              <span className="text-muted-foreground">without sending</span>
              <br />
              them anywhere.
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              Merge, edit, unlock, redact, compress - all on-device with WebAssembly.
              No accounts. No cloud processing. No “trust us, we delete it later.”
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/edit"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-white"
              >
                Start editing
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                href="/merge"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-transparent px-6 py-3 text-sm font-medium transition hover:bg-card"
              >
                Merge files
              </Link>
            </div>

            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-border pt-8">
              {[
                { k: "Tools", v: String(TOOL_COUNT) },
                { k: "Upload", v: "Never" },
                { k: "Price", v: "Free" },
              ].map((item) => (
                <div key={item.k}>
                  <dt className="font-label text-muted-foreground">{item.k}</dt>
                  <dd className="font-display mt-1 text-2xl sm:text-3xl">{item.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
            <div className="paper-stack relative aspect-[4/5] overflow-hidden rounded-sm border border-border bg-card">
              <div className="absolute inset-4 rounded-sm border border-border bg-[#1c1c1c] p-6 sm:inset-5 sm:p-8">
                <div className="mb-6 flex items-center justify-between">
                  <span className="font-label text-muted-foreground">Doc · 01</span>
                  <span className="font-label text-emerald-500/80">Local</span>
                </div>
                <div className="font-display space-y-3">
                  <p className="text-2xl leading-tight sm:text-3xl">Your file</p>
                  <p className="text-2xl leading-tight text-muted-foreground sm:text-3xl">stays here.</p>
                </div>
                <div className="mt-8 space-y-2.5">
                  {[100, 88, 72, 92, 60].map((w, i) => (
                    <div
                      key={i}
                      className="h-1.5 rounded-full bg-border"
                      style={{ width: `${w}%` }}
                    />
                  ))}
                </div>
                <div className="absolute bottom-6 left-6 right-6 sm:bottom-8 sm:left-8 sm:right-8">
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <span className="font-label text-muted-foreground">WASM pipeline</span>
                    <span className="font-label text-muted-foreground">0 bytes out</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="font-label mt-4 text-center text-muted-foreground">
              Illustration · not a live preview
            </p>
          </div>
        </section>

        <section className="border-y border-border bg-[#0f0f0f]">
          <div className="mx-auto grid max-w-6xl gap-0 sm:grid-cols-3">
            {[
              {
                n: "01",
                title: "On-device engines",
                body: "pdf-lib, pdf.js, and pdfcpu WASM run in this tab - not on our servers.",
              },
              {
                n: "02",
                title: "No account wall",
                body: "Open a tool, drop a PDF, download. No signup, trial, or watermark.",
              },
              {
                n: "03",
                title: "Honest tools",
                body: "When a tool flattens pages (compress, redact), the UI says so.",
              },
            ].map((item, i) => (
              <div
                key={item.n}
                className={`px-6 py-10 sm:px-8 ${i < 2 ? "border-b border-border sm:border-b-0 sm:border-r" : ""}`}
              >
                <p className="font-label text-muted-foreground">{item.n}</p>
                <h2 className="font-display mt-3 text-2xl">{item.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="tools" className="mx-auto max-w-6xl px-6 py-16 sm:px-8 sm:py-20">
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-label text-muted-foreground">Catalog</p>
              <h2 className="font-display mt-2 text-3xl sm:text-4xl">
                Every tool, one place
              </h2>
            </div>
            <p className="max-w-xs text-sm text-muted-foreground">
              Pick what you need. Each opens a focused workspace in the sidebar app.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {tools.map(({ icon: Icon, title, desc, href, tone }) => (
              <Link
                key={href}
                href={href}
                className="tool-card group relative flex items-start gap-4 bg-background p-5 transition-colors sm:p-6"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border"
                  style={{ color: tone, background: `${tone}14` }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium tracking-tight">{title}</span>
                    <ArrowUpRight className="tool-arrow h-3.5 w-3.5 text-muted-foreground opacity-0 -translate-x-0.5 translate-y-0.5 transition-all" />
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 sm:py-20">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl leading-tight sm:text-5xl">
                Close the tab.
                <br />
                <span className="text-muted-foreground">Nothing was left on a server.</span>
              </h2>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
                That is the entire product thesis. Tools should be powerful without
                turning your documents into someone else&apos;s data problem.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/edit"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-white"
                >
                  Open editor
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/unlock"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium transition hover:bg-card"
                >
                  Unlock a PDF
                </Link>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <Logo size={28} subtitle="On-device only" />
            <p className="font-label text-muted-foreground">
              No trackers · No uploads · No accounts
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
