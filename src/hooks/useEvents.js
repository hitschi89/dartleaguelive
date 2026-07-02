import { useCallback, useEffect, useState } from 'react';

export function useEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const list = await window.api.events.list();
    setEvents(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addEvent = useCallback(
    async (payload) => {
      const record = await window.api.events.add(payload);
      await reload();
      return record;
    },
    [reload]
  );

  const updateEvent = useCallback(
    async (id, patch) => {
      await window.api.events.update(id, patch);
      await reload();
    },
    [reload]
  );

  const removeEvent = useCallback(
    async (id) => {
      await window.api.events.remove(id);
      await reload();
    },
    [reload]
  );

  return { events, loading, reload, addEvent, updateEvent, removeEvent };
}
