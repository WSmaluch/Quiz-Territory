import { generateUUID } from '../../utils/uuid';
import { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';

export default function PlayerCategorySelection({ sessionId, privateData }: any) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [offersTimedOut, setOffersTimedOut] = useState(false);

  const categorySelection = privateData?.categorySelection;
  const offers = categorySelection?.categoryOffers || [];
  const serverSelectedId = categorySelection?.selectedCategoryId;

  useEffect(() => {
    if (offers.length > 0) {
      setOffersTimedOut(false);
      return;
    }

    const timer = window.setTimeout(() => setOffersTimedOut(true), 10_000);
    return () => window.clearTimeout(timer);
  }, [offers.length]);

  const handleSelect = async (categoryId: string) => {
    if (serverSelectedId) return; // already selected
    setSelectedId(categoryId);
    setIsSubmitting(true);
    
    try {
      const selectPlayerCategory = httpsCallable(functions, 'selectPlayerCategory');
      await selectPlayerCategory({
        sessionId,
        commandId: generateUUID(),
        categoryId
      });
    } catch (e: any) {
      console.error('Failed to select category', e);
      alert(e.message || 'Nie udało się wybrać kategorii. Spróbuj ponownie.');
      setSelectedId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentSelection = serverSelectedId || selectedId;

  if (serverSelectedId) {
    const selectedCat = offers.find((o: any) => o.categoryId === serverSelectedId);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 w-full">
        <div className="bg-slate-800 p-8 rounded-xl max-w-md w-full shadow-2xl text-center border-t-4 border-cyan-500">
          <h2 className="text-3xl font-bold text-cyan-400 mb-6">Kategoria wybrana!</h2>
          <p className="text-xl text-white mb-2">{selectedCat?.name || 'Wybrano'}</p>
          <p className="text-gray-400">Czekamy, aż pozostali gracze zakończą wybór...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 w-full">
      <div className="bg-slate-800 p-8 rounded-xl max-w-md w-full shadow-2xl border-t-4 border-cyan-500">
        <h2 className="text-2xl font-bold text-cyan-400 mb-2 text-center">Wybierz swoje terytorium</h2>
        <p className="text-sm text-gray-400 mb-6 text-center">Wybierz jedną z kategorii, której będziesz bronić.</p>

        <div className="flex flex-col gap-4">
          {offers.map((offer: any) => (
            <button
              key={offer.categoryId}
              disabled={isSubmitting || currentSelection !== null}
              onClick={() => handleSelect(offer.categoryId)}
              className={`p-4 rounded-lg text-left transition-all ${
                currentSelection === offer.categoryId 
                  ? 'bg-cyan-600 border-2 border-cyan-400' 
                  : 'bg-slate-700 hover:bg-slate-600 border-2 border-transparent'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-lg text-white">{offer.name}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  offer.difficulty === 'EASY' ? 'bg-green-900/50 text-green-300' :
                  offer.difficulty === 'MEDIUM' ? 'bg-yellow-900/50 text-yellow-300' :
                  'bg-red-900/50 text-red-300'
                }`}>{offer.difficulty === 'EASY' ? 'Łatwa' : offer.difficulty === 'MEDIUM' ? 'Średnia' : 'Trudna'}</span>
              </div>
              <p className="text-sm text-gray-300 line-clamp-2">{offer.description}</p>
            </button>
          ))}
          {offers.length === 0 && !offersTimedOut && (
            <div className="text-gray-400 text-center py-8">Przygotowujemy kategorie...</div>
          )}
          {offers.length === 0 && offersTimedOut && (
            <div className="text-red-300 text-center py-8" role="alert">
              Nie udało się pobrać kategorii. Sprawdź połączenie i odśwież stronę.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
