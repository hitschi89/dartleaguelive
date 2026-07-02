import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadLogo = useCallback(async () => {
    const logo = await window.api.settings.readLogo();
    setLogoDataUrl(logo ? `data:${logo.mime};base64,${logo.data}` : null);
  }, []);

  const refresh = useCallback(async () => {
    const current = await window.api.settings.get();
    setSettings(current);
    await loadLogo();
    setLoading(false);
  }, [loadLogo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    root.classList.toggle('dark', settings.theme === 'dark');
    root.setAttribute('data-accent', settings.accent || 'red');
  }, [settings]);

  const updateSettings = useCallback(async (patch) => {
    const next = await window.api.settings.update(patch);
    setSettings(next);
    return next;
  }, []);

  const pickLogo = useCallback(async () => {
    const next = await window.api.settings.pickLogo();
    if (next) {
      setSettings(next);
      await loadLogo();
    }
    return next;
  }, [loadLogo]);

  const value = useMemo(
    () => ({ settings, loading, updateSettings, pickLogo, logoDataUrl, refresh }),
    [settings, loading, updateSettings, pickLogo, logoDataUrl, refresh]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
