import { useState } from 'react';
import { Flag, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button, Input, Select } from '../../components/ui.jsx';

const ROLES = ['Fahrer', 'Ingenieur', 'Mechaniker', 'Strategie', 'Sonstiges'];

export default function TeamSetup() {
  const { createTeam, joinTeam, signOut, user } = useAuth();
  const [mode, setMode] = useState('create');
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('Fahrer');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'create') {
        await createTeam({ teamName, displayName, role: 'Teamchef' });
      } else {
        await joinTeam({ inviteCode, displayName, role });
      }
    } catch (err) {
      setError(err.message || 'Etwas ist schiefgelaufen.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4">
      <div className="w-full max-w-sm rounded-xl border border-app bg-card p-8 shadow-card">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Flag size={22} />
          </div>
          <h1 className="font-display text-xl font-semibold text-primary">Team einrichten</h1>
          <p className="mt-1 text-sm text-secondary">Angemeldet als {user?.email}</p>
        </div>

        <div className="mb-4 flex gap-1 rounded-lg border border-app p-1">
          {[
            { key: 'create', label: 'Neues Team' },
            { key: 'join', label: 'Team beitreten' },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium ${
                mode === m.key ? 'bg-accent/15 text-accent' : 'text-secondary'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">Dein Anzeigename</label>
            <Input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>

          {mode === 'create' ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-secondary">Team-/Vereinsname</label>
              <Input required value={teamName} onChange={(e) => setTeamName(e.target.value)} />
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-secondary">Einladungscode</label>
                <Input required value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-secondary">Deine Rolle</label>
                <Select value={role} onChange={(e) => setRole(e.target.value)}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </div>
            </>
          )}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : mode === 'create' ? 'Team erstellen' : 'Beitreten'}
          </Button>
        </form>

        <button
          onClick={signOut}
          className="mt-4 flex w-full items-center justify-center gap-1.5 text-center text-xs text-secondary hover:text-accent"
        >
          <LogOut size={13} /> Abmelden
        </button>
      </div>
    </div>
  );
}
