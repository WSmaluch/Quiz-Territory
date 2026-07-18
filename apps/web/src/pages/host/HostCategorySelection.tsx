import { autoAssignCategories, extendSelectionDeadline, proceedToBoardReveal } from '../../services/hostService';
import { useEffect, useState } from 'react';

export default function HostCategorySelection({ sessionId, publicData }: any) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const selectionProgress = publicData.selectionProgress || { completedCount: 0, totalCount: 0, deadline: Date.now() };

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try { await action(); } catch (actionError: any) { setError(actionError?.message || 'Nie udało się wykonać akcji kategorii.'); } finally { setBusy(false); }
  };

  const handleAutoAssign = () => {
    void run(() => autoAssignCategories(sessionId, true));
  };

  const handleProceed = () => {
    void run(() => proceedToBoardReveal(sessionId));
  };

  const handleExtend = () => {
    void run(() => extendSelectionDeadline(sessionId, 15));
  };

  const allDone = selectionProgress.completedCount === selectionProgress.totalCount && selectionProgress.totalCount > 0;
  const remainingSeconds = Math.ceil(Math.max(0, selectionProgress.deadline - now) / 1000);

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto flex flex-col items-center justify-center">
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl text-center border border-cyan-500/30">
        <h1 className="text-3xl font-bold text-cyan-400 mb-6">Wybór kategorii</h1>
        <p className="text-gray-300 mb-8 text-xl">Gracze wybierają swoje kategorie...</p>

        <div className="flex flex-col gap-4">
          <div className="text-5xl font-mono text-white mb-8">
            {selectionProgress.completedCount} / {selectionProgress.totalCount}
          </div>
          <div className="text-xl text-gray-300 mb-6">Pozostało: {remainingSeconds}s</div>
        </div>

        <div className="flex gap-4 justify-center">
          <button 
            onClick={handleExtend} disabled={busy}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded font-bold transition-colors"
          >
            +15 sekund
          </button>
          
          <button 
            onClick={handleAutoAssign} disabled={busy}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded font-bold transition-colors"
          >
            Przydziel automatycznie
          </button>

          <button 
            onClick={handleProceed}
            disabled={!allDone || busy}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded font-bold transition-colors"
          >
            Przejdź do prezentacji planszy
          </button>
        </div>
        {error && <p className="mt-5 text-red-300" role="alert">{error}</p>}
      </div>
    </div>
  );
}
