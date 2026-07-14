import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-slate-50 overflow-hidden text-slate-800">
      <div className="absolute inset-0 bg-aurora-gradient z-0 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-24 flex flex-col items-center text-center">
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/50 backdrop-blur-md border border-white border-opacity-50 shadow-glass mb-8">
          <span className="text-sm font-medium bg-clip-text text-transparent bg-gradient-to-r from-mint-500 to-gold-500">
            Sketch to Site — now in v1
          </span>
        </div>

        <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
          From a napkin sketch<br />
          <span className="text-mint-500">to a live page.</span>
        </h1>

        <p className="text-xl text-slate-500 max-w-2xl mb-10">
          Photograph a hand-drawn layout. Our AI turns it into a real, editable web page you can
          refine visually and export as clean HTML/CSS.
        </p>

        <div>
          <Link href="/signup" className="px-8 py-4 rounded-xl bg-slate-900 text-white font-semibold shadow-lg hover:shadow-xl transition-all inline-block hover:-translate-y-1">
            Start free
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-24 w-full">
          {['Sketch to Site', 'Visual Refinement', 'Portable Export'].map((feature) => (
            <div key={feature} className="p-8 rounded-2xl bg-surface backdrop-blur-lg border border-border shadow-glass text-left">
              <div className="h-10 w-10 rounded-lg bg-mint-50 flex items-center justify-center mb-4">✨</div>
              <h3 className="text-xl font-bold mb-2">{feature}</h3>
              <p className="text-slate-500 text-sm">Automated system layout updates instantly without corrupting underlying structural components.</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
