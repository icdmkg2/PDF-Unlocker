"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFavorites, getServerFavorites, subscribeFavorites, toggleFavorite } from "@/lib/favorites";
import { toolByHref } from "@/lib/tools";

export function useFavorites(): string[] {
  return useSyncExternalStore(subscribeFavorites, getFavorites, getServerFavorites);
}

/** Star toggle. Hidden until hover or focus unless the tool is already a favorite. */
export function FavoriteButton({
  href,
  label,
  className,
  alwaysVisible = false,
  size = "sm",
}: {
  href: string;
  label: string;
  className?: string;
  alwaysVisible?: boolean;
  size?: "sm" | "md";
}) {
  const on = useFavorites().includes(href);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? `Remove ${label} from favorites` : `Add ${label} to favorites`}
      title={on ? "Remove from favorites" : "Add to favorites"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(href);
      }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md transition-[opacity,color]",
        size === "sm" ? "h-6 w-6" : "h-8 w-8",
        on ? "text-[#f5c542] opacity-100" : "text-muted-foreground hover:text-foreground",
        !on && !alwaysVisible && "opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
        className
      )}
    >
      <Star className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} fill={on ? "currentColor" : "none"} />
    </button>
  );
}

/** Star for the tool page you're on, shown beside its title. */
export function CurrentToolFavorite() {
  const pathname = usePathname();
  const tool = toolByHref.get(pathname);
  if (!tool) return null;
  return <FavoriteButton href={tool.href} label={tool.label} alwaysVisible size="md" />;
}
