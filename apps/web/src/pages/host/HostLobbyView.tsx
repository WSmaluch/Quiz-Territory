import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { hostAction, startCategorySelection } from '../../services/hostService';

export default function HostLobbyView({ sessionId, publicData, players, presence, canStart, approvedCount }: any) {
  const joinUrl = `${window.location.origin}/join?code=${publicData.roomCode}`;
  const playerList = Object.entries(players || {}) as Array<[string, any]>;
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const handleApprove = (playerId: string) => hostAction({ sessionId, action: 'APPROVE', targetPlayerId: playerId });
  const handleReject = (playerId: string) => hostAction({ sessionId, action: 'REJECT', targetPlayerId: playerId });
  const handleRemove = (playerId: string) => hostAction({ sessionId, action: 'REMOVE', targetPlayerId: playerId });
  const toggleJoining = () => hostAction({ sessionId, action: publicData.joinOpen ? 'CLOSE_JOINING' : 'OPEN_JOINING' });

  const handleStartCategorySelection = async () => {
    const approvedPlayerCount = playerList.filter(([, player]) => player.status === 'APPROVED').length;
    console.info('[host-start] clicked', {
      sessionId,
      playerCount: playerList.length,
      approvedPlayerCount,
    });
    setIsStarting(true);
    setStartError(null);

    try {
      console.info('[host-start] before callable');
      const response = await startCategorySelection(sessionId);
      console.info('[host-start] callable response', response);
    } catch (error: any) {
      console.error('[host-start] failed', error);
      setStartError(error?.message || 'Nie udało się rozpocząć wyboru kategorii.');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto flex flex-col md:flex-row gap-8">
      <div className="md:w-1/3">
        <div className="bg-slate-800 p-6 rounded-xl border border-cyan-500/50 shadow-xl text-center mb-6">
          <h1 className="text-2xl font-bold text-cyan-400 mb-2">{publicData.gameName}</h1>
          <p className="text-gray-400 mb-6">Wejdź na <strong className="text-white">{window.location.host}/join</strong></p>
          
          <div className="bg-slate-900 rounded-lg p-4 mb-6 inline-block">
            <div className="text-sm text-gray-400 mb-1">Kod pokoju</div>
            <div className="text-5xl font-mono text-cyan-400 font-bold tracking-widest">{publicData.roomCode}</div>
          </div>

          <div className="bg-white p-4 rounded-lg inline-block mx-auto mb-6">
            <QRCodeSVG value={joinUrl} size={150} />
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={toggleJoining}
              className={`py-2 rounded font-semibold transition-colors ${publicData.joinOpen ? 'bg-orange-600 hover:bg-orange-500' : 'bg-green-600 hover:bg-green-500'}`}
            >
              {publicData.joinOpen ? 'Zamknij dołączanie' : 'Otwórz dołączanie'}
            </button>
            <button 
              disabled={!canStart || isStarting}
              className="py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded font-bold transition-colors text-lg"
              onClick={handleStartCategorySelection}
            >
              {isStarting ? 'Uruchamianie...' : `Rozpocznij grę (${approvedCount}/${publicData.maxPlayers})`}
            </button>
            {!canStart && <p className="text-xs text-red-300 mt-1">Potrzeba co najmniej {publicData.minPlayers} zatwierdzonych graczy</p>}
            {startError && <p className="text-sm text-red-300 mt-1" role="alert">{startError}</p>}
          </div>
        </div>
      </div>

      <div className="md:w-2/3">
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl h-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Połączeni gracze</h2>
            <span className="text-gray-400">{playerList.length} / {publicData.maxPlayers}</span>
          </div>

          {playerList.length === 0 ? (
            <div className="text-center text-gray-500 py-12">Oczekiwanie na graczy...</div>
          ) : (
            <ul className="space-y-3">
              {playerList.map(([playerId, player]) => {
                const isOnline = presence[playerId]?.state === 'ONLINE';
                return (
                  <li key={playerId} className="bg-slate-900 border border-slate-700 p-4 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-gray-500'}`} />
                      <div>
                        <div className="font-bold text-lg">{player.nickname}</div>
                        <div className="text-xs text-gray-400">Status: <span className={player.status === 'APPROVED' ? 'text-green-400' : player.status === 'REJECTED' ? 'text-red-400' : 'text-yellow-400'}>{player.status === 'APPROVED' ? 'Zatwierdzony' : player.status === 'REJECTED' ? 'Odrzucony' : 'Oczekuje'}</span></div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {player.status === 'PENDING' && (
                        <>
                          <button onClick={() => handleApprove(playerId)} className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm font-semibold">Zatwierdź</button>
                          <button onClick={() => handleReject(playerId)} className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm font-semibold">Odrzuć</button>
                        </>
                      )}
                      {player.status === 'APPROVED' && (
                        <button onClick={() => handleRemove(playerId)} className="px-3 py-1 bg-red-900 hover:bg-red-800 rounded text-sm font-semibold">Usuń</button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
