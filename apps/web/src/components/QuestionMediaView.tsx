import { useEffect, useState } from 'react';

type MediaState = 'LOADING_IMAGE' | 'IMAGE_READY' | 'IMAGE_ERROR' | 'NO_IMAGE';

export default function QuestionMediaView({ media, variant = 'player', onImageError }: {
  media?: { url?: string; alt?: string };
  variant?: 'player' | 'display' | 'host';
  onImageError?: () => void;
}) {
  const [state, setState] = useState<MediaState>(media?.url ? 'LOADING_IMAGE' : 'NO_IMAGE');
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => setState(media?.url ? 'LOADING_IMAGE' : 'NO_IMAGE'), [media?.url]);
  if (!media?.url || state === 'NO_IMAGE') return null;

  if (state === 'IMAGE_ERROR') {
    return (
      <div role="alert" className="my-4 rounded-xl border border-amber-500/50 bg-amber-950/40 p-4 text-amber-100">
        <p className="font-bold">Nie udało się wyświetlić zdjęcia.</p>
        <p>Prowadzący może pominąć to pytanie bez kary.</p>
      </div>
    );
  }

  const maxHeight = variant === 'display' ? 'max-h-[52vh]' : variant === 'host' ? 'max-h-72' : 'max-h-[42vh]';
  return (
    <div className="my-4 min-w-0">
      {state === 'LOADING_IMAGE' && <p role="status" className="py-6 text-cyan-200">Ładowanie zdjęcia…</p>}
      <button type="button" onClick={() => setZoomed(true)} className={`block w-full ${state !== 'IMAGE_READY' ? 'h-0 overflow-hidden' : ''}`} aria-label="Powiększ zdjęcie">
        <img
          src={media.url}
          alt={media.alt || 'Ilustracja do pytania'}
          className={`mx-auto h-auto w-full max-w-full object-contain ${maxHeight} rounded-xl`}
          onLoad={() => setState('IMAGE_READY')}
          onError={() => { setState('IMAGE_ERROR'); onImageError?.(); }}
        />
      </button>
      {state === 'IMAGE_READY' && variant !== 'display' && <p className="mt-2 text-xs text-slate-400">Dotknij zdjęcia, aby je powiększyć.</p>}
      {zoomed && (
        <button type="button" onClick={() => setZoomed(false)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3" aria-label="Zamknij powiększenie">
          <img src={media.url} alt={media.alt || 'Powiększona ilustracja do pytania'} className="max-h-full max-w-full object-contain" />
        </button>
      )}
    </div>
  );
}
