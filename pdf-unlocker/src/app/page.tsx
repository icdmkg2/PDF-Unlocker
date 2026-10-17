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

        <section className="mx-auto grid max-w-6xl gap-14 px-6 pb-20 pt-8 sm:px-8 lg:grid-cols-[1fr_minmax(0,27rem)] lg:items-center lg:gap-20 lg:pb-28 lg:pt-14">
          <div>
            <h1 className="font-display text-[2.75rem] leading-[1.05] tracking-tight [text-wrap:balance] sm:text-6xl lg:text-[4.5rem]">
              Work on PDFs
              <span className="block text-muted-foreground">without uploading them.</span>
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted-foreground">
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
            <p className="font-label mt-12 text-muted-foreground">
              Free · No uploads · No accounts · Works offline
            </p>
          </div>

          <div className="mr-6 lg:mr-0">
            <LandingDrop />
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
