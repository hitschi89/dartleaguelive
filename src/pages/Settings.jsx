import { useState } from 'react';
import { Image, Moon, Sun, Download, Upload, FolderOpen, Check } from 'lucide-react';
import { useSettings } from '../context/SettingsContext.jsx';
import { Card, PageHeader, Button, Input } from '../components/ui.jsx';

const ACCENTS = [
  { key: 'red', label: 'Rot', swatch: '#ef4444' },
  { key: 'orange', label: 'Orange', swatch: '#f97316' },
];

export default function Settings() {
  const { settings, updateSettings, pickLogo, logoDataUrl } = useSettings();
  const [teamName, setTeamName] = useState(settings?.teamName || '');
  const [status, setStatus] = useState(null);

  const saveTeamName = async () => {
    await updateSettings({ teamName });
    flash('Team-Name gespeichert');
  };

  const flash = (msg) => {
    setStatus(msg);
    setTimeout(() => setStatus(null), 2500);
  };

  const handleExport = async () => {
    const res = await window.api.settings.exportBackup();
    if (!res.canceled) flash(`Backup gespeichert: ${res.filePath}`);
  };

  const handleImport = async () => {
    const res = await window.api.settings.importBackup();
    if (!res.canceled) {
      flash('Backup importiert. App-Neustart empfohlen.');
    }
  };

  return (
    <div>
      <PageHeader title="Einstellungen" subtitle="Team-Branding, Design und Datensicherung." />

      {status && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent">
          <Check size={15} /> {status}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-primary">Team-Profil</h2>
          <div className="mb-4 flex items-center gap-4">
            {logoDataUrl ? (
              <img src={logoDataUrl} alt="Logo" className="h-16 w-16 rounded-lg object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-card-alt text-muted">
                <Image size={22} />
              </div>
            )}
            <Button variant="secondary" onClick={() => pickLogo().then(() => flash('Logo aktualisiert'))}>
              <Upload size={15} /> Logo hochladen
            </Button>
          </div>
          <label className="mb-1 block text-xs font-medium text-secondary">Team-/Vereinsname</label>
          <div className="flex gap-2">
            <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} />
            <Button onClick={saveTeamName}>Speichern</Button>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-primary">Design</h2>
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium text-secondary">Theme</p>
            <div className="flex gap-2">
              <button
                onClick={() => updateSettings({ theme: 'dark' })}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  settings?.theme === 'dark' ? 'border-accent bg-accent/10 text-accent' : 'border-app text-secondary'
                }`}
              >
                <Moon size={15} /> Dunkel
              </button>
              <button
                onClick={() => updateSettings({ theme: 'light' })}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  settings?.theme === 'light' ? 'border-accent bg-accent/10 text-accent' : 'border-app text-secondary'
                }`}
              >
                <Sun size={15} /> Hell
              </button>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-secondary">Akzentfarbe</p>
            <div className="flex gap-2">
              {ACCENTS.map((a) => (
                <button
                  key={a.key}
                  onClick={() => updateSettings({ accent: a.key })}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    settings?.accent === a.key ? 'border-accent bg-accent/10 text-accent' : 'border-app text-secondary'
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
          <h2 className="mb-4 text-sm font-semibold text-primary">Datensicherung</h2>
          <p className="mb-4 text-sm text-secondary">
            Exportiere alle Daten (Dokumente-Metadaten, Bulletins, Nachrichten, Termine, Team) als Backup-Datei
            oder importiere ein bestehendes Backup.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleExport}>
              <Download size={15} /> Backup exportieren
            </Button>
            <Button variant="secondary" onClick={handleImport}>
              <Upload size={15} /> Backup importieren
            </Button>
            <Button variant="ghost" onClick={() => window.api.settings.openDataFolder()}>
              <FolderOpen size={15} /> Datenordner öffnen
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="mb-2 text-sm font-semibold text-primary">Über PitWall</h2>
          <p className="text-sm text-secondary">
            PitWall ist die zentrale Verwaltungsplattform für dein Motorsport-Team. Alle Daten werden ausschließlich
            lokal auf diesem Gerät gespeichert – ganz ohne Cloud-Pflicht.
          </p>
          <p className="mt-2 text-xs text-muted">Version 0.1 (MVP)</p>
        </Card>
      </div>
    </div>
  );
}
