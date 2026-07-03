import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Timer, Trash2, Upload, RefreshCw, Check, X as XIcon } from 'lucide-react';
import { useEvents } from '../hooks/useEvents.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { supabase } from '../lib/supabaseClient.js';
import { parseCalendarText } from '../lib/calendarImport.js';
import { Card, PageHeader, Button, Input, Textarea, Select, Badge, Modal } from '../components/ui.jsx';

const TYPE_TONE = { training: 'blue', qualifying: 'amber', race: 'red', briefing: 'green', other: 'slate' };

function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildMonthGrid(cursor) {
  const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth);
  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  return days;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function EventModal({ open, onClose, onSave, onDelete, initial }) {
  const { t } = useLanguage();
  const TYPE_LABEL = {
    training: t('calendar.types.training'),
    qualifying: t('calendar.types.qualifying'),
    race: t('calendar.types.race'),
    briefing: t('calendar.types.briefing'),
    other: t('calendar.types.other'),
  };
  const [form, setForm] = useState(
    initial || {
      title: '',
      type: 'training',
      start: new Date().toISOString().slice(0, 16),
      end: new Date().toISOString().slice(0, 16),
      location: '',
      notes: '',
    }
  );

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async () => {
    if (!form.title.trim() || !form.start) return;
    await onSave({
      ...form,
      start: new Date(form.start).toISOString(),
      end: new Date(form.end || form.start).toISOString(),
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? t('calendar.editEvent') : t('calendar.newEventModalTitle')} wide>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">{t('calendar.fieldTitle')}</label>
          <Input value={form.title} onChange={update('title')} placeholder={t('calendar.titlePlaceholder')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">{t('calendar.type')}</label>
            <Select value={form.type} onChange={update('type')}>
              {Object.entries(TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">{t('calendar.location')}</label>
            <Input value={form.location} onChange={update('location')} placeholder={t('calendar.locationPlaceholder')} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">{t('calendar.start')}</label>
            <Input type="datetime-local" value={form.start?.slice(0, 16)} onChange={update('start')} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">{t('calendar.end')}</label>
            <Input type="datetime-local" value={form.end?.slice(0, 16)} onChange={update('end')} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">{t('calendar.notes')}</label>
          <Textarea rows={3} value={form.notes} onChange={update('notes')} />
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={submit}>
            {t('common.save')}
          </Button>
          {initial?.id && (
            <Button
              variant="danger"
              onClick={async () => {
                await onDelete(initial.id);
                onClose();
              }}
            >
              <Trash2 size={15} />
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ImportModal({ open, onClose, onImported }) {
  const { t } = useLanguage();
  const { team } = useAuth();
  const { importEvents } = useEvents();
  const [icsUrl, setIcsUrl] = useState(team?.calendar_ics_url || '');
  const [pasteText, setPasteText] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const runParse = (text) => {
    const parsed = parseCalendarText(text);
    if (!parsed.length) {
      setError(t('calendar.noEventsDetected'));
      setPreview(null);
      return;
    }
    setError(null);
    setPreview(parsed.map((ev, i) => ({ ...ev, key: i, include: true })));
  };

  const fetchIcsUrl = async () => {
    if (!icsUrl.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(icsUrl.trim());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      runParse(text);
      supabase.from('teams').update({ calendar_ics_url: icsUrl.trim() }).eq('id', team.id).then(() => {});
    } catch (err) {
      setError(t('calendar.fetchFailed', { error: err.message }));
    } finally {
      setBusy(false);
    }
  };

  const toggleInclude = (key) =>
    setPreview((prev) => prev.map((e) => (e.key === key ? { ...e, include: !e.include } : e)));

  const updatePreviewField = (key, field, value) =>
    setPreview((prev) => prev.map((e) => (e.key === key ? { ...e, [field]: value } : e)));

  const confirmImport = async () => {
    const selected = preview.filter((e) => e.include);
    if (!selected.length) return;
    setBusy(true);
    try {
      await importEvents(selected);
      onImported?.();
      setPreview(null);
      setPasteText('');
      onClose();
    } catch (err) {
      setError(err.message || t('calendar.importFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('calendar.importModalTitle')} wide>
      {!preview ? (
        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">{t('calendar.icsUrlLabel')}</label>
            <div className="flex gap-2">
              <Input
                value={icsUrl}
                onChange={(e) => setIcsUrl(e.target.value)}
                placeholder="https://.../calendar.ics"
              />
              <Button onClick={fetchIcsUrl} disabled={busy || !icsUrl.trim()}>
                {t('calendar.fetch')}
              </Button>
            </div>
          </div>

          <div className="text-center text-xs text-muted">{t('calendar.or')}</div>

          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">{t('calendar.pasteLabel')}</label>
            <Textarea
              rows={8}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={t('calendar.pastePlaceholder')}
            />
            <Button className="mt-2 w-full" onClick={() => runParse(pasteText)} disabled={!pasteText.trim()}>
              <Upload size={15} /> {t('calendar.detectEvents')}
            </Button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-secondary">{t('calendar.eventsDetected', { count: preview.length })}</p>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {preview.map((ev) => (
              <div
                key={ev.key}
                className={`rounded-lg border p-3 ${ev.include ? 'border-app' : 'border-app opacity-40'}`}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleInclude(ev.key)}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      ev.include ? 'border-accent bg-accent text-white' : 'border-app'
                    }`}
                  >
                    {ev.include && <Check size={13} />}
                  </button>
                  <Input
                    value={ev.title}
                    onChange={(e) => updatePreviewField(ev.key, 'title', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="datetime-local"
                    value={ev.start?.slice(0, 16)}
                    onChange={(e) => updatePreviewField(ev.key, 'start', new Date(e.target.value).toISOString())}
                    className="w-56 shrink-0"
                  />
                </div>
              </div>
            ))}
          </div>
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setPreview(null)}>
              <XIcon size={15} /> {t('common.back')}
            </Button>
            <Button className="flex-1" onClick={confirmImport} disabled={busy}>
              {busy ? t('calendar.importing') : t('calendar.importNTasks', { count: preview.filter((e) => e.include).length })}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function Calendar() {
  const { t, locale } = useLanguage();
  const { team } = useAuth();
  const { events, addEvent, updateEvent, removeEvent, importEvents } = useEvents();
  const [importOpen, setImportOpen] = useState(false);
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState('month');
  const [modalState, setModalState] = useState(null);

  const TYPE_LABEL = {
    training: t('calendar.types.training'),
    qualifying: t('calendar.types.qualifying'),
    race: t('calendar.types.race'),
    briefing: t('calendar.types.briefing'),
    other: t('calendar.types.other'),
  };
  const WEEKDAYS = t('calendar.weekdays');

  const formatCountdown = (dateStr) => {
    const diffMs = new Date(dateStr).getTime() - Date.now();
    if (diffMs <= 0) return t('countdown.now');
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
    if (days > 0) return t('countdown.daysHours', { days, hours });
    if (hours > 0) return t('countdown.hoursMinutes', { hours, minutes });
    return t('countdown.minutes', { minutes });
  };

  const nextEvent = useMemo(
    () =>
      events
        .filter((e) => new Date(e.start).getTime() > Date.now())
        .sort((a, b) => new Date(a.start) - new Date(b.start))[0],
    [events]
  );

  const days = useMemo(() => {
    if (view === 'month') return buildMonthGrid(cursor);
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor, view]);

  const eventsOn = (day) => events.filter((e) => sameDay(new Date(e.start), day));

  const navigate = (delta) => {
    const d = new Date(cursor);
    if (view === 'month') d.setMonth(d.getMonth() + delta);
    else d.setDate(d.getDate() + delta * 7);
    setCursor(d);
  };

  const openNewForDay = (day) => {
    const start = new Date(day);
    start.setHours(9, 0, 0, 0);
    setModalState({ start: start.toISOString().slice(0, 16), end: start.toISOString().slice(0, 16), type: 'training', title: '', location: '', notes: '' });
  };

  const resyncFeed = async () => {
    if (!team?.calendar_ics_url) return;
    try {
      const res = await fetch(team.calendar_ics_url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const parsed = parseCalendarText(text);
      await importEvents(parsed);
    } catch (err) {
      alert(t('calendar.resyncFailed', { error: err.message }));
    }
  };

  return (
    <div>
      <PageHeader
        title={t('calendar.title')}
        subtitle={t('calendar.subtitle')}
        action={
          <div className="flex gap-2">
            {team?.calendar_ics_url && (
              <Button variant="secondary" onClick={resyncFeed}>
                <RefreshCw size={15} /> {t('calendar.updateCalendar')}
              </Button>
            )}
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              <Upload size={16} /> {t('calendar.importCalendar')}
            </Button>
            <Button onClick={() => openNewForDay(new Date())}>
              <Plus size={16} /> {t('calendar.newEvent')}
            </Button>
          </div>
        }
      />

      {nextEvent && (
        <Card className="mb-5 flex items-center justify-between border-accent/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Timer size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">{t('calendar.nextEvent')}: {nextEvent.title}</p>
              <p className="text-xs text-secondary">
                {new Date(nextEvent.start).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>
          <Badge tone="accent">{t('calendar.countdownLabel')}: {formatCountdown(nextEvent.start)}</Badge>
        </Card>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="rounded-lg border border-app p-2 hover-app">
            <ChevronLeft size={16} />
          </button>
          <p className="min-w-[160px] text-center text-sm font-semibold text-primary">
            {view === 'month'
              ? cursor.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
              : `${t('calendar.calendarWeek')} ${Math.ceil((startOfWeek(cursor).getDate()) / 7)} · ${startOfWeek(cursor).toLocaleDateString(locale)}`}
          </p>
          <button onClick={() => navigate(1)} className="rounded-lg border border-app p-2 hover-app">
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => setCursor(new Date())}
            className="ml-2 rounded-lg border border-app px-3 py-1.5 text-xs text-secondary hover-app"
          >
            {t('calendar.today')}
          </button>
        </div>
        <div className="flex gap-1 rounded-lg border border-app p-1">
          {['month', 'week'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                view === v ? 'bg-accent/15 text-accent' : 'text-secondary'
              }`}
            >
              {v === 'month' ? t('calendar.month') : t('calendar.week')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-muted">
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className={`mt-2 grid grid-cols-7 gap-2 ${view === 'month' ? '' : ''}`}>
        {days.map((day) => {
          const dayEvents = eventsOn(day);
          const isOtherMonth = view === 'month' && day.getMonth() !== cursor.getMonth();
          const isToday = sameDay(day, new Date());
          return (
            <div
              key={day.toISOString()}
              onClick={() => openNewForDay(day)}
              className={`min-h-[110px] cursor-pointer rounded-lg border border-app bg-card p-2 transition-colors hover:border-accent/50 ${
                isOtherMonth ? 'opacity-40' : ''
              }`}
            >
              <p className={`mb-1 text-xs font-semibold ${isToday ? 'text-accent' : 'text-secondary'}`}>
                {day.getDate()}
              </p>
              <div className="space-y-1">
                {dayEvents.slice(0, view === 'month' ? 3 : 8).map((ev) => (
                  <button
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalState({ ...ev, start: ev.start.slice(0, 16), end: (ev.end || ev.start).slice(0, 16) });
                    }}
                    className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium"
                    style={{ background: 'var(--bg-hover)' }}
                  >
                    <Badge tone={TYPE_TONE[ev.type]}>{TYPE_LABEL[ev.type]}</Badge>{' '}
                    <span className="text-primary">{ev.title}</span>
                  </button>
                ))}
                {view === 'month' && dayEvents.length > 3 && (
                  <p className="text-[10px] text-muted">{t('calendar.moreEvents', { count: dayEvents.length - 3 })}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {modalState && (
        <EventModal
          open={!!modalState}
          onClose={() => setModalState(null)}
          initial={modalState}
          onSave={async (data) => {
            if (data.id) await updateEvent(data.id, data);
            else await addEvent(data);
          }}
          onDelete={removeEvent}
        />
      )}

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
