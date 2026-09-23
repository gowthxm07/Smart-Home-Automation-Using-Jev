export default function HomePage() {
  return (
    <main className="min-h-screen p-8 flex flex-col items-center justify-center">
      <div className="glass-panel p-8 rounded-2xl max-w-xl text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          SIMULATION ENVIRONMENT: ONLINE
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">HomeMind</h1>
        <p className="text-sm text-slate-400">Context-Aware Smart Home Decision Engine</p>
        <p className="text-xs text-slate-500 border-t border-slate-800 pt-4">
          Phase 1: Project Foundation Initialized. No physical IoT hardware connected.
        </p>
      </div>
    </main>
  );
}
