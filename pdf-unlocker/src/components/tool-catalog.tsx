"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Search, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { allTools, toolByHref, toolSections, type Tool } from "@/lib/tools";
import { FavoriteButton, useFavorites } from "@/components/favorites";

const ALL = "All";
const FAVORITES = "Favorites";

function ToolRow({ tool }: { tool: Tool }) {
  const Icon = tool.icon;
  return (
    <li className="group relative -mx-2 flex items-center rounded-md transition-colors hover:bg-card">
      <Link href={tool.href} className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm">{tool.label}</span>
          <span className="block truncate text-xs text-muted-foreground">{tool.desc}</span>
        </span>
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </Link>
      <FavoriteButton href={tool.href} label={tool.label} className="mr-1" />
    </li>
  );
}

function Group({ title, blurb, tools, icon }: { title: string; blurb?: string; tools: Tool[]; icon?: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <div className="border-b border-border pb-3">
        <p className="font-label flex items-center gap-1.5 text-muted-foreground">
          {icon}
          {title}
        </p>
        {blurb && <p className="mt-1 text-xs text-muted-foreground/80">{blurb}</p>}
      </div>
      <ul className="mt-2">
        {tools.map((t) => (
          <ToolRow key={t.href} tool={t} />
        ))}
      </ul>
    </section>
  );
}

/** Every tool, by task, with favorites first, category chips and a filter. */
export function ToolCatalog() {
  const favorites = useFavorites();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<string>(ALL);
  const q = query.trim().toLowerCase();
  const matches = (t: Tool, category = "") => !q || `${t.label} ${t.desc} ${category}`.toLowerCase().includes(q);

  const favTools = favorites.map((h) => toolByHref.get(h)!).filter((t) => matches(t));
  const sections = toolSections
    .filter((s) => view === ALL || view === s.category)
    .map((s) => ({ ...s, tools: s.tools.filter((t) => matches(t, s.category)) }))
    .filter((s) => s.tools.length);

  const chips = [ALL, FAVORITES, ...toolSections.map((s) => s.category)];
  const count = (c: string) =>
    c === ALL ? allTools.length : c === FAVORITES ? favorites.length : toolSections.find((s) => s.category === c)!.tools.length;

  const showFavGroup = (view === ALL || view === FAVORITES) && favTools.length > 0;
  const nothing = view === FAVORITES ? favTools.length === 0 : !showFavGroup && sections.length === 0;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="font-display text-3xl sm:text-4xl">All tools</h2>
        <label className="relative block sm:w-72">
          <span className="sr-only">Find a tool</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="tool-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a tool, e.g. password"
            className="h-10 w-full rounded-full border border-border bg-transparent pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:border-muted-foreground focus:outline-none"
          />
        </label>
      </div>

      <div role="radiogroup" aria-label="Show" className="mt-6 flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={view === c}
            onClick={() => setView(c)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
              view === c ? "border-primary/60 bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {c === FAVORITES && <Star className="h-3 w-3" fill={favorites.length ? "#f5c542" : "none"} stroke={favorites.length ? "#f5c542" : "currentColor"} />}
            {c}
            <span className="font-mono text-[10px] text-muted-foreground">{count(c)}</span>
          </button>
        ))}
      </div>

      {nothing ? (
        <p className="mt-10 max-w-md text-sm text-muted-foreground">
          {view === FAVORITES && !q
            ? "No favorites yet. Hover a tool and click its star to keep it here and at the top of the sidebar."
            : `No tool matches “${query}”. Try a word like merge, sign, image or password.`}
        </p>
      ) : (
        <div className="mt-10 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {showFavGroup && (
            <Group title={FAVORITES} blurb="Your starred tools, also pinned in the sidebar" tools={favTools} icon={<Star className="h-3 w-3" fill="#f5c542" stroke="#f5c542" />} />
          )}
          {view !== FAVORITES && sections.map((s) => <Group key={s.category} title={s.category} blurb={s.blurb} tools={s.tools} />)}
        </div>
      )}
    </>
  );
}
