import { useEffect, useMemo, useRef, useState } from 'react';
import { Hash, Send, Trash2, FileDown, FileText, Plus, Lock, Reply, Image as ImageIcon, X } from 'lucide-react';
import { useMessages } from '../hooks/useMessages.js';
import { useChannels } from '../hooks/useChannels.js';
import { useTeam } from '../hooks/useTeam.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Card, PageHeader, Button, Input, Textarea, EmptyState, Modal } from '../components/ui.jsx';

function NewChannelModal({ open, onClose, onCreate, members }) {
  const { t, tRole } = useLanguage();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);

  const toggleMember = (userId) => {
    setSelected((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onCreate({ name: name.trim(), memberUserIds: selected });
      setName('');
      setSelected([]);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const otherMembers = members.filter((m) => m.user_id !== user?.id);

  return (
    <Modal open={open} onClose={onClose} title={t('communication.newChannelModalTitle')}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">{t('communication.channelName')}</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('communication.channelNamePlaceholder')} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">{t('communication.whoHasAccess')}</label>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-app p-2">
            {otherMembers.length === 0 ? (
              <p className="p-2 text-sm text-muted">{t('communication.noOtherMembers')}</p>
            ) : (
              otherMembers.map((m) => (
                <label
                  key={m.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-primary hover-app"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(m.user_id)}
                    onChange={() => toggleMember(m.user_id)}
                    className="accent-red-500"
                  />
                  {m.display_name}
                  <span className="text-xs text-muted">({tRole(m.role)})</span>
                </label>
              ))
            )}
          </div>
        </div>
        <Button className="w-full" onClick={submit} disabled={busy}>
          {busy ? t('communication.creatingChannel') : t('communication.createChannel')}
        </Button>
      </div>
    </Modal>
  );
}

function MessageImage({ path, getImageUrl }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getImageUrl(path)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [path, getImageUrl]);

  if (failed) return null;
  if (!url) return <div className="mt-2 h-32 w-32 animate-pulse rounded-lg bg-card" />;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt="" className="mt-2 max-h-64 max-w-full rounded-lg border border-app object-contain" />
    </a>
  );
}

export default function Communication() {
  const { t, locale } = useLanguage();
  const { messages, loading, addMessage, removeMessage, exportText, exportPdf, pickImage, getImageUrl } = useMessages();
  const { channels, loading: channelsLoading, addCustomChannel } = useChannels();
  const { members } = useTeam();
  const [activeChannel, setActiveChannel] = useState(null);
  const [text, setText] = useState('');
  const [newChannelOpen, setNewChannelOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [pendingImage, setPendingImage] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!activeChannel && channels.length > 0) setActiveChannel(channels[0].id);
  }, [channels, activeChannel]);

  const channelMessages = useMemo(
    () => messages.filter((m) => m.channel_id === activeChannel),
    [messages, activeChannel]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [channelMessages.length, activeChannel]);

  const currentChannel = channels.find((c) => c.id === activeChannel);
  const findMessage = (id) => messages.find((m) => m.id === id);

  const handleSend = async () => {
    if ((!text.trim() && !pendingImage) || !activeChannel) return;
    setSending(true);
    setError(null);
    try {
      await addMessage(activeChannel, text.trim(), {
        replyToId: replyingTo?.id || null,
        imageFile: pendingImage,
      });
      setText('');
      setReplyingTo(null);
      setPendingImage(null);
    } catch (err) {
      setError(err.message || t('communication.imageUploadFailed'));
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = async () => {
    const file = await pickImage();
    if (file) setPendingImage(file);
  };

  return (
    <div>
      <PageHeader
        title={t('communication.title')}
        subtitle={t('communication.subtitle')}
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={!channelMessages.length}
              onClick={() => exportText(channelMessages, currentChannel?.name)}
            >
              <FileText size={16} /> {t('communication.exportText')}
            </Button>
            <Button
              variant="secondary"
              disabled={!channelMessages.length}
              onClick={() => exportPdf(channelMessages, currentChannel?.name)}
            >
              <FileDown size={16} /> {t('communication.exportPdf')}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
        <Card className="p-2">
          <div className="mb-1 flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">{t('communication.channels')}</span>
            <button onClick={() => setNewChannelOpen(true)} className="text-muted hover:text-accent" title={t('communication.newChannel')}>
              <Plus size={16} />
            </button>
          </div>
          {channelsLoading ? (
            <p className="p-3 text-sm text-muted">{t('communication.loadingChannels')}</p>
          ) : (
            <nav className="space-y-1">
              {channels.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveChannel(c.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    activeChannel === c.id ? 'bg-accent/15 text-accent' : 'text-secondary hover-app'
                  }`}
                >
                  {c.kind === 'custom' ? <Lock size={13} /> : <Hash size={14} />}
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </nav>
          )}
        </Card>

        <Card className="flex h-[60vh] flex-col overflow-hidden p-0">
          <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin p-5">
            {loading ? (
              <p className="text-sm text-muted">{t('communication.loadingMessages')}</p>
            ) : channelMessages.length === 0 ? (
              <EmptyState icon={Hash} title={t('communication.noMessagesYet')} description={t('communication.noMessagesDescription')} />
            ) : (
              channelMessages.map((m) => {
                const original = m.reply_to_id ? findMessage(m.reply_to_id) : null;
                return (
                  <div key={m.id} className="group flex items-start justify-between gap-3 rounded-lg bg-card-alt p-3">
                    <div className="min-w-0 flex-1">
                      {original && (
                        <div className="mb-1.5 rounded-md border-l-2 border-accent/50 bg-app/40 px-2 py-1 text-xs text-muted">
                          <span className="font-medium text-secondary">{original.author_name}</span>{' '}
                          <span className="truncate">{original.text?.slice(0, 80) || '📷'}</span>
                        </div>
                      )}
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-primary">{m.author_name}</span>
                        <span className="text-xs text-muted">
                          {new Date(m.created_at).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      {m.text && <p className="mt-1 whitespace-pre-wrap text-sm text-secondary">{m.text}</p>}
                      {m.image_path && <MessageImage path={m.image_path} getImageUrl={getImageUrl} />}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <button
                        onClick={() => setReplyingTo(m)}
                        className="text-muted opacity-0 transition-opacity hover:text-accent group-hover:opacity-100"
                        title={t('communication.reply')}
                      >
                        <Reply size={14} />
                      </button>
                      <button
                        onClick={() => removeMessage(m.id)}
                        className="text-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-app p-4">
            {error && (
              <div className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {error}
              </div>
            )}
            {replyingTo && (
              <div className="mb-2 flex items-center justify-between rounded-lg bg-card-alt px-3 py-2 text-xs">
                <span className="truncate text-secondary">
                  {t('communication.replyingTo', { name: replyingTo.author_name })}: {replyingTo.text?.slice(0, 60) || '📷'}
                </span>
                <button onClick={() => setReplyingTo(null)} className="shrink-0 text-muted hover:text-primary">
                  <X size={13} />
                </button>
              </div>
            )}
            {pendingImage && (
              <div className="mb-2 flex items-center justify-between rounded-lg bg-card-alt px-3 py-2 text-xs">
                <span className="truncate text-secondary">{pendingImage.name}</span>
                <button onClick={() => setPendingImage(null)} className="shrink-0 text-muted hover:text-primary">
                  <X size={13} />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handlePickImage}
                className="flex shrink-0 items-center justify-center rounded-lg border border-app px-3 hover-app"
                title={t('communication.attachImage')}
              >
                <ImageIcon size={16} className="text-secondary" />
              </button>
              <Textarea
                rows={2}
                placeholder={t('communication.messagePlaceholder', { channel: currentChannel?.name || '' })}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button onClick={handleSend} className="self-end" disabled={!activeChannel || sending}>
                <Send size={16} />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <NewChannelModal
        open={newChannelOpen}
        onClose={() => setNewChannelOpen(false)}
        onCreate={addCustomChannel}
        members={members}
      />
    </div>
  );
}
