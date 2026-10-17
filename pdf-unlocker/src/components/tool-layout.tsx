import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CurrentToolFavorite } from "@/components/favorites";

interface ToolLayoutProps {
  title: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
  wide?: boolean;
  /** Room for a step list beside the result card's next steps. */
  medium?: boolean;
  fullWidth?: boolean;
  notice?: React.ReactNode;
}

export function ToolLayout({
  title,
  description,
  icon: Icon,
  children,
  wide = false,
  medium = false,
  fullWidth = false,
  notice,
}: ToolLayoutProps) {
  return (
    <div className="min-h-full p-6 pt-16 lg:p-10">
      <div
        className={cn(
          "mx-auto",
          fullWidth ? "max-w-none" : wide ? "max-w-5xl" : medium ? "max-w-3xl" : "max-w-2xl"
        )}
      >
        <div className="mb-7 flex items-start gap-3.5">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md border border-border bg-card">
            <Icon className="h-5 w-5 text-foreground" />
          </div>
          <div className="min-w-0 pt-0.5">
            <div className="flex items-center gap-1">
              <h1 className="font-display text-2xl tracking-tight text-foreground sm:text-[1.75rem]">
                {title}
              </h1>
              <CurrentToolFavorite />
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        {notice && (
          <div className="mb-6 rounded-lg border border-[#3d3420] bg-[#1a1610] px-4 py-3 text-xs leading-relaxed text-[#d4c4a0]">
            {notice}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
