import Link from "next/link";
import {
  GitMerge, Scissors, LayoutGrid, Minimize2, Wrench,
  ImageIcon, Globe, Camera,
  Images, Archive,
  PenTool, RotateCw, Hash, Droplets, Crop,
  Unlock, Lock, PenLine, EyeOff, GitCompare,
  ArrowRight, ShieldCheck, Zap, Monitor, Sparkles,
} from "lucide-react";

const categories = [
  {
    name: "Organize & Optimize",
    accent: "from-blue-500 to-indigo-500",
    tools: [
      { icon: GitMerge,  title: "Merge PDF",     desc: "Combine multiple PDFs into one",         href: "/merge",       tw: "text-blue-400   bg-blue-400/10"   },
      { icon: Scissors,  title: "Split PDF",     desc: "Extract pages into separate files",      href: "/split",       tw: "text-indigo-400 bg-indigo-400/10" },
      { icon: LayoutGrid,title: "Organize PDF",  desc: "Drag-and-drop page reordering",          href: "/organize",    tw: "text-violet-400 bg-violet-400/10" },
      { icon: Minimize2, title: "Compress PDF",  desc: "Reduce size without losing quality",     href: "/compress",    tw: "text-sky-400    bg-sky-400/10"    },
      { icon: Wrench,    title: "Repair PDF",    desc: "Fix corrupted or damaged files",         href: "/repair",      tw: "text-cyan-400   bg-cyan-400/10"   },
    ],
  },
  {
    name: "Convert TO PDF",
    accent: "from-violet-500 to-purple-500",
    tools: [
      { icon: ImageIcon, title: "JPG to PDF",    desc: "Images to a single PDF document",       href: "/jpg-to-pdf",  tw: "text-purple-400 bg-purple-400/10" },
      { icon: Globe,     title: "HTML to PDF",   desc: "Render HTML content as a PDF",          href: "/html-to-pdf", tw: "text-fuchsia-400 bg-fuchsia-400/10"},
      { icon: Camera,    title: "Scan to PDF",   desc: "Camera or QR code scan to PDF",         href: "/scan",        tw: "text-pink-400   bg-pink-400/10"   },
    ],
  },
  {
    name: "Convert FROM PDF",
    accent: "from-emerald-500 to-teal-500",
    tools: [
      { icon: Images,    title: "PDF to JPG",    desc: "Export pages as JPEG images or ZIP",    href: "/pdf-to-jpg",  tw: "text-emerald-400 bg-emerald-400/10"},
      { icon: Archive,   title: "PDF to PDF/A",  desc: "Archival format with XMP metadata",     href: "/pdf-to-pdfa", tw: "text-teal-400   bg-teal-400/10"   },
    ],
  },
  {
    name: "Edit & Annotate",
    accent: "from-orange-500 to-amber-500",
    tools: [
      { icon: PenTool,   title: "Edit PDF",      desc: "Draw, annotate, shapes, signatures",    href: "/edit",        tw: "text-orange-400 bg-orange-400/10",  featured: true },
      { icon: RotateCw,  title: "Rotate PDF",    desc: "Fix page orientation instantly",        href: "/rotate",      tw: "text-amber-400  bg-amber-400/10"  },
      { icon: Hash,      title: "Page Numbers",  desc: "Stamp numbers at any position",         href: "/page-numbers",tw: "text-yellow-400 bg-yellow-400/10" },
      { icon: Droplets,  title: "Watermark",     desc: "Center or tiled text overlay",          href: "/watermark",   tw: "text-lime-400   bg-lime-400/10"   },
      { icon: Crop,      title: "Crop PDF",      desc: "Trim margins with mm precision",        href: "/crop",        tw: "text-green-400  bg-green-400/10"  },
    ],
  },
  {
    name: "Security & Signatures",
    accent: "from-rose-500 to-red-500",
    tools: [
      { icon: Unlock,    title: "Unlock PDF",    desc: "Remove password protection",            href: "/unlock",      tw: "text-rose-400   bg-rose-400/10"   },
      { icon: Lock,      title: "Protect PDF",   desc: "Encrypt with user & owner passwords",   href: "/protect",     tw: "text-red-400    bg-red-400/10"    },
      { icon: PenLine,   title: "Sign PDF",      desc: "Draw and embed your signature",         href: "/sign",        tw: "text-pink-400   bg-pink-400/10"   },
      { icon: EyeOff,    title: "Redact PDF",    desc: "Permanently black out sensitive text",  href: "/redact",      tw: "text-orange-400 bg-orange-400/10" },
      { icon: GitCompare,title: "Compare PDF",   desc: "Visual + text diff between two files",  href: "/compare",     tw: "text-violet-400 bg-violet-400/10" },
    ],
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-full bg-background">

      {/* ─── Hero ──────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden px-6 pt-20 pb-16 text-center">
        {/* Background orbs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/20 blur-[128px] opacity-50" />
          <div className="absolute top-1/2 left-1/4 w-72 h-72 rounded-full bg-blue-600/20 blur-[96px] opacity-40" />
          <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-violet-600/20 blur-[96px] opacity-35" />
        </div>

        <div className="mx-auto max-w-4xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 rounded-full border border-primary/25 bg-primary/8 text-primary text-xs font-medium shadow-sm shadow-primary/10">
            <Sparkles className="h-3 w-3" />
            20 tools &bull; 100% client-side &bull; No uploads ever
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] text-foreground">
            The PDF toolkit
            <br />
            <span className="bg-gradient-to-r from-primary via-blue-400 to-violet-400 bg-clip-text text-transparent">
              that respects you
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Merge, split, compress, annotate, protect — everything you need, running entirely in your browser.
            No accounts, no subscriptions, no file uploads.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/edit"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5">
              <PenTool className="h-4 w-4" />
              Open PDF Editor
              <ArrowRight className="h-3.5 w-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link href="/merge"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-card text-foreground text-sm font-semibold hover:bg-muted transition-all border border-border hover:-translate-y-0.5">
              <GitMerge className="h-4 w-4" />
              Merge PDFs
            </Link>
            <Link href="/compress"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-card text-foreground text-sm font-semibold hover:bg-muted transition-all border border-border hover:-translate-y-0.5">
              <Minimize2 className="h-4 w-4" />
              Compress PDF
            </Link>
          </div>

          {/* Stat pills */}
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            {[
              { label: "20 PDF tools", color: "text-blue-400 bg-blue-400/8 border-blue-400/20" },
              { label: "0 bytes uploaded", color: "text-emerald-400 bg-emerald-400/8 border-emerald-400/20" },
              { label: "100% free", color: "text-violet-400 bg-violet-400/8 border-violet-400/20" },
              { label: "No account needed", color: "text-amber-400 bg-amber-400/8 border-amber-400/20" },
            ].map(({ label, color }) => (
              <span key={label} className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-medium ${color}`}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Why block ─────────────────────────────────────────────── */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-5xl grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: ShieldCheck,
              title: "Completely private",
              body: "Every operation runs in your browser using WebAssembly. Your files never touch a server.",
              accent: "text-emerald-400 bg-emerald-400/10",
            },
            {
              icon: Zap,
              title: "Near-instant processing",
              body: "Powered by pdfcpu (WebAssembly) and pdf-lib. No round-trips, no queues.",
              accent: "text-amber-400 bg-amber-400/10",
            },
            {
              icon: Monitor,
              title: "Works everywhere",
              body: "Any modern browser on any device. No plugins, no apps, no installation required.",
              accent: "text-blue-400 bg-blue-400/10",
            },
          ].map(({ icon: Icon, title, body, accent }) => (
            <div key={title}
              className="relative flex flex-col gap-4 p-5 rounded-2xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden">
              {/* subtle corner glow */}
              <div aria-hidden className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Tool categories ───────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-5xl space-y-14">

          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Pick a tool</h2>
            <p className="text-muted-foreground text-sm mt-2">All 20 tools are free, instant, and run in your browser</p>
          </div>

          {categories.map(({ name, accent, tools }) => (
            <div key={name}>
              {/* Category header */}
              <div className="flex items-center gap-3 mb-5">
                <div className={`h-1.5 w-6 rounded-full bg-gradient-to-r ${accent}`} />
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{name}</h3>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Tool cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {tools.map(({ icon: Icon, title, desc, href, tw, featured }) => {
                  const [textCol, bgCol] = tw.split(" ");
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={[
                        "group relative flex items-start gap-4 p-5 rounded-2xl border transition-all duration-200",
                        "hover:-translate-y-1 hover:shadow-lg",
                        featured
                          ? "border-primary/30 bg-primary/5 hover:border-primary/50 hover:shadow-primary/10"
                          : "border-border bg-card hover:border-muted-foreground/25 hover:shadow-black/10",
                      ].join(" ")}
                    >
                      {featured && (
                        <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/12 px-2 py-0.5 rounded-full">
                          <Sparkles className="h-2.5 w-2.5" /> Featured
                        </span>
                      )}
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${bgCol}`}>
                        <Icon className={`h-5 w-5 ${textCol}`} />
                      </div>
                      {/* Text */}
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                          {title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{desc}</p>
                      </div>
                      {/* Arrow */}
                      <ArrowRight className={`flex-shrink-0 h-4 w-4 mt-0.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all ${textCol}`} />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Bottom CTA banner ─────────────────────────────────────── */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-violet-500/10 p-10 text-center">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-primary/20 blur-3xl" />
            </div>
            <Sparkles className="h-8 w-8 text-primary mx-auto mb-4 opacity-80" />
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Ready to get started?</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8">
              No sign-up required. Just open a tool and start working — your files stay on your device.
            </p>
            <Link href="/edit"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 hover:-translate-y-0.5">
              <PenTool className="h-4 w-4" />
              Open PDF Editor — it's free
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            PDF Studio &mdash; 100% client-side processing. Your files never leave your device.
          </p>
          <div className="flex items-center gap-4">
            {[
              ["Merge", "/merge"], ["Split", "/split"], ["Compress", "/compress"],
              ["Unlock", "/unlock"], ["Edit", "/edit"],
            ].map(([label, href]) => (
              <Link key={href} href={href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
