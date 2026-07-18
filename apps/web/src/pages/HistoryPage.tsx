import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { user } = useStore();

  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    const fetchHistory = async () => {
      try {
        const q = query(
          collection(db, 'completedGames'),
          where('ownerId', '==', user.uid),
          orderBy('completedAt', 'desc')
        );
        const snap = await getDocs(q);
        setGames(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchHistory();
  }, [user, navigate]);

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto text-white">
      <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
        <h1 className="text-3xl font-bold text-cyan-400">Historia Gier</h1>
        <button onClick={() => navigate('/admin')} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors">
          Wróć do Dashboardu
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Ładowanie historii...</div>
      ) : games.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Brak zakończonych gier.</div>
      ) : (
        <div className="grid gap-4">
          {games.map(game => (
            <div key={game.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg">{game.gameName}</h3>
                <p className="text-sm text-gray-400">
                  Data: {new Date(game.completedAt).toLocaleString()} • Zwycięzca: <span className="text-yellow-400 font-bold">{game.winnerNickname || 'Brak'}</span>
                </p>
              </div>
              <button onClick={() => navigate(`/results/${game.id}`)} className="px-6 py-2 bg-cyan-700 hover:bg-cyan-600 rounded font-semibold transition-colors">
                Zobacz wyniki
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
