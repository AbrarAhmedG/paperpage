'use client';

import { useState, useRef, useEffect } from 'react';
import { generationStage } from '@/utils/studio/progress';

export default function Uploader({
  projectId,
  onGenerated,
}: {
  projectId: string;
  onGenerated: (data: { html: string; css: string; name?: string }) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const loading = status === 'loading';

  // Advance the perceived-progress stage while a generation is in flight.
  useEffect(() => {
    if (!loading) return;
    const started = Date.now();
    setStage(generationStage(0));
    const t = setInterval(() => setStage(generationStage(Date.now() - started)), 500);
    return () => clearInterval(t);
  }, [loading]);

  function choose(f: File | null) {
    if (!f || loading) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  }

  async function generate() {
    if (!file) return;
    setStatus('loading');
    setError(null);
    const fd = new FormData();
    fd.append('projectId', projectId);
    fd.append('image', file);
    try {
      const res = await fetch('/api/generate', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setError(data.error ?? 'Generation failed');
        return;
      }
      onGenerated({ html: data.html, css: data.css, name: data.name });
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Network error');
    }
  }

  return (
    <div className="max-w-xl mx-auto py-16 px-6">
      <div className="p-8 rounded-2xl bg-surface backdrop-blur-xl border border-border shadow-glass">
        <h1 className="text-3xl font-extrabold mb-2">Upload your sketch</h1>
        <p className="text-slate-600 mb-2">
          Photograph a hand-drawn <strong>web-page layout</strong> — boxes for sections, lines for
          text, and labels like &ldquo;nav&rdquo;, &ldquo;hero&rdquo;, &ldquo;footer&rdquo;.
        </p>
        <p className="text-slate-500 text-sm mb-6">
          Good lighting, high contrast, one page. Clearer sketches produce better results.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            choose(e.dataTransfer.files?.[0] ?? null);
          }}
          onClick={() => !loading && inputRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
            loading
              ? 'opacity-60 pointer-events-none border-slate-200 bg-white/50'
              : dragging
                ? 'border-mint-400 bg-mint-50/70 cursor-copy'
                : 'border-slate-300 bg-white/60 hover:border-mint-400 hover:bg-white/80 cursor-pointer'
          }`}
        >
          {preview ? (
            <img src={preview} alt="Sketch preview" className="max-h-64 mx-auto rounded-xl shadow" />
          ) : (
            <div className="flex flex-col items-center gap-4 text-slate-500">
              {/* what a usable sketch looks like */}
              <svg
                viewBox="0 0 200 140"
                className="w-40 h-auto text-slate-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10 10 q 14 -2 28 1 q 1 6 -1 12 q -14 2 -27 -1 q -1 -6 0 -12 Z" />
                <path d="M150 16 q 12 -2 26 1" />
                <path d="M10 34 q 88 -3 180 2 q 2 24 -1 48 q -90 3 -178 -2 q -3 -24 -1 -48 Z" />
                <path d="M56 54 q 40 -3 86 2" strokeWidth="4" />
                <path d="M76 70 q 22 -2 46 1" opacity="0.6" />
                <path d="M10 96 q 24 -2 50 1 q 2 16 -1 32 q -25 2 -48 -1 q -2 -16 -1 -32 Z" />
                <path d="M74 97 q 25 -3 50 1 q 2 17 -1 32 q -25 2 -48 -1 q -2 -16 -1 -32 Z" />
                <path d="M138 96 q 25 -2 50 1 q 2 16 -1 32 q -25 3 -48 -1 q -2 -16 -1 -32 Z" />
              </svg>
              <div className="flex items-center gap-2 font-medium text-slate-600">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-mint-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <path d="M17 8l-5-5-5 5" />
                  <path d="M12 3v12" />
                </svg>
                Drag &amp; drop a photo here, or click to choose
              </div>
              <span className="text-xs text-slate-400">JPEG, PNG, WebP or HEIC — up to 10 MB</span>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="hidden"
            onChange={(e) => choose(e.target.files?.[0] ?? null)}
          />
        </div>

        {error && (
          <p className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </p>
        )}

        <button
          onClick={generate}
          disabled={!file || loading}
          className={`mt-6 w-full py-3 rounded-xl font-semibold transition-all ${
            file
              ? 'bg-slate-900 text-white hover:-translate-y-0.5 disabled:translate-y-0'
              : 'bg-white/60 border border-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2.5">
              <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                <path d="M12 2a10 10 0 1 0 10 10" />
              </svg>
              {stage}
            </span>
          ) : (
            'Generate'
          )}
        </button>
        {loading && (
          <p className="mt-3 text-center text-xs text-slate-500">
            This usually takes about 20 seconds — hang tight.
          </p>
        )}
      </div>
    </div>
  );
}
