import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGameSession } from '../services/sessionService';
import HostDisplayControls from '../components/HostDisplayControls';
import { storeHostDisplayToken } from '../utils/displayUrl';

export default function NewSession() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [gameName, setGameName] = useState('Mój quiz');
  const [minPlayers, setMinPlayers] = useState(4);
  const [maxPlayers, setMaxPlayers] = useState(49);
  const [createdInfo, setCreatedInfo] = useState<{ roomCode: string; takeoverPIN: string; sessionId: string; displayToken: string; } | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await createGameSession({
        gameName,
        packageId: 'demo-package', // Hardcoded for Phase 1
        themeId: 'default-theme',
        minPlayers,
        maxPlayers,
      });
      storeHostDisplayToken(result.sessionId, result.displayToken);
      setCreatedInfo(result);
    } catch (e: any) {
      alert(`Nie udało się utworzyć sesji: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (createdInfo) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="bg-slate-800 p-8 rounded-xl max-w-lg w-full text-center border border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
          <h2 className="text-3xl font-bold text-green-400 mb-4">Sesja utworzona!</h2>
          <p className="mb-6 text-gray-300">Pokój jest gotowy. Gracze mogą dołączyć za pomocą poniższego kodu.</p>
          
          <div className="bg-slate-900 rounded-lg p-6 mb-6">
            <div className="text-sm text-gray-400 mb-1">Kod pokoju</div>
            <div className="text-5xl font-mono text-cyan-400 font-bold tracking-widest">{createdInfo.roomCode}</div>
          </div>

          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-8">
            <div className="text-sm text-red-300 mb-1 font-semibold uppercase tracking-wider">PIN przejęcia roli prowadzącego</div>
            <div className="text-3xl font-mono text-white mb-2">{createdInfo.takeoverPIN}</div>
            <div className="text-xs text-red-200">Zapisz ten PIN — nie zostanie wyświetlony ponownie. Jest potrzebny do przejęcia roli prowadzącego na innym urządzeniu.</div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => navigate(`/host/${createdInfo.sessionId}`)}
              className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-lg transition-colors"
            >
              Przejdź do poczekalni prowadzącego
            </button>
          </div>
          <HostDisplayControls sessionId={createdInfo.sessionId} initialToken={createdInfo.displayToken} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-cyan-400 mb-8">Konfiguracja nowej sesji</h1>
      
      <form onSubmit={handleCreate} className="bg-slate-800 p-8 rounded-xl border border-slate-700">
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-300 mb-2">Nazwa gry</label>
          <input 
            type="text" 
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
            required
          />
        </div>
        
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Minimalna liczba graczy</label>
            <input 
              type="number" 
              value={minPlayers}
              onChange={(e) => setMinPlayers(Number(e.target.value))}
              min={4} max={49}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Maksymalna liczba graczy</label>
            <input 
              type="number" 
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              min={4} max={49}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg font-bold transition-colors"
        >
          {loading ? 'Tworzenie...' : 'Utwórz sesję'}
        </button>
      </form>
    </div>
  );
}
