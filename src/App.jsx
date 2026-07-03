import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Menu, Flag } from 'lucide-react';
import Sidebar from './components/Sidebar.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { SettingsProvider, useSettings } from './context/SettingsContext.jsx';
import { LanguageProvider, useLanguage } from './context/LanguageContext.jsx';
import SetupNotice from './pages/auth/SetupNotice.jsx';
import AuthScreen from './pages/auth/AuthScreen.jsx';
import TeamSetup from './pages/auth/TeamSetup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Documents from './pages/Documents.jsx';
import Bulletins from './pages/Bulletins.jsx';
import Communication from './pages/Communication.jsx';
import Calendar from './pages/Calendar.jsx';
import Tasks from './pages/Tasks.jsx';
import Team from './pages/Team.jsx';
import SettingsPage from './pages/Settings.jsx';

function MobileTopBar({ onOpenMenu }) {
  const { settings, logoDataUrl } = useSettings();
  return (
    <div className="flex items-center gap-3 border-b border-app bg-sidebar px-4 py-3 lg:hidden">
      <button onClick={onOpenMenu} className="text-secondary hover:text-primary">
        <Menu size={22} />
      </button>
      {logoDataUrl ? (
        <img src={logoDataUrl} alt="Team logo" className="h-7 w-7 rounded-md object-cover" />
      ) : (
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/15 text-accent">
          <Flag size={14} />
        </div>
      )}
      <span className="truncate text-sm font-semibold text-primary">{settings?.teamName || 'PitWall'}</span>
    </div>
  );
}

function Shell() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <SettingsProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-app">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopBar onOpenMenu={() => setMenuOpen(true)} />
          <main className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dokumente" element={<Documents />} />
                <Route path="/bulletins" element={<Bulletins />} />
                <Route path="/kommunikation" element={<Communication />} />
                <Route path="/kalender" element={<Calendar />} />
                <Route path="/aufgaben" element={<Tasks />} />
                <Route path="/team" element={<Team />} />
                <Route path="/einstellungen" element={<SettingsPage />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </SettingsProvider>
  );
}

function Gate() {
  const { configured, loading, user, team } = useAuth();
  const { t } = useLanguage();

  if (!configured) return <SetupNotice />;

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-app text-muted">{t('app.loading')}</div>;
  }

  if (!user) return <AuthScreen />;
  if (!team) return <TeamSetup />;
  return <Shell />;
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </LanguageProvider>
  );
}
