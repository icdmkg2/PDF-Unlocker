import { MousePointer2, PenTool, Circle, Type, StickyNote, PenLine, Download } from "lucide-react";

/**
 * A looping miniature of the Edit tool. The cursor picks a tool from the
 * floating toolbar, then uses it on the page: highlight, circle, type,
 * note, sign, save. Everything is laid out in % of a fixed 4:5 stage and
 * sized in container units, so the cursor's path (globals.css, ".ed-")
 * lands on the same spots at any size. Reduced motion shows the finished
 * page without the cursor.
 */
const TOOLS = [
  { key: "select", label: "Select", icon: MousePointer2 },
  { key: "pen", label: "Pen", icon: PenTool },
  { key: "hl", label: "Highlight", icon: null },
  { key: "shape", label: "Ellipse", icon: Circle },
  { key: "text", label: "Text", icon: Type },
  { key: "note", label: "Note", icon: StickyNote },
  { key: "sign", label: "Signature", icon: PenLine },
] as const;

/**
 * Text that types itself on the demo's 20s loop: each character appears at
 * its own moment between `from` and `to` (% of the loop), with a caret that
 * follows because hidden characters take no width. Keyframes are generated
 * here so the timing can't drift from the text.
 */
function Typed({ id, text, from, to }: { id: string; text: string; from: number; to: number }) {
  const chars = Array.from(text);
  const step = (to - from) / chars.length;
  const css = chars
    .map((_, i) => {
      const at = (from + step * (i + 1)).toFixed(2);
      return `@keyframes ${id}-${i}{0%,${at}%{max-width:0}${(+at + 0.01).toFixed(2)}%,100%{max-width:1.5em}}`;
    })
    .join("");
  return (
    <>
      <style>{css}</style>
      {chars.map((c, i) => (
        <span
          key={i}
          className="ed-ch inline-block overflow-hidden whitespace-pre align-bottom"
          style={{ animation: `${id}-${i} var(--ed-t) step-end infinite both` }}
        >
          {c}
        </span>
      ))}
    </>
  );
}

/** The editor's selection frame: thin blue border with square corner handles. */
function Selection({ className }: { className: string }) {
  return (
    <span className={`${className} pointer-events-none absolute -inset-x-[1.2cqw] -inset-y-[0.9cqw] border border-[#3b82f6]`}>
      {["-left-[0.6cqw] -top-[0.6cqw]", "-right-[0.6cqw] -top-[0.6cqw]", "-bottom-[0.6cqw] -left-[0.6cqw]", "-bottom-[0.6cqw] -right-[0.6cqw]"].map((pos) => (
        <span key={pos} className={`absolute ${pos} h-[1.2cqw] w-[1.2cqw] border border-[#3b82f6] bg-white`} />
      ))}
    </span>
  );
}

