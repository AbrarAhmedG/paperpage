import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const STEPS = [
  { n: '01', title: 'Upload your sketch', body: 'Photograph or scan a hand-drawn page layout — boxes, lines, and labels are enough.' },
  { n: '02', title: 'AI reads the layout', body: 'PaperPage interprets the drawing into a real 2D layout: nav, hero, cards, tabs, media, footer.' },
  { n: '03', title: 'Refine & export', body: 'Tweak colors, type, and content in the visual editor, then export portable HTML/CSS as a .zip.' },
];

const FEATURES = [
  { icon: '✏️', title: 'Sketch to Site', body: 'Turn a rough drawing into a structured, editable page in seconds — grid layout, not a flat stack.' },
  { icon: '🎨', title: 'Visual refinement', body: 'A drag-and-drop editor with blocks, style controls, and live preview. No code required.' },
  { icon: '📦', title: 'Portable export', body: 'Download clean, self-contained HTML/CSS with images bundled — host it anywhere, no lock-in.' },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const primaryHref = user ? '/dashboard' : '/login';
  const primaryLabel = user ? 'Go to Dashboard' : 'Get started';

  return (
    <main className="relative min-h-screen bg-slate-50 overflow-hidden text-slate-800">
      <div className="absolute inset-0 bg-aurora-gradient z-0 pointer-events-none" />

      {/* Nav */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <span className="text-xl font-extrabold tracking-tight">
          Paper<span className="text-mint-500">Page</span>
        </span>
        <nav className="flex items-center gap-2 text-sm">
          {user ? (
            <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold hover:-translate-y-0.5 transition-all">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="px-4 py-2 rounded-lg font-medium hover:bg-white/50 transition-colors">
                Log in
              </Link>
              <Link href="/signup" className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold hover:-translate-y-0.5 transition-all">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-16 flex flex-col items-center text-center">
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/50 backdrop-blur-md border border-white border-opacity-50 shadow-glass mb-8">
          <span className="text-sm font-medium bg-clip-text text-transparent bg-gradient-to-r from-mint-500 to-gold-500">
            Sketch to Site — now in v1
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
          From a napkin sketch<br />
          <span className="text-mint-500">to a live page.</span>
        </h1>

        <p className="text-xl text-slate-500 max-w-2xl mb-10">
          Photograph a hand-drawn layout. Our AI turns it into a real, editable web page you can
          refine visually and export as clean HTML/CSS.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href={primaryHref}
            className="px-8 py-4 rounded-xl bg-slate-900 text-white font-semibold shadow-lg hover:shadow-xl transition-all inline-block hover:-translate-y-1"
          >
            {primaryLabel}
          </Link>
          {!user && (
            <Link
              href="/signup"
              className="px-8 py-4 rounded-xl bg-white/60 backdrop-blur-md border border-border font-semibold hover:bg-white/80 transition-all inline-block"
            >
              Create an account
            </Link>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-center text-3xl font-extrabold mb-12">How it works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((s) => (
            <div key={s.n} className="p-8 rounded-2xl bg-surface backdrop-blur-lg border border-border shadow-glass">
              <div className="text-mint-500 font-extrabold text-sm mb-3">{s.n}</div>
              <h3 className="text-xl font-bold mb-2">{s.title}</h3>
              <p className="text-slate-500 text-sm">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {FEATURES.map((f) => (
            <div key={f.title} className="p-8 rounded-2xl bg-surface backdrop-blur-lg border border-border shadow-glass text-left">
              <div className="h-10 w-10 rounded-lg bg-mint-50 flex items-center justify-center mb-4 text-lg">{f.icon}</div>
              <h3 className="text-xl font-bold mb-2">{f.title}</h3>
              <p className="text-slate-500 text-sm">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Draw it. Ship it.</h2>
        <p className="text-slate-500 mb-8">Your next page starts as a doodle. Bring it to life in minutes.</p>
        <Link
          href={primaryHref}
          className="px-8 py-4 rounded-xl bg-slate-900 text-white font-semibold shadow-lg hover:shadow-xl transition-all inline-block hover:-translate-y-1"
        >
          {primaryLabel}
        </Link>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/60 bg-white/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <span className="font-extrabold text-slate-700">Paper<span className="text-mint-500">Page</span></span>
          <span>From a napkin sketch to a live page.</span>
          <div className="flex gap-4">
            {user ? (
              <Link href="/dashboard" className="hover:text-slate-800">Dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="hover:text-slate-800">Log in</Link>
                <Link href="/signup" className="hover:text-slate-800">Sign up</Link>
              </>
            )}
          </div>
        </div>
      </footer>
    </main>
  );
}
