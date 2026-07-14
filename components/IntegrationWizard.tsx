'use client';
import { useState } from 'react';

export default function IntegrationWizard() {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const validateFigmaKey = async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/integrations/verify-figma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error('Invalid key');
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/40 shadow-glass w-full">
      <h3 className="text-lg font-bold mb-1">Connect Figma Api</h3>
      <p className="text-xs text-slate-500 mb-4">Link tokens to fetch visual layout structures directly.</p>
      
      <a 
        href="https://www.figma.com/settings/developers" 
        target="_blank" 
        rel="noreferrer"
        className="block w-full text-center py-2 mb-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium hover:bg-slate-100 transition-colors"
      >
        Get your Figma Key in 1-Click ↗
      </a>

      <input 
        type="password"
        placeholder="Paste your token..."
        value={token}
        onChange={(e) => setToken(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-lg bg-white/80 border border-slate-200 mb-3 focus:outline-none focus:ring-2 focus:ring-mint-400"
      />

      <button 
        onClick={validateFigmaKey}
        disabled={!token || status === 'loading'}
        className="w-full py-2 rounded-lg bg-mint-500 text-white text-sm font-bold hover:bg-mint-600 disabled:opacity-50 transition-colors"
      >
        {status === 'loading' ? 'Verifying key integrity...' : 'Connect Key'}
      </button>

      {status === 'success' && <div className="mt-2 text-xs text-green-600">✅ Connection Successful!</div>}
      {status === 'error' && <div className="mt-2 text-xs text-red-600">❌ Key invalid. Try copying again.</div>}
    </div>
  );
}