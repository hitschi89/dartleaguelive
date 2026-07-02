import { useMemo, useState } from 'react';
import { ListChecks, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { useTasks } from '../hooks/useTasks.js';
import { useTeam } from '../hooks/useTeam.js';
import { useEvents } from '../hooks/useEvents.js';
import { Card, PageHeader, Button, Input, Textarea, Select, Badge, EmptyState, Modal } from '../components/ui.jsx';

const FILTERS = [
  { key: 'offen', label: 'Offen' },
  { key: 'alle', label: 'Alle' },
  { key: 'erledigt', label: 'Erledigt' },
];

function NewTaskModal({ open, onClose, onCreate, members, events }) {
  const [form, setForm] = useState({ title: '', assignee_id: '', due_date: '', event_id: '', notes: '' });
  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async () => {
    if (!form.title.trim()) return;
    await onCreate({
      title: form.title.trim(),
      assignee_id: form.assignee_id || null,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      event_id: form.event_id || null,
      notes: form.notes,
      done: false,
    });
    setForm({ title: '', assignee_id: '', due_date: '', event_id: '', notes: '' });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Neue Aufgabe">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">Titel</label>
          <Input value={form.title} onChange={update('title')} placeholder="z. B. Reifensatz für Rennen bestellen" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">Zuständig</label>
            <Select value={form.assignee_id} onChange={update('assignee_id')}>
              <option value="">Niemand zugewiesen</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">Fällig am</label>
            <Input type="datetime-local" value={form.due_date} onChange={update('due_date')} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">Event (optional)</label>
          <Select value={form.event_id} onChange={update('event_id')}>
            <option value="">Kein Event</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">Notizen</label>
          <Textarea rows={3} value={form.notes} onChange={update('notes')} />
        </div>
        <Button className="w-full" onClick={submit}>
          Aufgabe erstellen
        </Button>
      </div>
    </Modal>
  );
}

export default function Tasks() {
  const { tasks, loading, addTask, toggleDone, removeTask } = useTasks();
  const { members } = useTeam();
  const { events } = useEvents();
  const [filter, setFilter] = useState('offen');
  const [open, setOpen] = useState(false);

  const memberName = (id) => members.find((m) => m.id === id)?.display_name;
  const eventTitle = (id) => events.find((e) => e.id === id)?.title;

  const filtered = useMemo(() => {
    if (filter === 'offen') return tasks.filter((t) => !t.done);
    if (filter === 'erledigt') return tasks.filter((t) => t.done);
    return tasks;
  }, [tasks, filter]);

  const isOverdue = (t) => !t.done && t.due_date && new Date(t.due_date).getTime() < Date.now();

  return (
    <div>
      <PageHeader
        title="Aufgaben"
        subtitle="To-dos fürs Team – wer macht was bis wann."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> Neue Aufgabe
          </Button>
        }
      />

      <div className="mb-5 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === f.key ? 'border-accent bg-accent/15 text-accent' : 'border-app text-secondary hover-app'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted">Lade Aufgaben…</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ListChecks} title="Keine Aufgaben in dieser Ansicht" />
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <Card key={t.id} className={isOverdue(t) ? 'border-red-500/40' : ''}>
              <div className="flex items-start gap-3">
                <button onClick={() => toggleDone(t.id, !t.done)} className="mt-0.5 shrink-0 text-accent">
                  {t.done ? <CheckCircle2 size={20} /> : <Circle size={20} className="text-muted" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-sm font-semibold ${t.done ? 'text-muted line-through' : 'text-primary'}`}>
                      {t.title}
                    </p>
                    {isOverdue(t) && <Badge tone="red">überfällig</Badge>}
                    {t.event_id && eventTitle(t.event_id) && <Badge tone="blue">{eventTitle(t.event_id)}</Badge>}
                  </div>
                  {t.notes && <p className="mt-1 text-sm text-secondary">{t.notes}</p>}
                  <p className="mt-2 text-xs text-muted">
                    {t.assignee_id && memberName(t.assignee_id) ? `${memberName(t.assignee_id)}` : 'Niemand zugewiesen'}
                    {t.due_date &&
                      ` · fällig ${new Date(t.due_date).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}`}
                  </p>
                </div>
                <button
                  onClick={() => removeTask(t.id)}
                  className="shrink-0 text-muted hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <NewTaskModal open={open} onClose={() => setOpen(false)} onCreate={addTask} members={members} events={events} />
    </div>
  );
}
