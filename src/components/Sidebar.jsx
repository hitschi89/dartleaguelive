import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Megaphone,
  MessageSquare,
  CalendarDays,
  Users,
  Settings as SettingsIcon,
  Flag,
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext.jsx';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dokumente', label: 'Dokumente', icon: FileText },
  { to: '/bulletins', label: 'Bulletins', icon: Megaphone },
  { to: '/kommunikation', label: 'Kommunikation', icon: MessageSquare },
  { to: '/kalender', label: 'Kalender', icon: CalendarDays },
  { to: '/team', label: 'Team', icon: Users },
  { to: '/einstellungen', label: 'Einstellungen', icon: SettingsIcon },
];

export default function Sidebar() {
  const { settings, logoDataUrl } = useSettings();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-app bg-sidebar">
      <div className="flex items-center gap-3 px-5 py-5">
        {logoDataUrl ? (
          <img src={logoDataUrl} alt="Team-Logo" className="h-9 w-9 rounded-md object-cover" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/15 text-accent">
            <Flag size={18} />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-primary">
            {settings?.teamName || 'PitWall'}
          </p>
          <p className="text-[11px] uppercase tracking-wider text-muted">Team Control</p>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-accent/15 text-accent' : 'text-secondary hover-app'
              }`
            }
          >
            <Icon size={18} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 text-[11px] text-muted">PitWall &middot; v0.1 MVP</div>
    </aside>
  );
}
