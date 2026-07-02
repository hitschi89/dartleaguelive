import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { supabase } from '../lib/supabaseClient.js';
import { pickFile } from '../lib/platform.js';

export const SettingsContext = createContext(null);
const THEME_KEY = 'pitwall.theme';

// Team branding (name/logo/accent) is shared team data, stored on the
// `teams` row in Supabase. Theme (dark/light) is a personal, per-device
// preference and stays in localStorage - it's not something a teammate on
// another device should have forced on them.
export function SettingsProvider({ children }) {
  const { team, role, reloadMembership } = useAuth();
  const [theme, setThemeState] = useState(() => localStorage.getItem(THEME_KEY) || 'dark');
  const [logoUrl, setLogoUrl] = useState(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', team?.accent || 'red');
  }, [team?.accent]);

  useEffect(() => {
    if (!team?.logo_path) {
      setLogoUrl(null);
      return;
    }
    supabase.storage
      .from('team-files')
      .createSignedUrl(team.logo_path, 3600)
      .then(({ data }) => setLogoUrl(data?.signedUrl || null));
  }, [team?.logo_path]);

  const setTheme = useCallback((next) => setThemeState(next), []);

  const updateTeam = useCallback(
    async (patch) => {
      const { error } = await supabase.from('teams').update(patch).eq('id', team.id);
      if (error) throw error;
      await reloadMembership();
    },
    [team, reloadMembership]
  );

  const pickLogo = useCallback(async () => {
    const file = await pickFile({ extensions: ['png', 'jpg', 'jpeg', 'svg', 'gif'] });
    if (!file) return;
    const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '';
    const path = `${team.id}/branding/logo-${crypto.randomUUID()}${ext}`;
    const { error: uploadError } = await supabase.storage.from('team-files').upload(path, file, {
      contentType: file.type || 'image/png',
    });
    if (uploadError) throw uploadError;
    await updateTeam({ logo_path: path });
  }, [team, updateTeam]);

  const value = useMemo(
    () => ({
      settings: { teamName: team?.name, accent: team?.accent || 'red', theme },
      loading: false,
      isAdmin: role === 'Teamchef',
      logoDataUrl: logoUrl,
      setTheme,
      updateTeam,
      pickLogo,
    }),
    [team, theme, role, logoUrl, setTheme, updateTeam, pickLogo]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
