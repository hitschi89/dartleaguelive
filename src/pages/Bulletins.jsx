import { useEffect, useMemo, useState } from 'react';
import { Megaphone, Plus, Trash2, MailOpen, Mail, Paperclip, FileText, Lock } from 'lucide-react';
import { useBulletins } from '../hooks/useBulletins.js';
import { useEvents } from '../hooks/useEvents.js';
import { ROLES } from '../lib/roles.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Card, PageHeader, Button, Input, Textarea, Select, Badge, EmptyState, Modal, RoleVisibilityPicker } from '../components/ui.jsx';

const PRIORITY_TONE = { dringend: 'red', wichtig: 'amber', info: 'blue' };
const PRIORITY_KEY = { dringend: 'priorityUrgent', wichtig: 'priorityImportant', info: 'priorityInfo' };

function NewBulletinModal({ open, onClose, onCreate, events, pickAttachment }) {
  const { t } = useLanguage();
  const FILTERS_INITIAL = {
    title: '',
    source: '',
    category: 'Rennleitung',
    priority: 'info',
    date: new Date().toISOString().slice(0, 16),
    body: '',
    event_id: '',
  };
  const [form, setForm] = useState(FILTERS_INITIAL);
  const [visibleRoles, setVisibleRoles] = useState(null);
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
        visible_roles: visibleRoles,
        file,
      });
      setForm(FILTERS_INITIAL);
      setVisibleRoles(null);
      setFile(null);
      onClose();
    } catch (err) {
      setError(err.message || t('bulletins.publishFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('bulletins.newBulletinModalTitle')} wide>
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">{t('bulletins.fieldTitle')}</label>
          <Input value={form.title} onChange={update('title')} placeholder={t('bulletins.titlePlaceholder')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">{t('bulletins.source')}</label>
            <Input value={form.source} onChange={update('source')} placeholder={t('bulletins.sourcePlaceholder')} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">{t('bulletins.category')}</label>
            <Input value={form.category} onChange={update('category')} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">{t('bulletins.priority')}</label>
            <Select value={form.priority} onChange={update('priority')}>
              <option value="info">{t('bulletins.priorityInfo')}</option>
              <option value="wichtig">{t('bulletins.priorityImportant')}</option>
              <option value="dringend">{t('bulletins.priorityUrgent')}</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">{t('bulletins.date')}</label>
            <Input type="datetime-local" value={form.date} onChange={update('date')} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">{t('bulletins.event')}</label>
          <Select value={form.event_id} onChange={update('event_id')}>
            <option value="">{t('bulletins.noEvent')}</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">{t('bulletins.content')}</label>
          <Textarea rows={5} value={form.body} onChange={update('body')} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">{t('bulletins.attachment')}</label>
          <Button variant="secondary" onClick={handlePick} className="w-full">
            <Paperclip size={15} /> {file ? file.name : t('bulletins.pickPdf')}
          </Button>
        </div>
        <RoleVisibilityPicker
          label={t('common.visibleForRoles')}
          roles={ROLES}
          value={visibleRoles}
          onChange={setVisibleRoles}
        />
        <Button className="w-full" onClick={submit} disabled={busy}>
          {busy ? t('bulletins.publishing') : t('bulletins.publish')}
        </Button>
      </div>
    </Modal>
  );
}

function AttachmentModal({ bulletin, onClose, readAttachment }) {
  const { t } = useLanguage();
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!bulletin) return;
    setUrl(null);
    readAttachment(bulletin.id).then((res) => setUrl(res?.url || null));
  }, [bulletin, readAttachment]);

  if (!bulletin) return null;

  return (
    <Modal open={!!bulletin} onClose={onClose} title={bulletin.attachment_name || t('bulletins.attachmentModalTitle')} wide>
      {!url ? (
        <p className="py-12 text-center text-sm text-muted">{t('bulletins.loadingPdf')}</p>
      ) : (
        <iframe title={bulletin.attachment_name} src={url} className="h-[70vh] w-full rounded-lg border border-app" />
      )}
    </Modal>
  );
}

export default function Bulletins() {
  const { t, tRole, locale } = useLanguage();
  const FILTERS = [
    { key: 'alle', label: t('bulletins.filterAll') },
    { key: 'ungelesen', label: t('bulletins.filterUnread') },
    { key: 'dringend', label: t('bulletins.filterUrgent') },
  ];
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
        title={t('bulletins.title')}
        subtitle={t('bulletins.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> {t('bulletins.newBulletin')}
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
        <p className="text-sm text-muted">{t('bulletins.loadingBulletins')}</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Megaphone} title={t('bulletins.noBulletinsInView')} />
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <Card key={b.id} className={!b.read ? 'border-accent/40' : ''}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge tone={PRIORITY_TONE[b.priority] || 'slate'}>
                      {t(`bulletins.${PRIORITY_KEY[b.priority] || 'priorityInfo'}`)}
                    </Badge>
                    <Badge>{b.category}</Badge>
                    {b.event_id && eventTitle(b.event_id) && <Badge tone="blue">{eventTitle(b.event_id)}</Badge>}
                    {b.visible_roles && b.visible_roles.length > 0 && (
                      <Badge tone="amber">
                        <Lock size={10} className="mr-1 inline" />
                        {b.visible_roles.map(tRole).join(', ')}
                      </Badge>
                    )}
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
                      <FileText size={13} /> {b.attachment_name || t('bulletins.viewPdf')}
                    </button>
                  )}
                  <p className="mt-2 text-xs text-muted">
                    {new Date(b.date).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}
                    {b.source ? ` · ${b.source}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <button
                    onClick={() => toggleRead(b.id, !b.read)}
                    className="flex items-center gap-1 text-xs text-secondary hover:text-accent"
                    title={b.read ? t('bulletins.markUnread') : t('bulletins.markRead')}
                  >
                    {b.read ? <Mail size={14} /> : <MailOpen size={14} />}
                    {b.read ? t('bulletins.unread') : t('bulletins.read')}
                  </button>
                  <button
                    onClick={() => removeBulletin(b.id)}
                    className="flex items-center gap-1 text-xs text-muted hover:text-red-400"
                  >
                    <Trash2 size={13} /> {t('common.delete')}
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
