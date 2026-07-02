import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSyncedCollection } from './useSyncedCollection.js';
import { supabase } from '../lib/supabaseClient.js';
import { notify } from '../lib/platform.js';

const byDateDesc = (a, b) => new Date(b.date) - new Date(a.date);

function readsKey(userId) {
  return `pitwall.reads.${userId}`;
}

function loadLocalReads(userId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(readsKey(userId)) || '[]'));
  } catch {
    return new Set();
  }
}

function saveLocalReads(userId, set) {
  localStorage.setItem(readsKey(userId), JSON.stringify([...set]));
}

// bulletin_reads is per-user and intentionally kept outside the generic
// outbox/sync engine (no updated_at/soft-delete semantics) - read state is
// cached in localStorage for instant offline toggling and reconciled with
// Supabase opportunistically.
export function useBulletins() {
  const { team, user } = useAuth();
  const { items, loading, reload, add, update, remove } = useSyncedCollection('bulletins', team?.id, {
    sort: byDateDesc,
  });
  const [readIds, setReadIds] = useState(() => (user ? loadLocalReads(user.id) : new Set()));

  useEffect(() => {
    if (!user) return;
    setReadIds(loadLocalReads(user.id));
    if (!navigator.onLine) return;
    supabase
      .from('bulletin_reads')
      .select('bulletin_id')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (error || !data) return;
        setReadIds((prev) => {
          const next = new Set(prev);
          data.forEach((r) => next.add(r.bulletin_id));
          saveLocalReads(user.id, next);
          return next;
        });
      });
  }, [user]);

  const toggleRead = useCallback(
    async (id, read) => {
      setReadIds((prev) => {
        const next = new Set(prev);
        if (read) next.add(id);
        else next.delete(id);
        saveLocalReads(user.id, next);
        return next;
      });
      if (!navigator.onLine) return;
      try {
        if (read) {
          await supabase.from('bulletin_reads').upsert({ bulletin_id: id, user_id: user.id });
        } else {
          await supabase.from('bulletin_reads').delete().eq('bulletin_id', id).eq('user_id', user.id);
        }
      } catch (err) {
        console.error('Konnte Lesestatus nicht synchronisieren', err);
      }
    },
    [user]
  );

  const addBulletin = useCallback(
    async (payload) => {
      const record = await add({ ...payload, created_by: user?.id });
      if (record.priority === 'dringend') {
        notify(`Dringendes Bulletin: ${record.title}`, record.source ? `Quelle: ${record.source}` : 'Neues wichtiges Bulletin');
      }
      return record;
    },
    [add, user]
  );

  const bulletins = useMemo(
    () => items.map((b) => ({ ...b, read: readIds.has(b.id) })),
    [items, readIds]
  );

  return {
    bulletins,
    loading,
    reload,
    addBulletin,
    updateBulletin: update,
    toggleRead,
    removeBulletin: remove,
  };
}