export function EditDemo() {
  return (
    <div className="ed relative w-full select-none overflow-hidden rounded-md border border-border bg-[#111] [container-type:inline-size]" style={{ aspectRatio: "4 / 5" }} aria-hidden>
      {/* Top bar, as in the editor */}
      <div className="absolute inset-x-0 top-0 flex h-[10%] items-center justify-between border-b border-border px-[4%]">
        <span className="flex items-center gap-[1.5cqw] text-[2.6cqw] text-foreground">
          <PenTool className="h-[3cqw] w-[3cqw] text-muted-foreground" /> lease.pdf
          <span className="font-mono text-[1.9cqw] text-muted-foreground">Page 1 of 3</span>
        </span>
        <span className="ed-save flex items-center gap-[1cqw] rounded-full bg-primary px-[2.6cqw] py-[1.2cqw] text-[2.3cqw] font-semibold text-primary-foreground">
          <Download className="h-[2.6cqw] w-[2.6cqw]" /> Save PDF
        </span>
      </div>

      {/* The page */}
      <div className="absolute left-[8%] right-[8%] top-[13.5%] h-[67%] rounded-[2px] bg-paper text-ink shadow-[0_1.5cqw_4cqw_rgba(0,0,0,.45)]">
        <div className="absolute left-[7%] right-[7%] top-[5%]">
          <p className="font-display text-[5.2cqw] leading-none">Lease agreement</p>
          <p className="mt-[1.2cqw] font-mono text-[1.7cqw] uppercase tracking-[0.14em] text-[#6b6761]">Flat 4B · 12 Elm Row</p>

          <div className="mt-[4.5cqw] space-y-[2.6cqw] text-[2.3cqw] leading-snug text-[#3a3835]">
            <p>1. The tenancy starts on 1 November 2026.</p>
            <p>
              <span className="relative">
                <span className="ed-hl absolute -inset-x-[0.4cqw] inset-y-0 rounded-[0.4cqw] bg-[#f5c542]/75" />
                <span className="relative">2. Rent is £950 a month, due on the 1st.</span>
              </span>
            </p>
            <p>
              3. A deposit of{" "}
              <span className="relative inline-block">
                £1,100
                <svg className="pointer-events-none absolute -left-[1cqw] -top-[1.2cqw] h-[calc(100%+2.4cqw)] w-[calc(100%+2cqw)] overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none" fill="none">
                  <ellipse className="ed-ring" pathLength={1} cx="50" cy="20" rx="48" ry="17" stroke="#dc2626" strokeWidth="2.4" vectorEffect="non-scaling-stroke" />
                </svg>
              </span>{" "}
              is held in a scheme.
            </p>
            <p>4. Pets are allowed with written consent.</p>
          </div>

          <p className="mt-[6cqw] flex items-baseline gap-[1.5cqw] text-[2.25cqw] text-[#3a3835]">
            Tenant:
            <span className="relative inline-block min-w-[40%] border-b border-dotted border-[#b9b4aa] pb-[0.3cqw]">
              <span className="ed-name relative inline-flex items-baseline whitespace-nowrap font-medium text-[#1d4ed8]">
                <Selection className="ed-tbox" />
                <Typed id="tn" text="Dana Okafor" from={40.5} to={47.5} />
                <span className="ed-caret ml-px inline-block h-[1.1em] w-[0.25cqw] translate-y-[0.15em] bg-[#1d4ed8]" />
              </span>
            </span>
          </p>

          <div className="mt-[9cqw] w-[55%]">
            <svg viewBox="0 0 200 50" className="h-[8cqw] w-full overflow-visible" fill="none">
              <path
                className="ed-sig"
                pathLength={1}
                d="M6 36 C 16 6, 28 8, 24 34 C 22 46, 38 26, 50 18 C 58 14, 56 40, 68 34 C 78 29, 82 16, 90 24 C 96 30, 92 40, 102 36 C 114 31, 118 14, 130 20 C 138 24, 134 38, 146 34 C 158 30, 168 26, 194 22"
                stroke="#1a2340"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="border-t border-[#b9b4aa] pt-[0.8cqw] font-mono text-[1.6cqw] uppercase tracking-[0.14em] text-[#6b6761]">Tenant signature</div>
          </div>
        </div>

        <div className="ed-note absolute right-[5%] top-[4%] w-[30%] rotate-[3deg] rounded-[0.5cqw] bg-[#fde68a] p-[1.6cqw] text-[1.9cqw] leading-tight text-[#5b4a12] shadow-[0_1cqw_2cqw_rgba(0,0,0,.18)]">
          <Selection className="ed-nbox" />
          <span className="block">
            <Typed id="nt" text="Ask about bills" from={58.3} to={63.5} />
            <span className="ed-ncaret ml-px inline-block h-[1.1em] w-[0.25cqw] translate-y-[0.15em] bg-[#5b4a12]" />
          </span>
        </div>
      </div>

      {/* Floating toolbar, as in the editor */}
      <div className="absolute bottom-[4%] left-1/2 flex -translate-x-1/2 items-center gap-[0.6cqw] rounded-[3cqw] border border-border bg-[#1b1b1b] p-[1cqw] shadow-[0_2cqw_5cqw_rgba(0,0,0,.5)]">
        {TOOLS.map(({ key, label, icon: Icon }) => (
          <span key={key} className={`ed-tool ed-tool-${key} relative flex h-[7cqw] w-[7cqw] items-center justify-center rounded-[1.6cqw] text-muted-foreground`}>
            {Icon ? <Icon className="h-[3.2cqw] w-[3.2cqw]" /> : <span className="text-[2.6cqw] font-bold leading-none">A</span>}
            <span className={`ed-tip ed-tip-${key} absolute bottom-[calc(100%+1.6cqw)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[1cqw] bg-paper px-[1.4cqw] py-[0.6cqw] text-[1.9cqw] font-medium text-ink`}>
              {label}
            </span>
          </span>
        ))}
        <span className="mx-[0.6cqw] h-[4cqw] w-px bg-border" />
        <span className="h-[4.6cqw] w-[4.6cqw] rounded-[0.8cqw] border border-border bg-[#ef4444]" />
      </div>

      {/* Saved toast */}
      <div className="ed-toast absolute left-1/2 top-[12%] flex -translate-x-1/2 items-center gap-[1.2cqw] whitespace-nowrap rounded-full border border-border bg-[#1b1b1b] px-[2.4cqw] py-[1.2cqw] text-[2.1cqw] text-foreground shadow-lg">
        <span className="h-[1.3cqw] w-[1.3cqw] rounded-full bg-emerald-400" />
        Saved on this device · 0 bytes uploaded
      </div>

      {/* Cursor: a standard pointer, switching to an I-beam while placing and typing text */}
      <div className="ed-cursor absolute h-[5.4cqw] w-[5.4cqw]">
        <span className="ed-click absolute -left-[2.6cqw] -top-[2.6cqw] h-[5.2cqw] w-[5.2cqw] rounded-full border-2 border-[#3b82f6]/80 bg-[#3b82f6]/15" />
        <svg className="ed-arrow absolute left-0 top-0 h-full w-full drop-shadow-[0_0.3cqw_0.5cqw_rgba(0,0,0,.45)]" viewBox="0 0 20 20">
          {/* Tip at (1, 1) so left/top in the keyframes is the hotspot */}
          <path d="M1 1 L1 15.6 L4.7 12.2 L7.2 18.1 L9.9 17 L7.4 11.2 L12.4 11.2 Z" fill="#000" stroke="#fff" strokeWidth="1.15" strokeLinejoin="round" />
        </svg>
        <svg className="ed-ibeam absolute -left-[1.2cqw] -top-[2.2cqw] h-[4.4cqw] w-[2.4cqw] drop-shadow-[0_0.2cqw_0.3cqw_rgba(0,0,0,.4)]" viewBox="0 0 10 20" fill="none">
          <path d="M2 1.5 H4 Q5 1.5 5 2.5 V17.5 Q5 18.5 4 18.5 H2 M8 1.5 H6 Q5 1.5 5 2.5 M8 18.5 H6 Q5 18.5 5 17.5 M3.2 10 H6.8" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M2 1.5 H4 Q5 1.5 5 2.5 V17.5 Q5 18.5 4 18.5 H2 M8 1.5 H6 Q5 1.5 5 2.5 M8 18.5 H6 Q5 18.5 5 17.5 M3.2 10 H6.8" stroke="#000" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
