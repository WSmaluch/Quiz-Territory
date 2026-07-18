import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { logout } from '../services/authService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useStore();

  const [activeGames, setActiveGames] = useState<any[]>([]);
  const [suspendedGames, setSuspendedGames] = useState<any[]>([]);
  const [completedGames, setCompletedGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGames = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Completed games
      const completedQuery = query(collection(db, 'completedGames'), where('ownerId', '==', user.uid));
      const completedSnap = await getDocs(completedQuery);
      setCompletedGames(completedSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Active / Suspended from sessions collection
      // For active, we ideally want to check RTDB, but we can also just fetch all sessions and check their recovery snapshots, or we can check the sessions document.
      // Phase 4 Lite: "For each unfinished game show: game name, current phase, player count, remaining active players, last saved time, Resume button, End permanently button."
      const sessionsQuery = query(collection(db, 'sessions'), where('ownerId', '==', user.uid));
      const sessionsSnap = await getDocs(sessionsQuery);
      
      const active: any[] = [];
      const suspended: any[] = [];

      for (const doc of sessionsSnap.docs) {
        const data = doc.data();
        if (data.phase === 'GAME_COMPLETE' || data.status === 'GAME_COMPLETE') continue; // Should be in completedGames
        
        const state = data.phase || data.status || 'UNKNOWN';
        const gameItem = {
          id: doc.id,
          gameName: data.gameName || 'Nieznana gra',
          phase: state,
          playerCount: data.playerCount || 0,
          remainingPlayers: data.activePlayerCount || 0,
          lastSaved: data.updatedTimestamp?.toDate?.() || new Date(),
        };

        if (state === 'GAME_SUSPENDED') {
          suspended.push(gameItem);
        } else if (state !== 'ABORTED' && state !== 'GAME_COMPLETE') {
          active.push(gameItem);
        }
      }

      setActiveGames(active);
      setSuspendedGames(suspended);
    } catch (err) {
      console.error('Error fetching games', err);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    void fetchGames();
  }, [user, navigate, fetchGames]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleResume = async (sessionId: string) => {
    try {
      const resumeGameSession = httpsCallable(functions, 'resumeGameSession');
      await resumeGameSession({ sessionId });
      navigate(`/host/${sessionId}`);
    } catch (err) {
      console.error('Failed to resume', err);
      alert('Nie udało się wznowić gry.');
    }
  };

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto text-white">
      <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
        <h1 className="text-3xl font-bold text-cyan-400">Admin Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-300">{user?.email || 'Prowadzący demo'}</span>
          <button onClick={handleLogout} className="px-4 py-2 bg-red-900 hover:bg-red-800 rounded text-sm transition-colors">
            Wyloguj
          </button>
        </div>
      </div>

      <div className="mb-8">
        <button 
          onClick={() => navigate('/admin/sessions/new')}
          className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-semibold shadow-lg shadow-cyan-500/20 transition-all"
        >
          + Utwórz nową grę
        </button>
        <button 
          onClick={() => navigate('/admin/history')}
          className="ml-4 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-all"
        >
          Historia Gier
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Ładowanie gier...</div>
      ) : (
        <div className="space-y-12">
          {/* Suspended Games */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-yellow-400 border-b border-gray-700 pb-2">Zawieszone gry</h2>
            {suspendedGames.length === 0 ? (
              <p className="text-gray-500">Brak zawieszonych gier.</p>
            ) : (
              <div className="grid gap-4">
                {suspendedGames.map(game => (
                  <div key={game.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-lg">{game.gameName}</h3>
                      <p className="text-sm text-gray-400">Faza: {game.phase} • Graczy: {game.remainingPlayers}/{game.playerCount}</p>
                      <p className="text-xs text-gray-500 mt-1">Zapisano: {game.lastSaved.toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleResume(game.id)} className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded text-sm font-semibold transition-colors">
                        Wznów
                      </button>
                      <button onClick={() => alert('Zakończenie usuwa grę trwale. Funkcja wkrótce.')} className="px-4 py-2 bg-red-900 hover:bg-red-800 rounded text-sm font-semibold transition-colors">
                        Zakończ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Active Games */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-green-400 border-b border-gray-700 pb-2">Aktywne gry</h2>
            {activeGames.length === 0 ? (
              <p className="text-gray-500">Brak aktywnych gier.</p>
            ) : (
              <div className="grid gap-4">
                {activeGames.map(game => (
                  <div key={game.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-lg">{game.gameName}</h3>
                      <p className="text-sm text-gray-400">Faza: {game.phase} • Graczy: {game.playerCount}</p>
                    </div>
                    <button onClick={() => navigate(`/host/${game.id}`)} className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 rounded text-sm font-semibold transition-colors">
                      Otwórz panel hosta
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
          
          {/* Completed Games shortcut */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-400 border-b border-gray-700 pb-2">Zakończone gry</h2>
            <p className="text-gray-500 text-sm mb-4">Wszystkie zakończone gry znajdują się w Historii Gier.</p>
            <div className="grid gap-4">
                {completedGames.slice(0, 3).map(game => (
                  <div key={game.id} className="bg-slate-900 p-4 rounded-lg border border-slate-800 flex justify-between items-center opacity-80">
                    <div>
                      <h3 className="font-semibold">{game.gameName}</h3>
                      <p className="text-sm text-gray-500">Zwycięzca: {game.winnerNickname || 'Brak'}</p>
                    </div>
                    <button onClick={() => navigate(`/results/${game.id}`)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors">
                      Wyniki
                    </button>
                  </div>
                ))}
              </div>
          </section>
        </div>
      )}
    </div>
  );
}
