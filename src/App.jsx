import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import { SettingsProvider, useSettings } from './context/SettingsContext.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Documents from './pages/Documents.jsx';
import Bulletins from './pages/Bulletins.jsx';
import Communication from './pages/Communication.jsx';
import Calendar from './pages/Calendar.jsx';
import Team from './pages/Team.jsx';
import SettingsPage from './pages/Settings.jsx';

function Shell() {
  const { loading } = useSettings();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-app text-muted">
        Lade PitWall…
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-app">
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dokumente" element={<Documents />} />
            <Route path="/bulletins" element={<Bulletins />} />
            <Route path="/kommunikation" element={<Communication />} />
            <Route path="/kalender" element={<Calendar />} />
            <Route path="/team" element={<Team />} />
            <Route path="/einstellungen" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <Shell />
    </SettingsProvider>
  );
}
