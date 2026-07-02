import { AlertTriangle } from 'lucide-react';

export default function SetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4">
      <div className="w-full max-w-lg rounded-xl border border-app bg-card p-8 shadow-card">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
            <AlertTriangle size={20} />
          </div>
          <h1 className="font-display text-lg font-semibold text-primary">Supabase ist noch nicht eingerichtet</h1>
        </div>
        <p className="mb-3 text-sm text-secondary">
          PitWall braucht ein Supabase-Projekt, um Team-Daten zu speichern und zu synchronisieren.
        </p>
        <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-sm text-secondary">
          <li>
            Auf <span className="text-primary">supabase.com</span> kostenlos ein Projekt anlegen.
          </li>
          <li>
            Im SQL-Editor den Inhalt von <code className="text-accent">supabase/schema.sql</code> aus diesem Projekt
            ausführen.
          </li>
          <li>
            Projekt-URL und <span className="text-primary">anon key</span> aus Project Settings → API kopieren.
          </li>
          <li>
            Eine Datei <code className="text-accent">.env</code> (Vorlage: <code className="text-accent">.env.example</code>)
            im Projektordner anlegen und beide Werte eintragen.
          </li>
          <li>App neu starten.</li>
        </ol>
      </div>
    </div>
  );
}
