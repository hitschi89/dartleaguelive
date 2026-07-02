import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSyncedCollection } from './useSyncedCollection.js';
import { supabase } from '../lib/supabaseClient.js';
import { notify, pickFile } from '../lib/platform.js';

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

  const pickAttachment = useCallback(() => pickFile({ extensions: ['pdf'] }), []);

  // Attachments upload straight to Supabase Storage (needs to be online),
  // same as documents. The bulletin row itself still goes through the
  // normal offline-friendly path once the upload (if any) has a path.
  const addBulletin = useCallback(
    async ({ file, ...payload }) => {
      let attachment_path = null;
      let attachment_name = null;
      if (file) {
        if (!navigator.onLine) throw new Error('PDF-Anhänge benötigen eine Internetverbindung.');
        const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '';
        attachment_path = `${team.id}/bulletins/${crypto.randomUUID()}${ext}`;
        const { error: uploadError } = await supabase.storage.from('team-files').upload(attachment_path, file, {
          contentType: file.type || 'application/pdf',
        });
        if (uploadError) throw uploadError;
        attachment_name = file.name;
      }

      const record = await add({ ...payload, attachment_path, attachment_name, created_by: user?.id });
      if (record.priority === 'dringend') {
        notify(`Dringendes Bulletin: ${record.title}`, record.source ? `Quelle: ${record.source}` : 'Neues wichtiges Bulletin');
      }
      return record;
    },
    [add, user, team]
  );

  const readAttachment = useCallback(
    async (id) => {
      const bulletin = items.find((b) => b.id === id);
      if (!bulletin?.attachment_path) return null;
      const { data, error } = await supabase.storage.from('team-files').createSignedUrl(bulletin.attachment_path, 3600);
      if (error) throw error;
      return { url: data.signedUrl, fileName: bulletin.attachment_name };
    },
    [items]
  );

  const removeBulletin = useCallback(
    async (id) => {
      const bulletin = items.find((b) => b.id === id);
      await remove(id);
      if (bulletin?.attachment_path) await supabase.storage.from('team-files').remove([bulletin.attachment_path]);
    },
    [items, remove]
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
    removeBulletin,
    pickAttachment,
    readAttachment,
  };
}
