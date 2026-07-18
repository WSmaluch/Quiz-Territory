import BoardCategorySummary from '../../components/BoardCategorySummary';

export default function PlayerBoardReveal({ publicData, players, playerId }: any) {
  // During board reveal, we just show a message telling the player to look at the TV
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 w-full">
      <div className="bg-slate-800 p-8 rounded-xl max-w-md w-full shadow-2xl text-center border-t-4 border-cyan-500">
        <div className="text-6xl mb-6">📺</div>
        <h2 className="text-3xl font-bold text-cyan-400 mb-4">Spójrz na ekran TV!</h2>
        <p className="text-gray-300">Trwa prezentacja terytoriów.</p>
        <BoardCategorySummary publicData={publicData} players={players} ownerId={playerId} />
      </div>
    </div>
  );
}
