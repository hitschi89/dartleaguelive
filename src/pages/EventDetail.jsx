import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Cloud,
  CalendarClock,
  Users,
  ListChecks,
  Plane,
  Wallet,
  Plus,
  Trash2,
  Check,
} from 'lucide-react';
import { useEvents } from '../hooks/useEvents.js';
import { useEventRsvps } from '../hooks/useEventRsvps.js';
import { useEventSchedule } from '../hooks/useEventSchedule.js';
import { useChecklist } from '../hooks/useChecklist.js';
import { useEventBudget } from '../hooks/useEventBudget.js';
import { useSeries } from '../hooks/useSeries.js';
import { useTeam } from '../hooks/useTeam.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { fetchEventWeather, describeWeatherCode } from '../lib/weather.js';
import { Card, PageHeader, Button, Input, Textarea, Select, Badge } from '../components/ui.jsx';

const TYPE_TONE = { training: 'blue', qualifying: 'amber', race: 'red', briefing: 'green', other: 'slate' };

function WeatherCard({ location, start }) {
  const { t, language } = useLanguage();
  const [weather, setWeather] = useState(undefined); // undefined = loading, null = unavailable

  useEffect(() => {
    let cancelled = false;
    setWeather(undefined);
    if (!location?.trim()) {
      setWeather(null);
      return;
    }
    fetchEventWeather(location, start)
      .then((w) => !cancelled && setWeather(w))
      .catch(() => !cancelled && setWeather(null));
    return () => {
      cancelled = true;
    };
  }, [location, start]);

  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
        <Cloud size={16} className="text-accent" /> {t('calendar.weather')}
      </h2>
      {weather === undefined ? (
        <p className="text-sm text-muted">{t('common.loading')}</p>
      ) : !weather ? (
        <p className="text-sm text-muted">{t('calendar.weatherUnavailable')}</p>
      ) : (
        <div className="flex items-center gap-4">
          <span className="text-4xl">{describeWeatherCode(weather.weatherCode, language).icon}</span>
          <div>
            <p className="text-sm font-medium text-primary">
              {describeWeatherCode(weather.weatherCode, language).label} · {Math.round(weather.tempMin)}° / {Math.round(weather.tempMax)}°C
            </p>
            {weather.precipitationProbability !== null && (
              <p className="text-xs text-secondary">
                {t('calendar.weatherPrecipitation')}: {weather.precipitationProbability}%
              </p>
            )}
            <p className="text-xs text-muted">{weather.place}</p>
          </div>
        </div>
      )}
    </Card>
  );
}

