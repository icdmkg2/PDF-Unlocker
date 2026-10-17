import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  href?: string | null;
  size?: number;
  showWordmark?: boolean;
  subtitle?: string | null;
  className?: string;
  onClick?: () => void;
};

/** Full brand mark (`/logo.svg`). The favicon (`/icon.svg`) is a simplified cut for small sizes. */
export function Logo({
  href = "/",
  size = 28,
  showWordmark = true,
  subtitle = null,
  className,
  onClick,
}: LogoProps) {
  const mark = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.svg"
      alt=""
      width={size}
      height={size}
      className="flex-shrink-0 rounded-[6px]"
      draggable={false}
    />
  );

  const content = (
    <span className={cn("inline-flex items-center gap-2.5 min-w-0", className)}>
      {mark}
      {showWordmark && (
        <span className="min-w-0 leading-tight">
          <span className="block text-sm font-medium tracking-wide text-foreground">
            PDF Studio
          </span>
          {subtitle && (
            <span className="block font-mono text-[10px] tracking-[0.16em] uppercase text-muted-foreground">
              {subtitle}
            </span>
          )}
        </span>
      )}
    </span>
  );

  if (!href) {
    return (
      <span onClick={onClick} className="inline-flex">
        {content}
      </span>
    );
  }

  return (
    <Link href={href} onClick={onClick} className="inline-flex hover:opacity-90 transition-opacity">
      {content}
    </Link>
  );
}
