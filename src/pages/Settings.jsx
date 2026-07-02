import { useState } from 'react';
import { Image, Moon, Sun, Upload, Check, LogOut, Lock } from 'lucide-react';
import { useSettings } from '../context/SettingsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Card, PageHeader, Button, Input } from '../components/ui.jsx';

const ACCENTS = [
  { key: 'red', label: 'Rot', swatch: '#ef4444' },
  { key: 'orange', label: 'Orange', swatch: '#f97316' },
];

export default function Settings() {
  const { settings, updateTeam, pickLogo, logoDataUrl, setTheme, isAdmin } = useSettings();
  const { user, signOut } = useAuth();
  const [teamName, setTeamName] = useState(settings.teamName || '');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  const flash = (msg) => {
    setStatus(msg);
    setError(null);
    setTimeout(() => setStatus(null), 2500);
  };

  const guarded = (fn) => async (...args) => {
    try {
      await fn(...args);
    } catch (err) {
      setError(err.message || 'Aktion fehlgeschlagen.');
    }
  };

  const saveTeamName = guarded(async () => {
    await updateTeam({ name: teamName });
    flash('Team-Name gespeichert');
  });

  const handleLogoUpload = guarded(async () => {
    await pickLogo();
    flash('Logo aktualisiert');
  });

  const changeAccent = guarded(async (accent) => {
    await updateTeam({ accent });
    flash('Akzentfarbe gespeichert');
  });

  return (
    <div>
      <PageHeader title="Einstellungen" subtitle="Team-Branding, Design und Konto." />

      {status && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent">
          <Check size={15} /> {status}
        </div>
      )}
      {error && (
        <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
            Team-Profil
            {!isAdmin && <Lock size={13} className="text-muted" title="Nur Teamchef kann das bearbeiten" />}
          </h2>
          <div className="mb-4 flex items-center gap-4">
            {logoDataUrl ? (
              <img src={logoDataUrl} alt="Logo" className="h-16 w-16 rounded-lg object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-card-alt text-muted">
                <Image size={22} />
              </div>
            )}
            {isAdmin && (
              <Button variant="secondary" onClick={handleLogoUpload}>
                <Upload size={15} /> Logo hochladen
              </Button>
            )}
          </div>
          <label className="mb-1 block text-xs font-medium text-secondary">Team-/Vereinsname</label>
          <div className="flex gap-2">
            <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} disabled={!isAdmin} />
            {isAdmin && <Button onClick={saveTeamName}>Speichern</Button>}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-primary">Design</h2>
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium text-secondary">Theme (nur auf diesem Gerät)</p>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme('dark')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  settings.theme === 'dark' ? 'border-accent bg-accent/10 text-accent' : 'border-app text-secondary'
                }`}
              >
                <Moon size={15} /> Dunkel
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  settings.theme === 'light' ? 'border-accent bg-accent/10 text-accent' : 'border-app text-secondary'
                }`}
              >
                <Sun size={15} /> Hell
              </button>
            </div>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-medium text-secondary">
              Akzentfarbe (für das ganze Team)
              {!isAdmin && <Lock size={12} className="text-muted" />}
            </p>
            <div className="flex gap-2">
              {ACCENTS.map((a) => (
                <button
                  key={a.key}
                  disabled={!isAdmin}
                  onClick={() => changeAccent(a.key)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                    settings.accent === a.key ? 'border-accent bg-accent/10 text-accent' : 'border-app text-secondary'
                  }`}
                >
                  <span className="h-3 w-3 rounded-full" style={{ background: a.swatch }} />
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-2 text-sm font-semibold text-primary">Konto</h2>
          <p className="mb-4 text-sm text-secondary">Angemeldet als {user?.email}</p>
          <Button variant="secondary" onClick={signOut}>
            <LogOut size={15} /> Abmelden
          </Button>
        </Card>

        <Card>
          <h2 className="mb-2 text-sm font-semibold text-primary">Über PitWall</h2>
          <p className="text-sm text-secondary">
            PitWall ist die zentrale Verwaltungsplattform für dein Motorsport-Team - synchronisiert zwischen Desktop
            und Mobilgeräten, mit Offline-Cache für unterwegs.
          </p>
          <p className="mt-2 text-xs text-muted">Version 0.2</p>
        </Card>
      </div>
    </div>
  );
}