function RsvpCard({ eventId }) {
  const { t, tRole } = useLanguage();
  const { user } = useAuth();
  const { members } = useTeam();
  const { rsvps, loading, myStatus, setMyStatus } = useEventRsvps(eventId);

  const counts = useMemo(
    () => ({
      yes: rsvps.filter((r) => r.status === 'yes').length,
      no: rsvps.filter((r) => r.status === 'no').length,
      maybe: rsvps.filter((r) => r.status === 'maybe').length,
    }),
    [rsvps]
  );

  const statusFor = (userId) => rsvps.find((r) => r.user_id === userId)?.status;
  const STATUS_TONE = { yes: 'green', no: 'red', maybe: 'amber' };

  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
        <Users size={16} className="text-accent" /> {t('calendar.rsvpTitle')}
      </h2>
      <p className="mb-3 text-xs text-secondary">
        {t('calendar.rsvpSummary', { yes: counts.yes, no: counts.no, maybe: counts.maybe })}
      </p>
      <div className="mb-4 flex gap-2">
        {['yes', 'maybe', 'no'].map((status) => (
          <button
            key={status}
            onClick={() => setMyStatus(status)}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium ${
              myStatus === status ? 'border-accent bg-accent/10 text-accent' : 'border-app text-secondary hover-app'
            }`}
          >
            {t(`calendar.rsvp${status === 'yes' ? 'Yes' : status === 'no' ? 'No' : 'Maybe'}`)}
          </button>
        ))}
      </div>
      {!loading && (
        <ul className="space-y-1.5">
          {members.map((m) => {
            const status = statusFor(m.user_id);
            return (
              <li key={m.id} className="flex items-center justify-between text-sm">
                <span className="text-secondary">
                  {m.display_name} <span className="text-xs text-muted">({tRole(m.role)})</span>
                </span>
                {status ? (
                  <Badge tone={STATUS_TONE[status]}>{t(`calendar.rsvp${status === 'yes' ? 'Yes' : status === 'no' ? 'No' : 'Maybe'}`)}</Badge>
                ) : (
                  <span className="text-xs text-muted">—</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function ScheduleCard({ eventId }) {
  const { t, locale } = useLanguage();
  const { items, addItem, removeItem } = useEventSchedule(eventId);
  const [time, setTime] = useState('');
  const [title, setTitle] = useState('');

  const submit = async () => {
    if (!time || !title.trim()) return;
    await addItem({ time: new Date(time).toISOString(), title: title.trim() });
    setTime('');
    setTitle('');
  };

  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
        <CalendarClock size={16} className="text-accent" /> {t('calendar.scheduleTitle')}
      </h2>
      {items.length === 0 ? (
        <p className="mb-3 text-sm text-muted">{t('calendar.scheduleEmpty')}</p>
      ) : (
        <ul className="mb-3 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-card-alt p-2.5 text-sm">
              <div>
                <span className="font-medium text-primary">
                  {new Date(item.time).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                </span>{' '}
                <span className="text-secondary">{item.title}</span>
              </div>
              <button onClick={() => removeItem(item.id)} className="text-muted hover:text-red-400">
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} className="w-44 shrink-0" />
        <Input placeholder={t('calendar.scheduleAddTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Button onClick={submit}>
          <Plus size={15} />
        </Button>
      </div>
    </Card>
  );
}

function ChecklistCard({ eventId }) {
  const { t } = useLanguage();
  const { items, templateItems, addItem, updateItem, removeItem, copyTemplateToEvent } = useChecklist(eventId);
  const [title, setTitle] = useState('');

  const submit = async () => {
    if (!title.trim()) return;
    await addItem(title.trim());
    setTitle('');
  };

  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
        <ListChecks size={16} className="text-accent" /> {t('calendar.checklistTitle')}
      </h2>
      {items.length === 0 && templateItems.length > 0 && (
        <Button variant="secondary" className="mb-3 w-full" onClick={copyTemplateToEvent}>
          {t('calendar.checklistUseTemplate')}
        </Button>
      )}
      {items.length === 0 ? (
        <p className="mb-3 text-sm text-muted">{t('calendar.checklistEmpty')}</p>
      ) : (
        <ul className="mb-3 space-y-1.5">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 rounded-lg bg-card-alt p-2.5 text-sm">
              <button
                onClick={() => updateItem(item.id, { done: !item.done })}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                  item.done ? 'border-accent bg-accent text-white' : 'border-app'
                }`}
              >
                {item.done && <Check size={13} />}
              </button>
              <span className={`flex-1 ${item.done ? 'text-muted line-through' : 'text-secondary'}`}>{item.title}</span>
              <button onClick={() => removeItem(item.id)} className="text-muted hover:text-red-400">
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input placeholder={t('calendar.checklistAddPlaceholder')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Button onClick={submit}>
          <Plus size={15} />
        </Button>
      </div>
    </Card>
  );
}

function LogisticsCard({ event, updateEvent }) {
  const { t } = useLanguage();
  const [travel, setTravel] = useState(event.travel_notes || '');
  const [accommodation, setAccommodation] = useState(event.accommodation_notes || '');
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await updateEvent(event.id, { travel_notes: travel, accommodation_notes: accommodation });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
        <Plane size={16} className="text-accent" /> {t('calendar.logisticsTitle')}
      </h2>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">{t('calendar.travelNotes')}</label>
          <Textarea rows={2} value={travel} onChange={(e) => setTravel(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">{t('calendar.accommodationNotes')}</label>
          <Textarea rows={2} value={accommodation} onChange={(e) => setAccommodation(e.target.value)} />
        </div>
        <Button onClick={save}>{saved ? <Check size={15} /> : t('common.save')}</Button>
      </div>
    </Card>
  );
}

function BudgetCard({ eventId }) {
  const { t } = useLanguage();
  const { items, total, addItem, removeItem } = useEventBudget(eventId);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');

  const submit = async () => {
    if (!label.trim() || !amount) return;
    await addItem({ label: label.trim(), amount: Number(amount) });
    setLabel('');
    setAmount('');
  };

  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
        <Wallet size={16} className="text-accent" /> {t('calendar.budgetTitle')}
      </h2>
      {items.length === 0 ? (
        <p className="mb-3 text-sm text-muted">{t('calendar.budgetEmpty')}</p>
      ) : (
        <ul className="mb-3 space-y-1.5">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-card-alt p-2.5 text-sm">
              <span className="text-secondary">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-primary">{Number(item.amount).toFixed(2)} €</span>
                <button onClick={() => removeItem(item.id)} className="text-muted hover:text-red-400">
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          ))}
          <li className="flex items-center justify-between border-t border-app pt-2 text-sm font-semibold text-primary">
            <span>{t('calendar.budgetTotal')}</span>
            <span>{total.toFixed(2)} €</span>
          </li>
        </ul>
      )}
      <div className="flex gap-2">
        <Input placeholder={t('calendar.budgetLabel')} value={label} onChange={(e) => setLabel(e.target.value)} />
        <Input
          type="number"
          placeholder={t('calendar.budgetAmount')}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-32 shrink-0"
        />
        <Button onClick={submit}>
          <Plus size={15} />
        </Button>
      </div>
    </Card>
  );
}

