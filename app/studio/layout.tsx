import React from 'react';

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full bg-slate-100 overflow-hidden flex flex-col text-slate-800">
      <header className="h-14 bg-white/40 backdrop-blur-md border-b border-white/30 px-6 flex items-center justify-between z-20">
        <div className="font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-mint-600">
          PaperPage Studio Workspace
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium shadow-md">
            Deploy to Staging
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}