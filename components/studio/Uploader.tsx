'use client';

import { useState, useRef } from 'react';

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
  const inputRef = useRef<HTMLInputElement>(null);

  function choose(f: File | null) {
    if (!f) return;
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
    <div className="max-w-xl mx-auto py-16">
      <h1 className="text-3xl font-extrabold mb-2">Upload your sketch</h1>
      <p className="text-slate-600 mb-3">
        Upload a photo or scan of a hand-drawn <strong>web-page layout</strong> — boxes for sections,
        lines for text, and labels like &ldquo;nav&rdquo;, &ldquo;hero&rdquo;, &ldquo;AD&rdquo;, &ldquo;footer&rdquo;.
      </p>
      <p className="text-slate-500 text-sm mb-8">
        Tips: good lighting, high contrast, one page, legible labels. Clearer sketches produce better results.
      </p>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          choose(e.dataTransfer.files?.[0] ?? null);
        }}
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer border-2 border-dashed border-border rounded-2xl bg-surface backdrop-blur-lg p-10 text-center"
      >
        {preview ? (
          <img src={preview} alt="Sketch preview" className="max-h-64 mx-auto rounded-xl" />
        ) : (
          <p className="text-slate-500">Drag & drop a photo here, or click to choose</p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="hidden"
          onChange={(e) => choose(e.target.files?.[0] ?? null)}
        />
      </div>

      {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

      <button
        onClick={generate}
        disabled={!file || status === 'loading'}
        className="mt-6 w-full py-3 rounded-xl bg-slate-900 text-white font-semibold disabled:opacity-50"
      >
        {status === 'loading' ? 'Generating your page… (this can take ~20s)' : 'Generate'}
      </button>
    </div>
  );
}
