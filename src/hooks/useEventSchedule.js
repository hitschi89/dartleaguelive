import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSyncedCollection } from './useSyncedCollection.js';

const byTime = (a, b) => new Date(a.time) - new Date(b.time);

export function useEventSchedule(eventId) {
  const { team, user } = useAuth();
  const { items, loading, reload, add, update, remove } = useSyncedCollection('event_schedule_items', team?.id, {
    sort: byTime,
  });

  const eventItems = useMemo(() => items.filter((i) => i.event_id === eventId), [items, eventId]);

  const addItem = (payload) => add({ ...payload, event_id: eventId, created_by: user?.id });

  return { items: eventItems, loading, reload, addItem, updateItem: update, removeItem: remove };
}
