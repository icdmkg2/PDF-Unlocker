"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  FileText, GitMerge, Scissors, Minimize2, Wrench, LayoutGrid,
  ImageIcon, Globe, Camera, Images, Archive,
  PenTool, RotateCw, Hash, Droplets, Crop,
  Unlock, Lock, PenLine, EyeOff, GitCompare,
  Menu, X, ChevronDown, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navSections = [
  {
    category: "Organize & Optimize",
    tools: [
      { label: "Merge PDF", href: "/merge", icon: GitMerge },
      { label: "Split PDF", href: "/split", icon: Scissors },
      { label: "Organize PDF", href: "/organize", icon: LayoutGrid },
      { label: "Compress PDF", href: "/compress", icon: Minimize2 },
      { label: "Repair PDF", href: "/repair", icon: Wrench },
    ],
  },
  {
    category: "Convert TO PDF",
    tools: [
      { label: "JPG to PDF", href: "/jpg-to-pdf", icon: ImageIcon },
      { label: "HTML to PDF", href: "/html-to-pdf", icon: Globe },
      { label: "Scan to PDF", href: "/scan", icon: Camera },
    ],
  },
  {
    category: "Convert FROM PDF",
    tools: [
      { label: "PDF to JPG", href: "/pdf-to-jpg", icon: Images },
      { label: "PDF to PDF/A", href: "/pdf-to-pdfa", icon: Archive },
    ],
  },
  {
    category: "Edit & Annotate",
    tools: [
      { label: "Edit PDF", href: "/edit", icon: PenTool },
      { label: "Rotate PDF", href: "/rotate", icon: RotateCw },
      { label: "Page Numbers", href: "/page-numbers", icon: Hash },
      { label: "Add Watermark", href: "/watermark", icon: Droplets },
      { label: "Crop PDF", href: "/crop", icon: Crop },
    ],
  },
  {
    category: "Security & Signatures",
    tools: [
      { label: "Unlock PDF", href: "/unlock", icon: Unlock },
      { label: "Protect PDF", href: "/protect", icon: Lock },
      { label: "Sign PDF", href: "/sign", icon: PenLine },
      { label: "Redact PDF", href: "/redact", icon: EyeOff },
      { label: "Compare PDF", href: "/compare", icon: GitCompare },
    ],
  },
];

function NavContent({ pathname, onClose }: { pathname: string; onClose?: () => void }) {
  const activeCat = navSections.find((s) => s.tools.some((t) => t.href === pathname))?.category;
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(navSections.map((s) => s.category))
  );

  useEffect(() => {
    if (activeCat) setOpen((prev) => new Set([...prev, activeCat]));
  }, [activeCat]);

  const toggle = (cat: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-4 border-b border-border flex-shrink-0">
        <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
          <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center flex-shrink-0">
            <FileText className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground text-sm">PDF Studio</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground lg:hidden">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navSections.map((section) => {
          const isOpen = open.has(section.category);
          return (
            <div key={section.category}>
              <button
                onClick={() => toggle(section.category)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted transition-colors group"
              >
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
                  {section.category}
                </span>
                {isOpen
                  ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              </button>

              {isOpen && (
                <ul className="mt-0.5 mb-1 space-y-0.5">
                  {section.tools.map(({ label, href, icon: Icon }) => {
                    const active = pathname === href;
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs transition-colors",
                            active
                              ? "bg-primary/15 text-primary font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                          {label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      <div className="px-4 py-2.5 border-t border-border flex-shrink-0">
        <p className="text-[10px] text-muted-foreground text-center">100% client-side • No uploads</p>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 border-r border-border bg-card h-full">
        <NavContent pathname={pathname} />
      </aside>

      <button
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-md bg-card border border-border text-muted-foreground hover:text-foreground shadow-sm"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-card border-r border-border h-full shadow-xl">
            <NavContent pathname={pathname} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
