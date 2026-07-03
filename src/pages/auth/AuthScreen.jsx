import { useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { Button, Input } from '../../components/ui.jsx';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const { t } = useLanguage();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        setInfo(t('auth.signUpSuccess'));
        setMode('signin');
      }
    } catch (err) {
      setError(err.message || t('auth.genericError'));
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
          <h1 className="font-display text-xl font-semibold text-primary">PitWall</h1>
          <p className="mt-1 text-sm text-secondary">
            {mode === 'signin' ? t('auth.signInSubtitle') : t('auth.signUpSubtitle')}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
        {info && (
          <div className="mb-4 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
            {info}
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">{t('auth.email')}</label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">{t('auth.password')}</label>
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : mode === 'signin' ? t('auth.signIn') : t('auth.signUp')}
          </Button>
        </form>

        <button
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError(null);
            setInfo(null);
          }}
          className="mt-4 w-full text-center text-xs text-secondary hover:text-accent"
        >
          {mode === 'signin' ? t('auth.noAccount') : t('auth.hasAccount')}
        </button>
      </div>
    </div>
  );
}
