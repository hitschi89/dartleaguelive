import { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Send, Trash2, FileDown, FileText } from 'lucide-react';
import { useMessages } from '../hooks/useMessages.js';
import { useEvents } from '../hooks/useEvents.js';
import { Card, PageHeader, Button, Input, Textarea, Select, EmptyState } from '../components/ui.jsx';

export default function Communication() {
  const { messages, loading, addMessage, removeMessage, exportText, exportPdf } = useMessages();
  const { events } = useEvents();
  const [eventFilter, setEventFilter] = useState('alle');
  const [author, setAuthor] = useState(() => localStorage.getItem('pitwall.author') || '');
  const [text, setText] = useState('');
  const [targetEvent, setTargetEvent] = useState('');

  useEffect(() => {
    localStorage.setItem('pitwall.author', author);
  }, [author]);

  const filtered = useMemo(() => {
    if (eventFilter === 'alle') return messages;
    if (eventFilter === 'allgemein') return messages.filter((m) => !m.eventId);
    return messages.filter((m) => m.eventId === eventFilter);
  }, [messages, eventFilter]);

  const eventTitle = (id) => events.find((e) => e.id === id)?.title;

  const handleSend = async () => {
    if (!text.trim()) return;
    await addMessage({ author: author.trim() || 'Team', text: text.trim(), eventId: targetEvent || null });
    setText('');
  };

  const currentTitle =
    eventFilter === 'alle' ? 'Alle Nachrichten' : eventFilter === 'allgemein' ? 'Allgemein' : eventTitle(eventFilter);

  return (
    <div>
      <PageHeader
        title="Kommunikation"
        subtitle="Interner Notiz- und Nachrichtenbereich für dein Team."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => exportText({ messages: filtered, title: currentTitle })}>
              <FileText size={16} /> Als Text
            </Button>
            <Button variant="secondary" onClick={() => exportPdf({ messages: filtered, title: currentTitle })}>
              <FileDown size={16} /> Als PDF
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { key: 'alle', label: 'Alle' },
          { key: 'allgemein', label: 'Allgemein' },
          ...events.map((e) => ({ key: e.id, label: e.title })),
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setEventFilter(f.key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              eventFilter === f.key ? 'border-accent bg-accent/15 text-accent' : 'border-app text-secondary hover-app'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card className="mb-4 flex h-[50vh] flex-col overflow-hidden p-0">
        <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin p-5">
          {loading ? (
            <p className="text-sm text-muted">Lade Nachrichten…</p>
          ) : filtered.length === 0 ? (
            <EmptyState icon={MessageSquare} title="Noch keine Nachrichten" description="Starte die Team-Kommunikation." />
          ) : (
            filtered.map((m) => (
              <div key={m.id} className="group flex items-start justify-between gap-3 rounded-lg bg-card-alt p-3">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-primary">{m.author}</span>
                    <span className="text-xs text-muted">
                      {new Date(m.createdAt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    {m.eventId && eventTitle(m.eventId) && (
                      <span className="text-xs text-accent">· {eventTitle(m.eventId)}</span>
                    )}
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
          <div className="mb-2 flex gap-2">
            <Input
              className="max-w-[160px]"
              placeholder="Dein Name"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
            <Select className="max-w-[220px]" value={targetEvent} onChange={(e) => setTargetEvent(e.target.value)}>
              <option value="">Kein Event zuordnen</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2">
            <Textarea
              rows={2}
              placeholder="Nachricht schreiben… (Enter zum Senden, Shift+Enter für neue Zeile)"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button onClick={handleSend} className="self-end">
              <Send size={16} />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
