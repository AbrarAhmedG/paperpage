// Hero showcase: a hand-drawn page sketch and the polished page PaperPage
// renders from it, sharing the same structure (nav / hero / three cards) so
// the visual itself demonstrates the product's layout fidelity.
export default function SketchToSiteVisual() {
  return (
    <div
      role="img"
      aria-label="A hand-drawn sketch of a page layout being transformed into a polished web page"
      className="w-full max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8"
    >
      <SketchPanel />
      <TransformArrow />
      <RenderedPanel />
    </div>
  );
}

/* The sketch: wobbly ink strokes on a tilted sheet of paper. */
function SketchPanel() {
  return (
    <div
      aria-hidden="true"
      className="w-full max-w-sm md:w-2/5 -rotate-1 md:-rotate-2 transition-transform duration-300 hover:rotate-0 rounded-xl bg-white shadow-glass border border-slate-200 p-4"
    >
      <svg viewBox="0 0 400 300" className="w-full h-auto" fill="none" stroke="#64748b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {/* nav: logo box + two menu strokes */}
        <path d="M18 20 q 20 -3 42 1 q 2 8 -1 16 q -22 3 -42 -1 q -2 -9 1 -16 Z" />
        <path d="M300 28 q 16 -3 34 1" />
        <path d="M344 27 q 16 -2 36 2" />
        {/* hero: big frame with two headline squiggles and a button */}
        <path d="M18 58 q 180 -6 364 2 q 4 48 -2 96 q -182 6 -362 -2 q -5 -49 0 -96 Z" />
        <path d="M120 96 q 78 -6 160 2" strokeWidth="5" />
        <path d="M146 122 q 52 -4 108 2" opacity="0.7" />
        <path d="M168 142 q 30 -4 64 2 q 3 8 -1 16 q -32 3 -62 -1 q -3 -9 -1 -17 Z" stroke="#14b8a6" />
        {/* three cards: frame + icon circle + text squiggle each */}
        <path d="M18 186 q 52 -4 108 2 q 4 44 -2 88 q -54 4 -104 -2 q -4 -45 -2 -88 Z" />
        <circle cx="46" cy="216" r="12" />
        <path d="M32 254 q 38 -4 80 2" />
        <path d="M146 188 q 52 -5 108 1 q 5 45 -1 89 q -54 3 -106 -1 q -3 -45 -1 -89 Z" />
        <circle cx="174" cy="217" r="12" />
        <path d="M160 255 q 40 -3 80 1" />
        <path d="M274 187 q 54 -4 108 2 q 3 44 -3 88 q -52 4 -104 -2 q -3 -44 -1 -88 Z" />
        <circle cx="302" cy="216" r="12" />
        <path d="M288 254 q 40 -4 80 2" />
      </svg>
    </div>
  );
}

/* Mint arrow with an AI chip; points down when the panels stack on mobile. */
function TransformArrow() {
  return (
    <div aria-hidden="true" className="flex flex-col items-center gap-2 rotate-90 md:rotate-0 shrink-0 my-1 md:my-0">
      <svg viewBox="0 0 48 24" className="w-12 h-6 text-mint-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12 h 38" />
        <path d="M32 4 l 10 8 -10 8" />
      </svg>
      <span className="-rotate-90 md:rotate-0 px-2.5 py-1 rounded-full bg-white/60 backdrop-blur-md border border-border shadow-glass text-[10px] font-bold tracking-widest text-mint-500">
        AI
      </span>
    </div>
  );
}

/* The result: the same layout rendered as a crisp mini page in a browser frame. */
function RenderedPanel() {
  return (
    <div
      aria-hidden="true"
      className="w-full max-w-sm md:w-2/5 rotate-1 md:rotate-2 transition-transform duration-300 hover:rotate-0 rounded-xl bg-white shadow-glass border border-slate-200 overflow-hidden"
    >
      {/* browser chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 border-b border-slate-200">
        <span className="h-2 w-2 rounded-full bg-slate-300" />
        <span className="h-2 w-2 rounded-full bg-slate-300" />
        <span className="h-2 w-2 rounded-full bg-slate-300" />
        <span className="ml-2 h-3 flex-1 max-w-[60%] rounded-full bg-white border border-slate-200" />
      </div>
      <div className="p-3">
        {/* nav */}
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="h-2.5 w-10 rounded-full bg-mint-500" />
          <span className="flex gap-2">
            <span className="h-2 w-8 rounded-full bg-slate-200" />
            <span className="h-2 w-8 rounded-full bg-slate-200" />
          </span>
        </div>
        {/* hero band */}
        <div className="rounded-lg bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 px-4 py-6 flex flex-col items-center gap-2 mb-2">
          <span className="h-3 w-3/5 rounded-full bg-white/90" />
          <span className="h-2 w-2/5 rounded-full bg-white/50" />
          <span className="mt-1 h-4 w-16 rounded-md bg-mint-400" />
        </div>
        {/* three cards */}
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-white p-2 flex flex-col items-start gap-1.5">
              <span className={`h-4 w-4 rounded-md ${i === 1 ? 'bg-gold-400/70' : 'bg-mint-400/70'}`} />
              <span className="h-1.5 w-full rounded-full bg-slate-200" />
              <span className="h-1.5 w-2/3 rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
