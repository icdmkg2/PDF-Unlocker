import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { toolSections, TOOL_COUNT } from "@/lib/tools";

const principles = [
  {
    title: "Runs in your browser",
    body: "pdf-lib, pdf.js and pdfcpu (WebAssembly) do the work in this tab, not on a server.",
  },
  {
    title: "No account",
    body: "Open a tool, drop a PDF, download the result. No signup, trial or watermark.",
  },
  {
    title: "Clear trade-offs",
    body: "When a tool flattens pages, as compress and redact do, the tool tells you.",
  },
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
      `}</style>

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

        <section className="mx-auto grid max-w-6xl gap-14 px-6 pb-20 pt-10 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:pb-28 lg:pt-16">
          <div>
            <h1 className="font-display text-[2.75rem] leading-[1.05] tracking-tight [text-wrap:balance] sm:text-6xl lg:text-[4.5rem]">
              Work on PDFs
              <span className="block text-muted-foreground">without uploading them.</span>
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              Merge, edit, unlock, redact and compress on your own device.
              Your files never leave this tab.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href="/edit"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-white"
              >
                Start editing
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <a
                href="#tools"
                className="text-sm text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
              >
                Browse all {TOOL_COUNT} tools
              </a>
            </div>

            <p className="font-label mt-12 text-muted-foreground">
              Free · No uploads · No accounts
            </p>
          </div>

          <div className="relative mx-auto hidden w-full max-w-[320px] sm:block lg:max-w-[340px]">
            <div className="paper-stack relative aspect-[4/5] rounded-sm border border-border bg-[#1c1c1c] p-8" aria-hidden>
              <span className="font-label text-emerald-500/80">On device</span>
              <p className="font-display mt-6 text-3xl leading-tight">
                Your file
                <span className="block text-muted-foreground">stays here.</span>
              </p>
              <div className="mt-8 space-y-2.5">
                {[100, 86, 70, 92, 64, 0, 100, 78, 90, 55].map((w, i) => (
                  <div key={i} className={w ? "h-1.5 rounded-full bg-border" : "h-3"} style={{ width: `${w}%` }} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 sm:grid-cols-3 sm:gap-8 sm:px-8">
            {principles.map((item) => (
              <div key={item.title}>
                <h2 className="font-display text-xl">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="tools" className="mx-auto max-w-6xl scroll-mt-6 px-6 py-16 sm:px-8 sm:py-20">
          <h2 className="font-display text-3xl sm:text-4xl">All tools</h2>

          <div className="mt-10 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {toolSections.map((section) => (
              <div key={section.category}>
                <p className="font-label border-b border-border pb-3 text-muted-foreground">
                  {section.category}
                </p>
                <ul className="mt-2">
                  {section.tools.map(({ label, desc, href, icon: Icon }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="group -mx-2 flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-card"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm">{label}</span>
                          <span className="block truncate text-xs text-muted-foreground">{desc}</span>
                        </span>
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>
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
