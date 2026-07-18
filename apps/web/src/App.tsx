import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useStore } from './store/useStore';
import { subscribeToAuth } from './services/authService';

import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import PackageLibrary from './pages/PackageLibrary';
import NewPackage from './pages/NewPackage';
import PackageEditor from './pages/PackageEditor';
import ResultsPage from './pages/ResultsPage';
import HistoryPage from './pages/HistoryPage';
import NewSession from './pages/NewSession';
import JoinSession from './pages/JoinSession';
import HostPanel from './pages/host/HostPanel';
import HostIndex from './pages/host/HostIndex';
import PlayerPanel from './pages/player/PlayerPanel';
import Display from './pages/display/Display';
import Demo from './pages/Demo';
import Diagnostics from './pages/Diagnostics';

function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center">
      <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-6 drop-shadow-[0_0_15px_rgba(14,165,233,0.5)]">
        Quiz Territory
      </h1>
      <p className="text-xl text-gray-300 mb-8 max-w-lg">
        Towarzyski quiz o podboju terytoriów. Rzuć wyzwanie znajomym, przejmij planszę i zwycięż!
      </p>
      <div className="flex gap-4">
        <a href="/host" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-all shadow-[0_0_10px_rgba(37,99,235,0.5)]">
          Logowanie prowadzącego
        </a>
        <a href="/demo" className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all">
          Wypróbuj demo
        </a>
        <a href="/join" className="px-6 py-3 bg-teal-500 hover:bg-teal-400 text-white rounded-lg font-semibold transition-all shadow-[0_0_10px_rgba(20,184,166,0.5)]">
          Dołącz do gry
        </a>
      </div>
    </div>
  );
}

function App() {
  const { setUser, setAuthLoaded, authLoaded } = useStore();
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setAuthError(true), 10_000);
    const unsubscribe = subscribeToAuth((user) => {
      window.clearTimeout(timeout);
      setUser(user);
      setAuthLoaded(true);
    });
    return () => {
      window.clearTimeout(timeout);
      unsubscribe();
    };
  }, [setUser, setAuthLoaded]);

  if (!authLoaded && authError) {
    return <div className="min-h-screen flex flex-col gap-4 items-center justify-center"><p role="alert" className="text-red-300">Nie udało się uruchomić uwierzytelniania.</p><button onClick={() => window.location.reload()} className="px-5 py-2 bg-cyan-600 rounded">Odśwież</button></div>;
  }
  if (!authLoaded) {
    return <div className="min-h-screen flex items-center justify-center">Łączenie z uwierzytelnianiem...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/demo" element={<Demo />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/history" element={<HistoryPage />} />
          <Route path="/admin/packages" element={<PackageLibrary />} />
          <Route path="/admin/packages/new" element={<NewPackage />} />
          <Route path="/admin/packages/:packageId" element={<PackageEditor />} />
      <Route path="/results/:sessionId" element={<ResultsPage />} />
      <Route path="/admin/sessions/new" element={<NewSession />} />
      <Route path="/join" element={<JoinSession />} />
      <Route path="/host" element={<HostIndex />} />
      <Route path="/host/:sessionId" element={<HostPanel />} />
      <Route path="/play/:sessionId" element={<PlayerPanel />} />
      <Route path="/display" element={<Display />} />
      <Route path="/display/:sessionId" element={<Display />} />
      {import.meta.env.DEV && <Route path="/dev/diagnostics" element={<Diagnostics />} />}
    </Routes>
  );
}

export default App;
