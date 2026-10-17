import Link from "next/link";
import { Logo } from "@/components/logo";
import { LandingDrop } from "@/components/landing-drop";
import { RecentFiles } from "@/components/recent-files";
import { ToolCatalog } from "@/components/tool-catalog";
import { TOOL_COUNT } from "@/lib/tools";

const principles = [
  {
    title: "Runs in your browser",
    body: "pdf-lib, pdf.js and pdfcpu (WebAssembly) do the work in this tab. There is no upload endpoint to send files to.",
  },
  {
    title: "Works offline",
    body: "After your first visit the tools keep working without a connection. Install it as an app if you like.",
  },
  {
    title: "No account",
    body: "Open a tool, drop a PDF, download the result. No signup, trial or watermark.",
  },
  {
    title: "Clear trade-offs",
    body: "When a tool turns pages into images, as redact and the smallest compress modes do, it tells you first.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-full bg-background text-foreground">
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 15% 0%, rgba(90,70,40,0.16), transparent 55%)",
        }}
      />

      <div className="relative">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-8">
          <Logo size={30} />
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#tools" className="transition hover:text-foreground">Tools</a>
            <Link
              href="/edit"
              className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition hover:bg-card"
            >
              Open editor
            </Link>
          </nav>
        </header>

        {/* Phones: headline, then the demo sheet, then the rest. Desktop: text left, sheet right. */}
        <section className="mx-auto grid max-w-6xl gap-x-20 gap-y-10 px-6 pb-20 pt-8 sm:px-8 lg:grid-cols-[1fr_minmax(0,28rem)] lg:grid-rows-[auto_1fr] lg:pb-28 lg:pt-14">
          <h1 className="font-display text-[2.75rem] leading-[1.05] tracking-tight [text-wrap:balance] sm:text-6xl lg:col-start-1 lg:row-start-1 lg:self-end lg:text-[4.5rem]">
            Work on PDFs
            <span className="block text-muted-foreground">without uploading them.</span>
          </h1>

          <div className="mr-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mr-0 lg:self-center">
            <LandingDrop />
          </div>

          <div className="lg:col-start-1 lg:row-start-2">
            <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground">
              Merge, sign, unlock, compress and {TOOL_COUNT - 4} more tools. Everything runs in
              this browser tab, so your files never reach a server.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
              <Link
                href="/edit"
                className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:bg-white"
              >
                Open the editor
              </Link>
              <a
                href="#tools"
                className="text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
              >
                Browse all {TOOL_COUNT} tools
              </a>
            </div>
            <ul className="font-label mt-12 flex flex-wrap gap-x-3 gap-y-2 text-muted-foreground" aria-label="What you get">
              {["Free", "No uploads", "No accounts", "Works offline"].map((item, i) => (
                <li key={item} className="flex items-center gap-3 whitespace-nowrap">
                  {i > 0 && <span aria-hidden>·</span>}
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="tools" className="border-t border-border">
          <div className="mx-auto max-w-6xl scroll-mt-6 px-6 py-16 sm:px-8 sm:py-20">
            <RecentFiles />
            <ToolCatalog />
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:gap-8">
            {principles.map((item) => (
              <div key={item.title}>
                <h2 className="font-display text-xl">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <Logo size={26} />
            <p className="font-display text-xl text-muted-foreground">
              Close the tab. Nothing is left on a server.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
