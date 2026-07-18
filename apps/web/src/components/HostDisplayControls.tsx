import { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { refreshDisplayToken } from '../services/sessionService';
import { buildDisplayUrl, getHostDisplayToken, storeHostDisplayToken } from '../utils/displayUrl';

export default function HostDisplayControls({ sessionId, initialToken, compact = false }: {
  sessionId: string;
  initialToken?: string | null;
  compact?: boolean;
}) {
  const [token, setToken] = useState(() => initialToken || getHostDisplayToken(sessionId));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const displayUrl = useMemo(() => token ? buildDisplayUrl(sessionId, token) : null, [sessionId, token]);

  const regenerate = async () => {
    setBusy(true);
    setMessage('');
    try {
      const result = await refreshDisplayToken(sessionId);
      storeHostDisplayToken(sessionId, result.displayToken);
      setToken(result.displayToken);
      setMessage('Wygenerowano nowy jednorazowy link TV.');
    } catch (error: any) {
      setMessage(error?.message || 'Nie udało się wygenerować linku TV.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!displayUrl) return;
    try {
      await navigator.clipboard.writeText(displayUrl);
      setMessage('Skopiowano bezpieczny link TV.');
    } catch {
      setMessage('Przeglądarka nie zezwoliła na skopiowanie linku.');
    }
  };

  return (
    <section className={compact ? 'flex flex-wrap items-center justify-end gap-2' : 'mt-6 rounded-xl border border-purple-500/40 bg-purple-950/20 p-5'} aria-label="Połączenie ekranu TV">
      {!compact && <h3 className="mb-2 text-xl font-bold text-purple-300">Ekran TV</h3>}
      {!compact && <p className="mb-4 text-sm text-gray-300">Link zawiera jednorazowy token. Nie publikuj go i otwieraj wyłącznie na ekranie TV.</p>}
      {displayUrl && !compact && (
        <div className="mb-4 inline-block rounded-lg bg-white p-3" data-testid="display-link-qr">
          <QRCodeSVG value={displayUrl} size={150} />
        </div>
      )}
      {displayUrl && <button type="button" onClick={() => window.open(displayUrl, '_blank', 'noopener,noreferrer')} className="rounded bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-500">Otwórz ekran TV</button>}
      {displayUrl && <button type="button" onClick={copy} className="rounded bg-slate-600 px-4 py-2 font-semibold text-white hover:bg-slate-500">Kopiuj link TV</button>}
      <button type="button" disabled={busy} onClick={regenerate} className="rounded bg-cyan-700 px-4 py-2 font-semibold text-white hover:bg-cyan-600 disabled:opacity-50">{busy ? 'Generowanie…' : displayUrl ? 'Wygeneruj nowy link' : 'Wygeneruj link TV'}</button>
      {message && <p className={compact ? 'w-full text-right text-xs text-cyan-200' : 'mt-3 text-sm text-cyan-200'} role="status">{message}</p>}
    </section>
  );
}
