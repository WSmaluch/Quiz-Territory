import { useEffect, useState } from 'react';
import { categoryCatalogFromPublicState, resolveCategoryName } from 'shared';

export default function DisplayBoardReveal({ publicData, players }: any) {
  const [revealedCells, setRevealedCells] = useState<number>(0);
  const [boardTimedOut, setBoardTimedOut] = useState(false);
  const board = publicData.board;
  const categoryCatalog = categoryCatalogFromPublicState(publicData);
  const cells = board ? Object.values(board.cells) as any[] : [];

  // Simple animation to reveal cells one by one
  useEffect(() => {
    if (revealedCells < cells.length) {
      const timer = setTimeout(() => {
        setRevealedCells(prev => prev + 1);
      }, 200); // reveal a cell every 200ms
      return () => clearTimeout(timer);
    }
  }, [revealedCells, cells.length]);

  useEffect(() => {
    if (board) return;
    const timer = window.setTimeout(() => setBoardTimedOut(true), 10_000);
    return () => window.clearTimeout(timer);
  }, [board]);

  if (!board) {
    return <div className="min-h-screen flex items-center justify-center text-white text-4xl">{boardTimedOut ? 'Nie udało się pobrać planszy.' : 'Przygotowywanie planszy...'}</div>;
  }

  // Calculate grid size to fit the screen
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${board.width}, minmax(0, 1fr))`,
    gap: '4px',
    maxWidth: '90vmin',
    maxHeight: '90vmin',
    aspectRatio: `${board.width} / ${board.height}`,
    margin: 'auto'
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-8 w-full h-full">
      <h1 className="text-5xl font-bold text-white mb-8">Terytorium</h1>
      
      <div style={gridStyle} className="bg-slate-800 p-2 rounded-xl shadow-2xl border-4 border-slate-700 w-full h-full">
        {cells.map((cell, index) => {
          const isRevealed = index < revealedCells;
          const owner = players[cell.currentOwnerId];
          const ownerName = owner ? owner.nickname : 'Nieznany gracz';
          
          return (
            <div 
              key={cell.id} 
              className={`relative flex items-center justify-center rounded-sm transition-all duration-500 transform ${isRevealed ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
              style={{ 
                backgroundColor: isRevealed ? cell.territoryColor : '#1e293b',
                gridRow: cell.row + 1,
                gridColumn: cell.col + 1
              }}
            >
              {isRevealed && (
                <div className="text-center p-1 drop-shadow-md bg-black/30 w-full h-full flex flex-col justify-center items-center">
                  <div className="text-white font-bold text-[clamp(10px,2vmin,24px)] leading-tight truncate w-full px-1">
                    {ownerName}
                  </div>
                  {cell.categoryId && (
                    <div className="text-gray-200 text-[clamp(8px,1.5vmin,16px)] truncate w-full px-1">
                      Kategoria: {resolveCategoryName(cell.categoryId, categoryCatalog)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
