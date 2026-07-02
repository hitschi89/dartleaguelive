import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Timer, Trash2 } from 'lucide-react';
import { useEvents } from '../hooks/useEvents.js';
import { Card, PageHeader, Button, Input, Textarea, Select, Badge, Modal } from '../components/ui.jsx';

const TYPE_LABEL = { training: 'Training', qualifying: 'Qualifying', race: 'Rennen', briefing: 'Briefing', other: 'Sonstiges' };
const TYPE_TONE = { training: 'blue', qualifying: 'amber', race: 'red', briefing: 'green', other: 'slate' };
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

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

function formatCountdown(dateStr) {
  const diffMs = new Date(dateStr).getTime() - Date.now();
  if (diffMs <= 0) return 'jetzt';
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
  if (days > 0) return `${days}T ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

function EventModal({ open, onClose, onSave, onDelete, initial }) {
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
    <Modal open={open} onClose={onClose} title={initial?.id ? 'Termin bearbeiten' : 'Neuer Termin'} wide>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">Titel</label>
          <Input value={form.title} onChange={update('title')} placeholder="z. B. Freies Training 1" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">Typ</label>
            <Select value={form.type} onChange={update('type')}>
              {Object.entries(TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">Ort</label>
            <Input value={form.location} onChange={update('location')} placeholder="Strecke / Raum" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">Start</label>
            <Input type="datetime-local" value={form.start?.slice(0, 16)} onChange={update('start')} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">Ende</label>
            <Input type="datetime-local" value={form.end?.slice(0, 16)} onChange={update('end')} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">Notizen</label>
          <Textarea rows={3} value={form.notes} onChange={update('notes')} />
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={submit}>
            Speichern
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

export default function Calendar() {
  const { events, addEvent, updateEvent, removeEvent } = useEvents();
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState('month');
  const [modalState, setModalState] = useState(null);

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

  return (
    <div>
      <PageHeader
        title="Kalender"
        subtitle="Trainings, Qualifyings, Rennen und Briefings im Blick."
        action={
          <Button onClick={() => openNewForDay(new Date())}>
            <Plus size={16} /> Neuer Termin
          </Button>
        }
      />

      {nextEvent && (
        <Card className="mb-5 flex items-center justify-between border-accent/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Timer size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">Nächster Termin: {nextEvent.title}</p>
              <p className="text-xs text-secondary">
                {new Date(nextEvent.start).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>
          <Badge tone="accent">Countdown: {formatCountdown(nextEvent.start)}</Badge>
        </Card>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="rounded-lg border border-app p-2 hover-app">
            <ChevronLeft size={16} />
          </button>
          <p className="min-w-[160px] text-center text-sm font-semibold text-primary">
            {view === 'month'
              ? cursor.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
              : `KW ${Math.ceil((startOfWeek(cursor).getDate()) / 7)} · ${startOfWeek(cursor).toLocaleDateString('de-DE')}`}
          </p>
          <button onClick={() => navigate(1)} className="rounded-lg border border-app p-2 hover-app">
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => setCursor(new Date())}
            className="ml-2 rounded-lg border border-app px-3 py-1.5 text-xs text-secondary hover-app"
          >
            Heute
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
              {v === 'month' ? 'Monat' : 'Woche'}
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
                  <p className="text-[10px] text-muted">+{dayEvents.length - 3} mehr</p>
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
    </div>
  );
}
