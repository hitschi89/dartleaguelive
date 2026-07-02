import { useEffect, useMemo, useState } from 'react';
import { Megaphone, Plus, Trash2, MailOpen, Mail, Paperclip, FileText } from 'lucide-react';
import { useBulletins } from '../hooks/useBulletins.js';
import { useEvents } from '../hooks/useEvents.js';
import { Card, PageHeader, Button, Input, Textarea, Select, Badge, EmptyState, Modal } from '../components/ui.jsx';

const PRIORITY_TONE = { dringend: 'red', wichtig: 'amber', info: 'blue' };
const FILTERS = [
  { key: 'alle', label: 'Alle' },
  { key: 'ungelesen', label: 'Ungelesen' },
  { key: 'dringend', label: 'Dringend' },
];

function NewBulletinModal({ open, onClose, onCreate, events, pickAttachment }) {
  const [form, setForm] = useState({
    title: '',
    source: '',
    category: 'Rennleitung',
    priority: 'info',
    date: new Date().toISOString().slice(0, 16),
    body: '',
    event_id: '',
  });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handlePick = async () => {
    const picked = await pickAttachment();
    if (picked) setFile(picked);
  };

  const submit = async () => {
    if (!form.title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onCreate({
        ...form,
        date: new Date(form.date).toISOString(),
        event_id: form.event_id || null,
        file,
      });
      setForm({
        title: '',
        source: '',
        category: 'Rennleitung',
        priority: 'info',
        date: new Date().toISOString().slice(0, 16),
        body: '',
        event_id: '',
      });
      setFile(null);
      onClose();
    } catch (err) {
      setError(err.message || 'Bulletin konnte nicht veröffentlicht werden.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Neues Bulletin" wide>
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">Titel</label>
          <Input value={form.title} onChange={update('title')} placeholder="z. B. Bulletin Nr. 4 – Boxenausfahrt" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">Quelle</label>
            <Input value={form.source} onChange={update('source')} placeholder="FIA / Rennleitung / Veranstalter" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">Kategorie</label>
            <Input value={form.category} onChange={update('category')} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">Wichtigkeit</label>
            <Select value={form.priority} onChange={update('priority')}>
              <option value="info">Info</option>
              <option value="wichtig">Wichtig</option>
              <option value="dringend">Dringend</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">Datum</label>
            <Input type="datetime-local" value={form.date} onChange={update('date')} />
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
          <label className="mb-1 block text-xs font-medium text-secondary">Inhalt</label>
          <Textarea rows={5} value={form.body} onChange={update('body')} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">PDF-Anhang (optional)</label>
          <Button variant="secondary" onClick={handlePick} className="w-full">
            <Paperclip size={15} /> {file ? file.name : 'PDF auswählen'}
          </Button>
        </div>
        <Button className="w-full" onClick={submit} disabled={busy}>
          {busy ? 'Wird veröffentlicht…' : 'Bulletin veröffentlichen'}
        </Button>
      </div>
    </Modal>
  );
}

function AttachmentModal({ bulletin, onClose, readAttachment }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!bulletin) return;
    setUrl(null);
    readAttachment(bulletin.id).then((res) => setUrl(res?.url || null));
  }, [bulletin, readAttachment]);

  if (!bulletin) return null;

  return (
    <Modal open={!!bulletin} onClose={onClose} title={bulletin.attachment_name || 'Anhang'} wide>
      {!url ? (
        <p className="py-12 text-center text-sm text-muted">Lade PDF…</p>
      ) : (
        <iframe title={bulletin.attachment_name} src={url} className="h-[70vh] w-full rounded-lg border border-app" />
      )}
    </Modal>
  );
}

export default function Bulletins() {
  const { bulletins, loading, addBulletin, toggleRead, removeBulletin, pickAttachment, readAttachment } =
    useBulletins();
  const { events } = useEvents();
  const [filter, setFilter] = useState('alle');
  const [open, setOpen] = useState(false);
  const [attachmentBulletin, setAttachmentBulletin] = useState(null);

  const eventTitle = (id) => events.find((e) => e.id === id)?.title;

  const filtered = useMemo(() => {
    const sorted = [...bulletins].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (filter === 'ungelesen') return sorted.filter((b) => !b.read);
    if (filter === 'dringend') return sorted.filter((b) => b.priority === 'dringend');
    return sorted;
  }, [bulletins, filter]);

  return (
    <div>
      <PageHeader
        title="Bulletins & Mitteilungen"
        subtitle="Offizielle Mitteilungen von FIA, Veranstalter und Rennleitung."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> Neues Bulletin
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
        <p className="text-sm text-muted">Lade Bulletins…</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Megaphone} title="Keine Bulletins in dieser Ansicht" />
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <Card key={b.id} className={!b.read ? 'border-accent/40' : ''}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge tone={PRIORITY_TONE[b.priority] || 'slate'}>{b.priority}</Badge>
                    <Badge>{b.category}</Badge>
                    {b.event_id && eventTitle(b.event_id) && <Badge tone="blue">{eventTitle(b.event_id)}</Badge>}
                  </div>
                  <p className={`text-sm font-semibold ${b.read ? 'text-secondary' : 'text-primary'}`}>
                    {b.title}
                  </p>
                  {b.body && <p className="mt-1 whitespace-pre-wrap text-sm text-secondary">{b.body}</p>}
                  {b.attachment_path && (
                    <button
                      onClick={() => setAttachmentBulletin(b)}
                      className="mt-2 flex items-center gap-1.5 rounded-lg bg-card-alt px-2.5 py-1.5 text-xs font-medium text-accent hover:underline"
                    >
                      <FileText size={13} /> {b.attachment_name || 'PDF ansehen'}
                    </button>
                  )}
                  <p className="mt-2 text-xs text-muted">
                    {new Date(b.date).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
                    {b.source ? ` · ${b.source}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <button
                    onClick={() => toggleRead(b.id, !b.read)}
                    className="flex items-center gap-1 text-xs text-secondary hover:text-accent"
                    title={b.read ? 'Als ungelesen markieren' : 'Als gelesen markieren'}
                  >
                    {b.read ? <Mail size={14} /> : <MailOpen size={14} />}
                    {b.read ? 'Ungelesen' : 'Gelesen'}
                  </button>
                  <button
                    onClick={() => removeBulletin(b.id)}
                    className="flex items-center gap-1 text-xs text-muted hover:text-red-400"
                  >
                    <Trash2 size={13} /> Löschen
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <NewBulletinModal
        open={open}
        onClose={() => setOpen(false)}
        onCreate={addBulletin}
        events={events}
        pickAttachment={pickAttachment}
      />
      <AttachmentModal
        bulletin={attachmentBulletin}
        onClose={() => setAttachmentBulletin(null)}
        readAttachment={readAttachment}
      />
    </div>
  );
}
