import { useEffect, useState } from 'react';
import { app, auth, db, rtdb, functions, storage } from '../firebase';
import { httpsCallable } from 'firebase/functions';

export default function Diagnostics() {
  const [status, setStatus] = useState({
    mode: import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true' ? 'EMULATORS' : 'PRODUCTION',
    projectId: app.options.projectId,
    uid: auth.currentUser?.uid || 'Not authenticated',
    isAnonymous: auth.currentUser?.isAnonymous ? 'Yes' : 'No',
    authConnected: !!(auth as any).emulatorConfig,
    functionsConnected: !!(functions as any).emulatorOrigin,
    firestoreConnected: !!(db as any)._settings?.host?.includes(window.location.hostname),
    rtdbConnected: !!(rtdb as any).emulatorOrigin,
    storageConnected: !!(storage as any).emulatorOrigin,
    callableResult: 'Testing...'
  });

  useEffect(() => {
    // Check if the functions emulator is reachable by calling a known safe function,
    // or just any dummy function to see if we get a network error vs a standard error.
    const checkCallable = async () => {
      try {
        const dummyFn = httpsCallable(functions, 'resolveRoomCode');
        await dummyFn({ code: 'TEST' });
        setStatus(s => ({ ...s, callableResult: 'Connected' }));
      } catch (e: any) {
        if (e.message?.includes('fetch') || e.message?.includes('network')) {
          setStatus(s => ({ ...s, callableResult: 'Network Error - Emulator Down?' }));
        } else {
          // If we get here, the function was reachable but threw a logic error, which means it works
          setStatus(s => ({ ...s, callableResult: 'Connected (Returned logic error)' }));
        }
      }
    };
    checkCallable();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <h1 className="text-3xl font-bold text-cyan-400 mb-6">Developer Diagnostics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h2 className="text-xl font-semibold mb-4 text-slate-300">Environment</h2>
          <ul className="space-y-2 font-mono text-sm">
            <li><span className="text-slate-500">Mode:</span> {status.mode}</li>
            <li><span className="text-slate-500">Project ID:</span> {status.projectId}</li>
            <li><span className="text-slate-500">UID:</span> {status.uid}</li>
            <li><span className="text-slate-500">Anonymous:</span> {status.isAnonymous}</li>
          </ul>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h2 className="text-xl font-semibold mb-4 text-slate-300">Emulator Connections</h2>
          <ul className="space-y-2 font-mono text-sm">
            <li>
              <span className="text-slate-500">Auth:</span> 
              <span className={status.authConnected ? 'text-green-400' : 'text-yellow-400'}> {status.authConnected ? 'Connected' : 'Default / Not Emulator'}</span>
            </li>
            <li>
              <span className="text-slate-500">Functions:</span> 
              <span className={status.functionsConnected ? 'text-green-400' : 'text-yellow-400'}> {status.functionsConnected ? 'Connected' : 'Default / Not Emulator'}</span>
            </li>
            <li>
              <span className="text-slate-500">Firestore:</span> 
              <span className={status.firestoreConnected ? 'text-green-400' : 'text-yellow-400'}> {status.firestoreConnected ? 'Connected' : 'Default / Not Emulator'}</span>
            </li>
            <li>
              <span className="text-slate-500">RTDB:</span> 
              <span className={status.rtdbConnected ? 'text-green-400' : 'text-yellow-400'}> {status.rtdbConnected ? 'Connected' : 'Default / Not Emulator'}</span>
            </li>
            <li>
              <span className="text-slate-500">Storage:</span> 
              <span className={status.storageConnected ? 'text-green-400' : 'text-yellow-400'}> {status.storageConnected ? 'Connected' : 'Default / Not Emulator'}</span>
            </li>
          </ul>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 md:col-span-2">
          <h2 className="text-xl font-semibold mb-4 text-slate-300">Network Tests</h2>
          <ul className="space-y-2 font-mono text-sm">
            <li><span className="text-slate-500">Functions Reachability:</span> {status.callableResult}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
