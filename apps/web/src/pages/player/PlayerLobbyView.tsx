import { useNavigate } from 'react-router-dom';

export default function PlayerLobbyView({ publicData, me }: any) {
  const navigate = useNavigate();

  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-900/50 p-8 rounded-xl border border-red-500 max-w-sm w-full text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Usunięto z gry</h2>
          <p className="text-red-200 mb-6">Nie należysz już do tej sesji.</p>
          <button onClick={() => navigate('/')} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white font-bold">Wróć na stronę główną</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 w-full">
      <div className="bg-slate-800 p-8 rounded-xl max-w-md w-full shadow-2xl text-center border-t-4 border-teal-500">
        <h1 className="text-3xl font-bold text-teal-400 mb-2">{publicData.gameName}</h1>
        <div className="text-sm text-gray-400 mb-8">Grasz jako <span className="text-white font-bold">{me.nickname}</span></div>

        {me.status === 'PENDING' && (
          <div className="bg-yellow-900/30 border border-yellow-600/50 p-6 rounded-lg">
             <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
             <h2 className="text-xl font-semibold text-yellow-400 mb-2">Oczekiwanie na prowadzącego</h2>
             <p className="text-sm text-yellow-200">Twoja prośba o dołączenie oczekuje na zatwierdzenie...</p>
          </div>
        )}

        {me.status === 'REJECTED' && (
          <div className="bg-red-900/30 border border-red-600/50 p-6 rounded-lg">
             <h2 className="text-xl font-semibold text-red-400 mb-2">Prośba odrzucona</h2>
             <p className="text-sm text-red-200">Prowadzący odrzucił Twoją prośbę o dołączenie.</p>
          </div>
        )}

        {me.status === 'APPROVED' && (
          <div className="bg-green-900/30 border border-green-600/50 p-6 rounded-lg">
             <div className="text-4xl mb-4">✅</div>
             <h2 className="text-2xl font-bold text-green-400 mb-2">Jesteś w grze!</h2>
             <p className="text-green-200">Spójrz na ekran TV. Gra rozpocznie się za chwilę.</p>
          </div>
        )}
      </div>
    </div>
  );
}
