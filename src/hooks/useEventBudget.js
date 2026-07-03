import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSyncedCollection } from './useSyncedCollection.js';

const byCreated = (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0);

export function useEventBudget(eventId) {
  const { team, user } = useAuth();
  const { items, loading, reload, add, update, remove } = useSyncedCollection('event_budget_items', team?.id, {
    sort: byCreated,
  });

  const eventItems = useMemo(() => items.filter((i) => i.event_id === eventId), [items, eventId]);
  const total = useMemo(() => eventItems.reduce((sum, i) => sum + Number(i.amount || 0), 0), [eventItems]);

  const addItem = (payload) => add({ ...payload, event_id: eventId, created_by: user?.id });

  return { items: eventItems, total, loading, reload, addItem, updateItem: update, removeItem: remove };
}
