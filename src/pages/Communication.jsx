import { useEffect, useMemo, useState } from 'react';
import { Hash, Send, Trash2, FileDown, FileText } from 'lucide-react';
import { useMessages } from '../hooks/useMessages.js';
import { useChannels } from '../hooks/useChannels.js';
import { Card, PageHeader, Button, Textarea, EmptyState } from '../components/ui.jsx';

export default function Communication() {
  const { messages, loading, addMessage, removeMessage, exportText, exportPdf } = useMessages();
  const { channels, loading: channelsLoading } = useChannels();
  const [activeChannel, setActiveChannel] = useState(null);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!activeChannel && channels.length > 0) setActiveChannel(channels[0].id);
  }, [channels, activeChannel]);

  const channelMessages = useMemo(
    () => messages.filter((m) => m.channel_id === activeChannel),
    [messages, activeChannel]
  );

  const currentChannel = channels.find((c) => c.id === activeChannel);

  const handleSend = async () => {
    if (!text.trim() || !activeChannel) return;
    await addMessage(activeChannel, text.trim());
    setText('');
  };

  return (
    <div>
      <PageHeader
        title="Kommunikation"
        subtitle="Team-Chat mit einem allgemeinen Kanal und automatischen Kanälen pro Event."
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={!channelMessages.length}
              onClick={() => exportText(channelMessages, currentChannel?.name)}
            >
              <FileText size={16} /> Als Text
            </Button>
            <Button
              variant="secondary"
              disabled={!channelMessages.length}
              onClick={() => exportPdf(channelMessages, currentChannel?.name)}
            >
              <FileDown size={16} /> Als PDF
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
        <Card className="p-2">
          {channelsLoading ? (
            <p className="p-3 text-sm text-muted">Lade Kanäle…</p>
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
                  <Hash size={14} />
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </nav>
          )}
        </Card>

        <Card className="flex h-[60vh] flex-col overflow-hidden p-0">
          <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin p-5">
            {loading ? (
              <p className="text-sm text-muted">Lade Nachrichten…</p>
            ) : channelMessages.length === 0 ? (
              <EmptyState icon={Hash} title="Noch keine Nachrichten" description="Starte die Team-Kommunikation in diesem Kanal." />
            ) : (
              channelMessages.map((m) => (
                <div key={m.id} className="group flex items-start justify-between gap-3 rounded-lg bg-card-alt p-3">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-primary">{m.author_name}</span>
                      <span className="text-xs text-muted">
                        {new Date(m.created_at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-secondary">{m.text}</p>
                  </div>
                  <button
                    onClick={() => removeMessage(m.id)}
                    className="shrink-0 text-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-app p-4">
            <div className="flex gap-2">
              <Textarea
                rows={2}
                placeholder={`Nachricht in #${currentChannel?.name || ''}… (Enter zum Senden, Shift+Enter für neue Zeile)`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button onClick={handleSend} className="self-end" disabled={!activeChannel}>
                <Send size={16} />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
