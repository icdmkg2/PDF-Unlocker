"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { toolSections } from "@/lib/tools";

/** Every tool, grouped, with a filter for when you know what you want. */
export function ToolCatalog() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const sections = toolSections
    .map((s) => ({
      ...s,
      tools: q
        ? s.tools.filter((t) => `${t.label} ${t.desc} ${s.category}`.toLowerCase().includes(q))
        : s.tools,
    }))
    .filter((s) => s.tools.length);

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

      {sections.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          No tool matches “{query}”. Try a word like merge, sign, image or password.
        </p>
      ) : (
        <div className="mt-10 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <div key={section.category}>
              <p className="font-label border-b border-border pb-3 text-muted-foreground">{section.category}</p>
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
      )}
    </>
  );
}
