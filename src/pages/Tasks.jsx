import { useMemo, useState } from 'react';
import { ListChecks, Plus, Trash2, CheckCircle2, Circle, Lock } from 'lucide-react';
import { useTasks } from '../hooks/useTasks.js';
import { useTeam } from '../hooks/useTeam.js';
import { useEvents } from '../hooks/useEvents.js';
import { ROLES } from '../lib/roles.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Card, PageHeader, Button, Input, Textarea, Select, Badge, EmptyState, Modal, RoleVisibilityPicker } from '../components/ui.jsx';

function NewTaskModal({ open, onClose, onCreate, members, events }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ title: '', assignee_id: '', due_date: '', event_id: '', notes: '' });
  const [visibleRoles, setVisibleRoles] = useState(null);
  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async () => {
    if (!form.title.trim()) return;
    await onCreate({
      title: form.title.trim(),
      assignee_id: form.assignee_id || null,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      event_id: form.event_id || null,
      notes: form.notes,
      visible_roles: visibleRoles,
      done: false,
    });
    setForm({ title: '', assignee_id: '', due_date: '', event_id: '', notes: '' });
    setVisibleRoles(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={t('tasks.newTaskModalTitle')}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">{t('tasks.fieldTitle')}</label>
          <Input value={form.title} onChange={update('title')} placeholder={t('tasks.titlePlaceholder')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">{t('tasks.assignee')}</label>
            <Select value={form.assignee_id} onChange={update('assignee_id')}>
              <option value="">{t('tasks.noAssignee')}</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">{t('tasks.dueDate')}</label>
            <Input type="datetime-local" value={form.due_date} onChange={update('due_date')} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">{t('tasks.event')}</label>
          <Select value={form.event_id} onChange={update('event_id')}>
            <option value="">{t('tasks.noEvent')}</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">{t('tasks.notes')}</label>
          <Textarea rows={3} value={form.notes} onChange={update('notes')} />
        </div>
        <RoleVisibilityPicker
          label={t('common.visibleForRoles')}
          roles={ROLES}
          value={visibleRoles}
          onChange={setVisibleRoles}
        />
        <Button className="w-full" onClick={submit}>
          {t('tasks.createTask')}
        </Button>
      </div>
    </Modal>
  );
}

export default function Tasks() {
  const { t, tRole, locale } = useLanguage();
  const FILTERS = [
    { key: 'offen', label: t('tasks.filterOpen') },
    { key: 'alle', label: t('tasks.filterAll') },
    { key: 'erledigt', label: t('tasks.filterDone') },
  ];
  const { tasks, loading, addTask, toggleDone, removeTask } = useTasks();
  const { members } = useTeam();
  const { events } = useEvents();
  const [filter, setFilter] = useState('offen');
  const [open, setOpen] = useState(false);

  const memberName = (id) => members.find((m) => m.id === id)?.display_name;
  const eventTitle = (id) => events.find((e) => e.id === id)?.title;

  const filtered = useMemo(() => {
    if (filter === 'offen') return tasks.filter((task) => !task.done);
    if (filter === 'erledigt') return tasks.filter((task) => task.done);
    return tasks;
  }, [tasks, filter]);

  const isOverdue = (task) => !task.done && task.due_date && new Date(task.due_date).getTime() < Date.now();

  return (
    <div>
      <PageHeader
        title={t('tasks.title')}
        subtitle={t('tasks.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> {t('tasks.newTask')}
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
        <p className="text-sm text-muted">{t('tasks.loadingTasks')}</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ListChecks} title={t('tasks.noTasksInView')} />
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => (
            <Card key={task.id} className={isOverdue(task) ? 'border-red-500/40' : ''}>
              <div className="flex items-start gap-3">
                <button onClick={() => toggleDone(task.id, !task.done)} className="mt-0.5 shrink-0 text-accent">
                  {task.done ? <CheckCircle2 size={20} /> : <Circle size={20} className="text-muted" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-sm font-semibold ${task.done ? 'text-muted line-through' : 'text-primary'}`}>
                      {task.title}
                    </p>
                    {isOverdue(task) && <Badge tone="red">{t('tasks.overdue')}</Badge>}
                    {task.event_id && eventTitle(task.event_id) && <Badge tone="blue">{eventTitle(task.event_id)}</Badge>}
                    {task.visible_roles && task.visible_roles.length > 0 && (
                      <Badge tone="amber">
                        <Lock size={10} className="mr-1 inline" />
                        {task.visible_roles.map(tRole).join(', ')}
                      </Badge>
                    )}
                  </div>
                  {task.notes && <p className="mt-1 text-sm text-secondary">{task.notes}</p>}
                  <p className="mt-2 text-xs text-muted">
                    {task.assignee_id && memberName(task.assignee_id) ? memberName(task.assignee_id) : t('tasks.noAssignee')}
                    {task.due_date &&
                      ` · ${t('tasks.dueOn', {
                        date: new Date(task.due_date).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }),
                      })}`}
                  </p>
                </div>
                <button
                  onClick={() => removeTask(task.id)}
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
