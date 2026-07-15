'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === 'signup';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const fn = isSignup
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password });
    const { error } = await fn;
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Return the user to where they were headed (?next=/studio/…), else dashboard.
    // Only same-origin internal paths are honored.
    const next = new URLSearchParams(window.location.search).get('next');
    const dest = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
    router.push(dest);
    router.refresh();
  }

  return (
    <main className="relative min-h-screen bg-slate-50 overflow-hidden text-slate-800 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-aurora-gradient z-0 pointer-events-none" />
      <Link href="/" className="absolute top-6 left-6 z-10 text-lg font-extrabold tracking-tight hover:opacity-80">
        Paper<span className="text-mint-500">Page</span>
      </Link>
      <form
        onSubmit={onSubmit}
        className="relative z-10 w-full max-w-md p-8 rounded-2xl bg-surface backdrop-blur-xl border border-border shadow-glass"
      >
        <h1 className="text-3xl font-extrabold mb-6">{isSignup ? 'Create your account' : 'Welcome back'}</h1>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-4 py-3 rounded-xl bg-white/70 border border-border outline-none focus:ring-2 focus:ring-mint-400"
        />
        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 px-4 py-3 rounded-xl bg-white/70 border border-border outline-none focus:ring-2 focus:ring-mint-400"
        />
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold hover:-translate-y-0.5 transition-all disabled:opacity-50"
        >
          {loading ? 'Please wait…' : isSignup ? 'Sign up' : 'Log in'}
        </button>
        <p className="text-sm text-slate-500 mt-4 text-center">
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <Link href={isSignup ? '/login' : '/signup'} className="text-mint-500 font-medium">
            {isSignup ? 'Log in' : 'Sign up'}
          </Link>
        </p>
      </form>
    </main>
  );
}
