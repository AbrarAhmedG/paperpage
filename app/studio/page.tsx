'use client';
import IntegrationWizard from '@/components/IntegrationWizard';

export default function StudioPage() {
  return (
    <div className="h-full grid grid-cols-[300px_1fr_320px]">
      {/* Left Input Lounge */}
      <aside className="bg-white/30 backdrop-blur-md border-r border-white/20 p-4 space-y-6 overflow-y-auto">
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Workspace Authorization</h4>
          <IntegrationWizard />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Figma Frame URL</h4>
          <input type="text" placeholder="https://figma.com/file/..." className="w-full px-3 py-2 text-xs bg-white border rounded-lg" />
        </div>
      </aside>

      {/* Center Live Viewport Emulator */}
      <main className="bg-slate-50 flex flex-col overflow-hidden relative">
        <div className="flex-1 p-6 flex items-center justify-center">
          <iframe 
            className="w-full h-full max-w-4xl max-h-[600px] bg-white rounded-2xl shadow-glass border border-slate-200"
            srcDoc="<html><head><script src='https://cdn.tailwindcss.com'></script></head><body class='bg-slate-50 p-8'><div class='p-6 bg-white rounded-xl shadow-sm'><h2 class='text-2xl font-bold text-mint-500'>Viewport Ready</h2><p class='text-slate-500 text-sm'>Imported UI frames render here safely.</p></div></body></html>"
            title="Live Preview"
          />
        </div>
        {/* Chat Bar */}
        <div className="h-20 bg-white/50 backdrop-blur-xl border-t border-slate-200/60 p-4 flex items-center">
          <div className="w-full max-w-2xl mx-auto relative">
            <input type="text" placeholder="Chat with your UI..." className="w-full py-2.5 pl-4 pr-10 rounded-full bg-white text-sm border shadow-sm focus:outline-none" />
            <button className="absolute right-2 top-2 bg-mint-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs">↑</button>
          </div>
        </div>
      </main>

      {/* Right Customizer Accordion */}
      <aside className="bg-white/30 backdrop-blur-md border-l border-white/20 p-4 space-y-6">
        <h4 className="text-xs font-bold text-slate-400 uppercase">Visual Spacing Sliders</h4>
        <div>
          <label className="text-xs font-medium flex justify-between mb-1 text-slate-600">Padding Global</label>
          <input type="range" className="w-full accent-mint-500" />
        </div>
        <div>
          <label className="text-xs font-medium block mb-2 text-slate-600">Active Layout Palettes</label>
          <div className="flex gap-2">
            {['#14b8a6', '#facc15', '#0f172a'].map((c) => (
              <div key={c} className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}