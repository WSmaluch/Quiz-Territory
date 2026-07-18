import { QRCodeSVG } from 'qrcode.react';

export default function DisplayLobbyView({ publicData, approvedPlayers }: any) {
  const joinUrl = `${window.location.origin}/join?code=${publicData.roomCode}`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-slate-900 w-full">
      {/* Background decorations */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/30 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/30 rounded-full blur-[100px]" />

      <h1 className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-8 drop-shadow-[0_0_25px_rgba(14,165,233,0.8)] z-10">
        {publicData.gameName}
      </h1>

      <div className="flex gap-16 items-center z-10 bg-slate-800/80 p-12 rounded-3xl border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.2)] backdrop-blur-md">
        
        <div className="text-center">
          <div className="text-2xl text-gray-400 mb-2 font-semibold">Dołącz na stronie</div>
          <div className="text-4xl text-white font-bold mb-6">{window.location.host}/join</div>
          <div className="text-2xl text-gray-400 mb-2 font-semibold">Kod pokoju</div>
          <div className="text-8xl font-mono text-cyan-400 font-bold tracking-widest drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">
            {publicData.roomCode}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl">
          <QRCodeSVG value={joinUrl} size={250} />
        </div>

      </div>

      <div className="mt-16 z-10 text-center w-full max-w-6xl px-8">
        <h2 className="text-3xl text-gray-400 mb-6 font-bold uppercase tracking-widest">Gracze ({approvedPlayers.length}/{publicData.maxPlayers})</h2>
        <div className="flex flex-wrap justify-center gap-4">
          {approvedPlayers.map((player: any) => (
            <div key={player.id} className="bg-slate-800 border-2 border-cyan-500 px-6 py-3 rounded-full text-2xl font-bold text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              {player.nickname}
            </div>
          ))}
          {approvedPlayers.length === 0 && (
            <div className="text-2xl text-gray-500 italic">Oczekiwanie na graczy...</div>
          )}
        </div>
      </div>
    </div>
  );
}
