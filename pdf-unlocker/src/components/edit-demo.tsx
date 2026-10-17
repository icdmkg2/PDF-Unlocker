/**
 * A looping, purely visual demo of a PDF being written and edited: the title
 * types itself, clauses are written, a figure is highlighted, a note is
 * added, an account number is redacted, the tenant signs, and the file is
 * saved without uploading. Timing lives in globals.css under ".demo".
 * With reduced motion the finished page shows, still.
 */
const STEPS = ["Typing", "Highlight", "Note", "Redact", "Sign", "Saved on this device · 0 bytes uploaded"];

export function EditDemo() {
  return (
    <div className="demo relative select-none" aria-hidden>
      <div className="font-label relative mb-3 h-4 text-muted-foreground">
        {STEPS.map((s, i) => (
          <span key={s} className={`demo-step demo-step-${i} absolute left-0 top-0 flex items-center gap-2 whitespace-nowrap`}>
            <span className={`h-1.5 w-1.5 rounded-full ${i === STEPS.length - 1 ? "bg-emerald-500/80" : "bg-[#f5c542]"}`} />
            {s}
          </span>
        ))}
      </div>

      <div className="demo-page relative overflow-hidden rounded-[3px] bg-paper px-[9%] pb-[8%] pt-[9%] text-ink shadow-[0_10px_30px_rgba(0,0,0,.4)]">
        <p className="demo-title font-display text-[1.65rem] leading-none">Lease agreement</p>
        <p className="demo-meta mt-1.5 font-mono text-[8.5px] uppercase tracking-[0.14em] text-[#6b6761]">Flat 4B · 12 Elm Row · Page 1 of 3</p>

        <div className="mt-4 space-y-[7px] text-[10.5px] leading-snug text-[#3a3835]">
          <p className="demo-line demo-line-1">1. The tenancy starts on 1 November 2026 and runs for twelve months.</p>
          <p className="demo-line demo-line-2 relative">
            <span className="demo-hl absolute -inset-x-0.5 inset-y-0 rounded-[2px] bg-[#f5c542]/70" />
            <span className="relative">2. Rent is £950 a month, due on the 1st.</span>
          </p>
          <p className="demo-line demo-line-3">3. A deposit of £1,100 is held in a protected scheme.</p>
          <p className="demo-line demo-line-4">4. Pets are allowed with the landlord&apos;s written consent.</p>
          <p className="demo-line demo-line-5">
            Pay to:{" "}
            <span className="relative font-mono text-[9.5px]">
              GB29 NWBK 6016 1331 9268 19
              <span className="demo-redact absolute -inset-x-0.5 -inset-y-px bg-ink" />
            </span>
          </p>
        </div>

        <div className="demo-note absolute right-[5%] top-[6%] w-[28%] rotate-[3deg] rounded-[2px] bg-[#fde68a] p-2 text-[9px] leading-tight text-[#5b4a12] shadow-md">
          Ask about bills before signing
        </div>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div className="w-[55%]">
            <svg viewBox="0 0 200 60" className="demo-sig h-12 w-full overflow-visible" fill="none">
              <path
                className="demo-sig-path"
                pathLength={1}
                d="M8 42 C 18 10, 30 12, 26 40 C 24 52, 40 30, 52 22 C 60 18, 58 44, 70 38 C 80 33, 84 20, 92 28 C 98 34, 94 44, 104 40 C 116 35, 120 18, 132 24 C 140 28, 136 42, 148 38 C 160 34, 170 30, 192 26"
                stroke="#1a2340"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="border-t border-[#b9b4aa] pt-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[#6b6761]">Tenant signature</div>
          </div>
          <div className="demo-date pb-[18px] font-mono text-[10px] text-[#3a3835]">17 Oct 2026</div>
        </div>

        <div className="demo-saved absolute inset-x-[9%] bottom-[5%] flex items-center justify-center gap-2 rounded-full bg-ink px-3 py-1.5 text-[10px] text-paper">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Saved · lease_signed.pdf · never left this device
        </div>

        <svg className="demo-cursor absolute left-0 top-0 h-4 w-4 drop-shadow" viewBox="0 0 16 16">
          <path d="M2 1 L2 13 L5.5 9.8 L8 15 L10 14 L7.6 8.9 L12.5 8.9 Z" fill="#0c0c0c" stroke="#f2efe9" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
}
