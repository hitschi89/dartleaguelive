import { useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSyncedCollection } from './useSyncedCollection.js';

const byPosition = (a, b) => (a.position || 0) - (b.position || 0);

// Passing eventId = null gives you the reusable template list (items not
// tied to any specific event); passing an event id gives that event's own
// checklist, which can be seeded from the template via copyTemplateToEvent.
export function useChecklist(eventId) {
  const { team, user } = useAuth();
  const { items: allItems, loading, reload, add, update, remove } = useSyncedCollection(
    'checklist_items',
    team?.id,
    { sort: byPosition }
  );

  const templateItems = useMemo(() => allItems.filter((i) => !i.event_id), [allItems]);
  const eventItems = useMemo(() => allItems.filter((i) => i.event_id === eventId), [allItems, eventId]);
  const items = eventId ? eventItems : templateItems;

  const addItem = (title) =>
    add({ title, event_id: eventId || null, position: items.length, created_by: user?.id });

  const copyTemplateToEvent = useCallback(async () => {
    for (const item of templateItems) {
      await add({ title: item.title, event_id: eventId, position: item.position, created_by: user?.id });
    }
  }, [templateItems, eventId, add, user]);

  return { items, templateItems, loading, reload, addItem, updateItem: update, removeItem: remove, copyTemplateToEvent };
}
