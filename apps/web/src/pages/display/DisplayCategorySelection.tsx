import { useEffect, useState } from 'react';

export default function DisplayCategorySelection({ publicData }: any) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);
  const selectionProgress = publicData.selectionProgress || { completedCount: 0, totalCount: 0, deadline: Date.now() };
  
  // Calculate remaining time
  const remainingTimeMs = Math.max(0, selectionProgress.deadline - now);
  const remainingSeconds = Math.ceil(remainingTimeMs / 1000);

  // We should also show the generic silhouette of the board, but for now we just show progress.
  // We can add the board silhouette later if needed.

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-slate-900 w-full">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/30 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/30 rounded-full blur-[100px]" />

      <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-8 drop-shadow-[0_0_25px_rgba(14,165,233,0.8)] z-10 text-center">
        Players are selecting their categories...
      </h1>

      <div className="z-10 bg-slate-800/80 p-12 rounded-3xl border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.2)] backdrop-blur-md flex flex-col items-center">
        <div className="text-3xl text-gray-400 font-semibold mb-4">Time Remaining</div>
        <div className={`text-9xl font-mono font-bold mb-12 ${remainingSeconds <= 5 ? 'text-red-500 drop-shadow-[0_0_25px_rgba(239,68,68,0.8)]' : 'text-cyan-400 drop-shadow-[0_0_25px_rgba(34,211,238,0.8)]'}`}>
          {remainingSeconds}
        </div>

        <div className="text-2xl text-gray-400 font-semibold mb-4">Players Ready</div>
        <div className="text-6xl text-white font-bold tracking-widest">
          {selectionProgress.completedCount} / {selectionProgress.totalCount}
        </div>
      </div>
    </div>
  );
}
