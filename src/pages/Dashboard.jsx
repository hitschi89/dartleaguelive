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
import { useLanguage } from '../context/LanguageContext.jsx';

const PRIORITY_TONE = { dringend: 'red', wichtig: 'amber', info: 'blue' };
const PRIORITY_KEY = { dringend: 'priorityUrgent', wichtig: 'priorityImportant', info: 'priorityInfo' };

const QUICK_LINKS = [
  { to: '/dokumente', key: 'documents', icon: FileText },
  { to: '/bulletins', key: 'bulletins', icon: Megaphone },
  { to: '/kommunikation', key: 'communication', icon: MessageSquare },
  { to: '/kalender', key: 'calendar', icon: CalendarDays },
  { to: '/aufgaben', key: 'tasks', icon: ListChecks },
  { to: '/team', key: 'team', icon: Users },
  { to: '/einstellungen', key: 'settings', icon: SettingsIcon },
];

export default function Dashboard() {
  const { settings } = useSettings();
  const { t, locale } = useLanguage();
  const { events, loading: eventsLoading } = useEvents();
  const { bulletins, loading: bulletinsLoading } = useBulletins();
  const { tasks, loading: tasksLoading, toggleDone } = useTasks();

  const formatCountdown = (dateStr) => {
    const diffMs = new Date(dateStr).getTime() - Date.now();
    if (diffMs <= 0) return t('countdown.overdue');
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
    if (days > 0) return t('countdown.inDays', { days, plural: days === 1 ? '' : 's', hours });
    return t('countdown.inHours', { hours });
  };

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
        title={`${t('dashboard.welcomeBack')}${settings?.teamName ? `, ${settings.teamName}` : ''}`}
        subtitle={t('dashboard.subtitle')}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <CalendarClock size={18} className="text-accent" /> {t('dashboard.upcomingEvents')}
            </div>
            <Link to="/kalender" className="text-xs text-secondary hover:text-accent">
              {t('dashboard.viewAll')}
            </Link>
          </div>
          {eventsLoading ? (
            <p className="text-sm text-muted">{t('common.loading')}</p>
          ) : upcoming.length === 0 ? (
            <EmptyState icon={CalendarClock} title={t('dashboard.noUpcomingEvents')} />
          ) : (
            <ul className="space-y-3">
              {upcoming.map((event) => (
                <li key={event.id}>
                  <Link
                    to={`/kalender/${event.id}`}
                    className="block rounded-lg bg-card-alt p-3 transition-colors hover:border-accent"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-primary">{event.title}</p>
                      <Badge tone="accent">{formatCountdown(event.start)}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-secondary">
                      {new Date(event.start).toLocaleString(locale, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                      {event.location ? ` · ${event.location}` : ''}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Megaphone size={18} className="text-accent" /> {t('dashboard.latestBulletins')}
            </div>
            <Link to="/bulletins" className="text-xs text-secondary hover:text-accent">
              {t('dashboard.viewAll')}
            </Link>
          </div>
          {bulletinsLoading ? (
            <p className="text-sm text-muted">{t('common.loading')}</p>
          ) : latestBulletins.length === 0 ? (
            <EmptyState icon={Megaphone} title={t('dashboard.noBulletinsYet')} />
          ) : (
            <ul className="space-y-3">
              {latestBulletins.map((b) => (
                <li key={b.id} className="rounded-lg bg-card-alt p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium ${b.read ? 'text-secondary' : 'text-primary'}`}>
                      {b.title}
                    </p>
                    <Badge tone={PRIORITY_TONE[b.priority] || 'slate'}>
                      {t(`bulletins.${PRIORITY_KEY[b.priority] || 'priorityInfo'}`)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-secondary">
                    {new Date(b.date).toLocaleDateString(locale)} · {b.category}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <ListChecks size={18} className="text-accent" /> {t('dashboard.openTasks')}
            </div>
            <Link to="/aufgaben" className="text-xs text-secondary hover:text-accent">
              {t('dashboard.viewAll')}
            </Link>
          </div>
          {tasksLoading ? (
            <p className="text-sm text-muted">{t('common.loading')}</p>
          ) : openTasks.length === 0 ? (
            <EmptyState icon={CheckCircle2} title={t('dashboard.allDone')} description={t('dashboard.noOpenTasks')} />
          ) : (
            <ul className="space-y-2">
              {openTasks.slice(0, 6).map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-card-alt p-3 text-sm"
                >
                  <span className="truncate text-primary">{task.title}</span>
                  <button
                    onClick={() => toggleDone(task.id, true)}
                    className="shrink-0 text-xs font-medium text-accent hover:underline"
                  >
                    {t('dashboard.markDone')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-muted">
        {t('dashboard.quickAccess')}
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {QUICK_LINKS.map(({ to, key, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-app bg-card p-5 text-center transition-colors hover:border-accent"
          >
            <Icon size={22} className="text-accent" />
            <span className="text-sm font-medium text-primary">{t(`nav.${key}`)}</span>
            <ArrowRight size={14} className="text-muted opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ))}
      </div>
    </div>
  );
}
