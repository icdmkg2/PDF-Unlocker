"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, ChevronDown, ChevronRight, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { toolSections as navSections, toolByHref, type Tool } from "@/lib/tools";
import { FavoriteButton, useFavorites } from "@/components/favorites";

function NavItem({ tool, active, onClose }: { tool: Tool; active: boolean; onClose?: () => void }) {
  const Icon = tool.icon;
  return (
    <li className={cn("group flex items-center rounded-md transition-colors", active ? "bg-primary/10" : "hover:bg-sidebar-accent")}>
      <Link
        href={tool.href}
        onClick={onClose}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2.5 px-2 py-1.5 text-xs transition-colors",
          active ? "font-medium text-primary" : "text-muted-foreground group-hover:text-foreground"
        )}
      >
        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate">{tool.label}</span>
      </Link>
      <FavoriteButton href={tool.href} label={tool.label} className="mr-0.5" />
    </li>
  );
}

function NavContent({ pathname, onClose }: { pathname: string; onClose?: () => void }) {
  const favorites = useFavorites();
  const activeCat = navSections.find((s) => s.tools.some((t) => t.href === pathname))?.category;
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(navSections.map((s) => s.category))
  );

  // Re-open the active tool's section when navigation moves into it.
  const [prevActive, setPrevActive] = useState(activeCat);
  if (activeCat !== prevActive) {
    setPrevActive(activeCat);
    if (activeCat && !open.has(activeCat)) setOpen(new Set([...open, activeCat]));
  }

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

      <nav className="flex-1 space-y-2 overflow-y-auto px-2 py-3" aria-label="Tools">
        {favorites.length > 0 && (
          <div>
            <p className="font-label flex items-center gap-1.5 px-2 py-1.5 text-[10px] text-muted-foreground">
              <Star className="h-2.5 w-2.5" fill="#f5c542" stroke="#f5c542" /> Favorites
            </p>
            <ul className="mb-1 mt-0.5 space-y-0.5" aria-label="Favorites">
              {favorites.map((href) => (
                <NavItem key={href} tool={toolByHref.get(href)!} active={pathname === href} onClose={onClose} />
              ))}
            </ul>
          </div>
        )}

        {navSections.map((section) => {
          const isOpen = open.has(section.category);
          return (
            <div key={section.category}>
              <button
                onClick={() => toggle(section.category)}
                aria-expanded={isOpen}
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
                  {section.tools.map((tool) => (
                    <NavItem key={tool.href} tool={tool} active={pathname === tool.href} onClose={onClose} />
                  ))}
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
