import { useAuth } from '../context/AuthContext.jsx';
import { useSyncedCollection } from './useSyncedCollection.js';
import { writeRow } from '../lib/sync.js';

const byStart = (a, b) => new Date(a.start) - new Date(b.start);

export function useEvents() {
  const { team, user } = useAuth();
  const { items, loading, reload, add, update, remove } = useSyncedCollection('events', team?.id, {
    sort: byStart,
  });

  const addEvent = async (payload) => {
    const event = await add({ ...payload, created_by: user?.id });
    // Every event gets its own chat channel automatically (Kanäle + Event-Chats).
    await writeRow('channels', {
      id: crypto.randomUUID(),
      team_id: team.id,
      name: event.title,
      kind: 'event',
      event_id: event.id,
    });
    return event;
  };

  return { events: items, loading, reload, addEvent, updateEvent: update, removeEvent: remove };
}