export default function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { t, locale } = useLanguage();
  const { events, updateEvent } = useEvents();
  const { series } = useSeries();

  const event = events.find((e) => e.id === eventId);

  const [form, setForm] = useState(null);
  useEffect(() => {
    if (event) {
      setForm({
        title: event.title,
        type: event.type,
        series_id: event.series_id || '',
        start: event.start?.slice(0, 16),
        end: (event.end || event.start)?.slice(0, 16),
        location: event.location || '',
        notes: event.notes || '',
      });
    }
  }, [event?.id]);

  if (!event || !form) {
    return (
      <div>
        <button onClick={() => navigate('/kalender')} className="mb-4 flex items-center gap-1 text-sm text-secondary hover:text-accent">
          <ArrowLeft size={15} /> {t('calendar.backToCalendar')}
        </button>
        <p className="text-sm text-muted">{t('common.loading')}</p>
      </div>
    );
  }

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const saveCoreData = async () => {
    await updateEvent(event.id, {
      title: form.title,
      type: form.type,
      series_id: form.series_id || null,
      start: new Date(form.start).toISOString(),
      end: new Date(form.end || form.start).toISOString(),
      location: form.location,
      notes: form.notes,
    });
  };

  const currentSeries = series.find((s) => s.id === event.series_id);

  return (
    <div>
      <button onClick={() => navigate('/kalender')} className="mb-4 flex items-center gap-1 text-sm text-secondary hover:text-accent">
        <ArrowLeft size={15} /> {t('calendar.backToCalendar')}
      </button>

      <PageHeader
        title={event.title}
        subtitle={`${new Date(event.start).toLocaleString(locale, { dateStyle: 'full', timeStyle: 'short' })}${event.location ? ` · ${event.location}` : ''}`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={TYPE_TONE[event.type]}>{t(`calendar.types.${event.type}`)}</Badge>
            {currentSeries && <Badge tone={currentSeries.color}>{currentSeries.name}</Badge>}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-primary">{t('calendar.coreData')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-secondary">{t('calendar.fieldTitle')}</label>
              <Input value={form.title} onChange={update('title')} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-secondary">{t('calendar.type')}</label>
              <Select value={form.type} onChange={update('type')}>
                {['training', 'qualifying', 'race', 'briefing', 'other'].map((tKey) => (
                  <option key={tKey} value={tKey}>
                    {t(`calendar.types.${tKey}`)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-secondary">{t('calendar.series')}</label>
              <Select value={form.series_id} onChange={update('series_id')}>
                <option value="">{t('calendar.noSeries')}</option>
                {series.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-secondary">{t('calendar.start')}</label>
              <Input type="datetime-local" value={form.start} onChange={update('start')} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-secondary">{t('calendar.end')}</label>
              <Input type="datetime-local" value={form.end} onChange={update('end')} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-secondary">{t('calendar.location')}</label>
              <Input value={form.location} onChange={update('location')} placeholder={t('calendar.locationPlaceholder')} />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="mb-1 block text-xs font-medium text-secondary">{t('calendar.notes')}</label>
              <Textarea rows={2} value={form.notes} onChange={update('notes')} />
            </div>
          </div>
          <Button className="mt-4" onClick={saveCoreData}>
            {t('common.save')}
          </Button>
        </Card>

        <WeatherCard location={event.location} start={event.start} />
        <RsvpCard eventId={event.id} />
        <ScheduleCard eventId={event.id} />
        <ChecklistCard eventId={event.id} />
        <LogisticsCard event={event} updateEvent={updateEvent} />
        <BudgetCard eventId={event.id} />
      </div>
    </div>
  );
}
