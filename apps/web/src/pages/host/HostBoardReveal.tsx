import { proceedToPlayerDraw } from '../../services/hostService';
import { useState } from 'react';
import BoardCategorySummary from '../../components/BoardCategorySummary';

export default function HostBoardReveal({ sessionId, publicData, players }: any) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleProceed = async () => {
    setBusy(true);
    setError(null);
    try { await proceedToPlayerDraw(sessionId); } catch (actionError: any) { setError(actionError?.message || 'Nie udało się przejść do losowania.'); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto flex flex-col items-center justify-center">
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl text-center border border-cyan-500/30">
        <h1 className="text-3xl font-bold text-cyan-400 mb-6">Prezentacja planszy</h1>
        <p className="text-gray-300 mb-8 text-xl">Plansza jest prezentowana na ekranie TV...</p>
        <BoardCategorySummary publicData={publicData} players={players} />

        <button 
          onClick={handleProceed} disabled={busy}
          className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold transition-colors text-lg"
        >
          {busy ? 'Przechodzenie...' : 'Przejdź do losowania gracza'}
        </button>
        {error && <p className="mt-5 text-red-300" role="alert">{error}</p>}
      </div>
    </div>
  );
}
