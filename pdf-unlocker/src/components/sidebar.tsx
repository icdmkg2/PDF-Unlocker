"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { toolSections as navSections } from "@/lib/tools";

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
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-sidebar-border px-3.5 py-4">
        <Logo size={26} onClick={onClose} />
        {onClose && (
          <button
            onClick={onClose}
            className="text-muted-foreground transition hover:text-foreground lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-2 py-3">
        {navSections.map((section) => {
          const isOpen = open.has(section.category);
          return (
            <div key={section.category}>
              <button
                onClick={() => toggle(section.category)}
                className="group flex w-full items-center justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-sidebar-accent"
              >
                <span className="font-label text-[10px] text-muted-foreground transition-colors group-hover:text-foreground">
                  {section.category}
                </span>
                {isOpen ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </button>

              {isOpen && (
                <ul className="mb-1 mt-0.5 space-y-0.5">
                  {section.tools.map(({ label, href, icon: Icon }) => {
                    const active = pathname === href;
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs transition-colors",
                            active
                              ? "bg-primary/10 font-medium text-primary"
                              : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
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
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // The landing page carries its own header and full tool catalog.
  if (pathname === "/") return null;

  return (
    <>
      <aside className="hidden h-full w-56 flex-shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <NavContent pathname={pathname} />
      </aside>

      <button
        className="fixed left-3 top-3 z-50 rounded-md border border-border bg-card p-2 text-muted-foreground shadow-sm transition hover:text-foreground lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar shadow-xl">
            <NavContent pathname={pathname} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
