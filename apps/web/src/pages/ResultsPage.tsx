import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { useStore } from '../store/useStore';
import { generateUUID } from '../utils/uuid';
import { storeHostDisplayToken } from '../utils/displayUrl';

export default function ResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useStore();
  
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rematchLoading, setRematchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const fetchResults = async () => {
      try {
        const resultFn = httpsCallable(functions, 'getGameResults');
        const response = await resultFn({ sessionId }) as any;
        setResults(response.data.game);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || 'Nie udało się pobrać wyników.');
      }
      setLoading(false);
    };
    fetchResults();
  }, [sessionId]);

  if (loading) return <div className="text-white text-center py-20">Ładowanie wyników...</div>;
  if (error) return <div className="text-red-300 text-center py-20" role="alert">{error}</div>;
  if (!results) return <div className="text-white text-center py-20">Brak wyników lub gra nie została jeszcze zakończona.</div>;

  const isOwner = user && user.uid === results.ownerId;

  const handleRematch = async () => {
    if (!window.confirm("Zagrać jeszcze raz?")) return;
    setRematchLoading(true);
    try {
      const rematchFn = httpsCallable(functions, 'createRematchSession');
      const response = await rematchFn({ oldSessionId: sessionId, commandId: generateUUID() }) as any;
      const { newSessionId, displayToken } = response.data;
      if (displayToken) storeHostDisplayToken(newSessionId, displayToken);
      navigate(`/host/${newSessionId}`);
    } catch (err) {
      console.error(err);
      alert('Nie udało się utworzyć rewanżu.');
    }
    setRematchLoading(false);
  };

  const formatDuration = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-cyan-400 mb-2">Wyniki: {results.gameName}</h1>
        <p className="text-center text-gray-400 mb-12">Czas trwania: {formatDuration(results.duration)}</p>

        <div className="bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700 mb-12 text-center">
          <h2 className="text-2xl font-semibold mb-6 text-yellow-400">Podium</h2>
          <div className="flex justify-center items-end gap-4 h-48">
            {results.podium[1] && (
              <div className="flex flex-col items-center">
                <span className="mb-2 font-semibold truncate w-24">
                  {results.playerResults.find((p: any) => p.playerId === results.podium[1])?.nickname}
                </span>
                <div className="w-24 h-24 bg-slate-600 rounded-t-lg flex items-center justify-center text-2xl font-bold border-t-2 border-slate-400 text-slate-300">2</div>
              </div>
            )}
            {results.podium[0] && (
              <div className="flex flex-col items-center">
                <span className="mb-2 font-bold text-xl truncate w-24 text-yellow-400">
                  {results.playerResults.find((p: any) => p.playerId === results.podium[0])?.nickname}
                </span>
                <div className="w-24 h-32 bg-yellow-600 rounded-t-lg flex items-center justify-center text-4xl font-bold border-t-2 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)] text-yellow-200">1</div>
              </div>
            )}
            {results.podium[2] && (
              <div className="flex flex-col items-center">
                <span className="mb-2 font-semibold truncate w-24">
                  {results.playerResults.find((p: any) => p.playerId === results.podium[2])?.nickname}
                </span>
                <div className="w-24 h-16 bg-amber-800 rounded-t-lg flex items-center justify-center text-xl font-bold border-t-2 border-amber-600 text-amber-500">3</div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700 mb-12">
          <h2 className="text-2xl font-semibold mb-6">Wszyscy Gracze</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {results.playerResults.map((p: any, idx: number) => (
              <div key={p.playerId} className="p-4 bg-slate-900 rounded-lg flex justify-between items-center border border-slate-700">
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 font-mono w-6">{idx + 1}.</span>
                  <span className="font-semibold text-lg">{p.nickname}</span>
                </div>
                {p.playerId === results.winnerId ? (
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded uppercase font-bold">Zwycięzca</span>
                ) : p.status === 'ELIMINATED' ? (
                  <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded uppercase">Wyeliminowany</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-6">
          <button onClick={() => navigate('/admin')} className="px-8 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold transition-colors">
            Wróć do Dashboardu
          </button>
          {isOwner && (
            <button 
              onClick={handleRematch} 
              disabled={rematchLoading}
              className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-semibold shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
            >
              {rematchLoading ? 'Tworzenie...' : 'Zagraj ponownie'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
