import { Link } from 'react-router-dom';
import {
  CalendarClock,
  Megaphone,
  ListChecks,
  FileText,
  MessageSquare,
  CalendarDays,
  Users,
  Settings as SettingsIcon,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { useEvents } from '../hooks/useEvents.js';
import { useBulletins } from '../hooks/useBulletins.js';
import { useTasks } from '../hooks/useTasks.js';
import { Card, PageHeader, Badge, EmptyState } from '../components/ui.jsx';
import { useSettings } from '../context/SettingsContext.jsx';

const PRIORITY_TONE = { dringend: 'red', wichtig: 'amber', info: 'blue' };

const QUICK_LINKS = [
  { to: '/dokumente', label: 'Dokumente', icon: FileText },
  { to: '/bulletins', label: 'Bulletins', icon: Megaphone },
  { to: '/kommunikation', label: 'Kommunikation', icon: MessageSquare },
  { to: '/kalender', label: 'Kalender', icon: CalendarDays },
  { to: '/aufgaben', label: 'Aufgaben', icon: ListChecks },
  { to: '/team', label: 'Team', icon: Users },
  { to: '/einstellungen', label: 'Einstellungen', icon: SettingsIcon },
];

function formatCountdown(dateStr) {
  const diffMs = new Date(dateStr).getTime() - Date.now();
  if (diffMs <= 0) return 'läuft / vorbei';
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  if (days > 0) return `in ${days} Tag${days === 1 ? '' : 'en'} ${hours}h`;
  return `in ${hours}h`;
}

export default function Dashboard() {
  const { settings } = useSettings();
  const { events, loading: eventsLoading } = useEvents();
  const { bulletins, loading: bulletinsLoading } = useBulletins();
  const { tasks, loading: tasksLoading, toggleDone } = useTasks();

  const upcoming = events
    .filter((e) => new Date(e.end || e.start).getTime() >= Date.now())
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .slice(0, 4);

  const latestBulletins = [...bulletins]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const openTasks = tasks
    .filter((t) => !t.done)
    .sort((a, b) => new Date(a.due_date || '9999-12-31') - new Date(b.due_date || '9999-12-31'));

  return (
    <div>
      <PageHeader
        title={`Willkommen zurück${settings?.teamName ? `, ${settings.teamName}` : ''}`}
        subtitle="Alle wichtigen Informationen deines Teams auf einen Blick."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <CalendarClock size={18} className="text-accent" /> Nächste Termine
            </div>
            <Link to="/kalender" className="text-xs text-secondary hover:text-accent">
              Alle ansehen
            </Link>
          </div>
          {eventsLoading ? (
            <p className="text-sm text-muted">Lade…</p>
          ) : upcoming.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Keine anstehenden Termine" />
          ) : (
            <ul className="space-y-3">
              {upcoming.map((event) => (
                <li key={event.id} className="rounded-lg bg-card-alt p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-primary">{event.title}</p>
                    <Badge tone="accent">{formatCountdown(event.start)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-secondary">
                    {new Date(event.start).toLocaleString('de-DE', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                    {event.location ? ` · ${event.location}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Megaphone size={18} className="text-accent" /> Letzte Bulletins
            </div>
            <Link to="/bulletins" className="text-xs text-secondary hover:text-accent">
              Alle ansehen
            </Link>
          </div>
          {bulletinsLoading ? (
            <p className="text-sm text-muted">Lade…</p>
          ) : latestBulletins.length === 0 ? (
            <EmptyState icon={Megaphone} title="Noch keine Bulletins" />
          ) : (
            <ul className="space-y-3">
              {latestBulletins.map((b) => (
                <li key={b.id} className="rounded-lg bg-card-alt p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium ${b.read ? 'text-secondary' : 'text-primary'}`}>
                      {b.title}
                    </p>
                    <Badge tone={PRIORITY_TONE[b.priority] || 'slate'}>{b.priority}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-secondary">
                    {new Date(b.date).toLocaleDateString('de-DE')} · {b.category}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <ListChecks size={18} className="text-accent" /> Offene Aufgaben
            </div>
            <Link to="/aufgaben" className="text-xs text-secondary hover:text-accent">
              Alle ansehen
            </Link>
          </div>
          {tasksLoading ? (
            <p className="text-sm text-muted">Lade…</p>
          ) : openTasks.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Alles erledigt" description="Keine offenen Aufgaben." />
          ) : (
            <ul className="space-y-2">
              {openTasks.slice(0, 6).map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-card-alt p-3 text-sm"
                >
                  <span className="truncate text-primary">{t.title}</span>
                  <button
                    onClick={() => toggleDone(t.id, true)}
                    className="shrink-0 text-xs font-medium text-accent hover:underline"
                  >
                    Erledigt
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-muted">
        Schnellzugriff
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {QUICK_LINKS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-app bg-card p-5 text-center transition-colors hover:border-accent"
          >
            <Icon size={22} className="text-accent" />
            <span className="text-sm font-medium text-primary">{label}</span>
            <ArrowRight size={14} className="text-muted opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ))}
      </div>
    </div>
  );
}
