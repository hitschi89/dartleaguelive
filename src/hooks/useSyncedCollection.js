import { useCallback, useEffect, useState } from 'react';
import { getAllByTeam, getOne } from '../lib/localDb.js';
import { onChange, writeRow, softDeleteRow } from '../lib/sync.js';

// Generic offline-first collection hook: reads from the local IndexedDB
// cache (always available, even offline) and writes optimistically through
// src/lib/sync.js, which queues the change for Supabase and reconciles
// later. Used by every module (documents, events, bulletins, team, chat) so
// they all share one sync/conflict story.
export function useSyncedCollection(table, teamId, { sort } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!teamId) {
      setItems([]);
      setLoading(false);
      return;
    }
    const rows = await getAllByTeam(table, teamId);
    setItems(sort ? [...rows].sort(sort) : rows);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, teamId]);

  useEffect(() => {
    reload();
    return onChange(table, reload);
  }, [reload, table]);

  const add = useCallback(
    async (row) => {
      const id = row.id || crypto.randomUUID();
      return writeRow(table, { ...row, id, team_id: teamId });
    },
    [table, teamId]
  );

  const update = useCallback(
    async (id, patch) => {
      const existing = await getOne(table, id);
      return writeRow(table, { ...existing, ...patch });
    },
    [table]
  );

  const remove = useCallback((id) => softDeleteRow(table, id), [table]);

  return { items, loading, reload, add, update, remove };
}
