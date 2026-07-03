import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Megaphone,
  MessageSquare,
  CalendarDays,
  Users,
  ListChecks,
  Settings as SettingsIcon,
  Flag,
  X,
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const NAV_ITEMS = [
  { to: '/', key: 'dashboard', icon: LayoutDashboard, end: true },
  { to: '/dokumente', key: 'documents', icon: FileText },
  { to: '/bulletins', key: 'bulletins', icon: Megaphone },
  { to: '/kommunikation', key: 'communication', icon: MessageSquare },
  { to: '/kalender', key: 'calendar', icon: CalendarDays },
  { to: '/aufgaben', key: 'tasks', icon: ListChecks },
  { to: '/team', key: 'team', icon: Users },
  { to: '/einstellungen', key: 'settings', icon: SettingsIcon },
];

export default function Sidebar({ open = false, onClose }) {
  const { settings, logoDataUrl } = useSettings();
  const { t } = useLanguage();

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-app bg-sidebar transition-transform duration-200 lg:static lg:z-auto lg:flex lg:w-60 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-5">
          {logoDataUrl ? (
            <img src={logoDataUrl} alt="Team logo" className="h-9 w-9 rounded-md object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/15 text-accent">
              <Flag size={18} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-primary">
              {settings?.teamName || 'PitWall'}
            </p>
            <p className="text-[11px] uppercase tracking-wider text-muted">{t('app.tagline')}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-primary lg:hidden">
            <X size={18} />
          </button>
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {NAV_ITEMS.map(({ to, key, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-accent/15 text-accent' : 'text-secondary hover-app'
                }`
              }
            >
              <Icon size={18} strokeWidth={2} />
              {t(`nav.${key}`)}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 text-[11px] text-muted">{t('app.footer')}</div>
      </aside>
    </>
  );
}
