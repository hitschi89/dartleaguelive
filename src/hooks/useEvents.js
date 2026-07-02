import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSyncedCollection } from './useSyncedCollection.js';
import { writeRow } from '../lib/sync.js';
import { supabase } from '../lib/supabaseClient.js';
import { deterministicUuid, sha256Hex } from '../lib/calendarImport.js';

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

  // Bulk-imports events from a parsed calendar (ICS feed or pasted text).
  // Each event gets a deterministic id derived from its external uid, so
  // re-importing the same feed updates existing rows instead of duplicating
  // them (upsert on the team_id+external_uid unique constraint).
  const importEvents = useCallback(
    async (parsedEvents) => {
      if (!parsedEvents.length) return;
      const rows = await Promise.all(
        parsedEvents.map(async (ev) => {
          const uid = ev.externalUid || (await sha256Hex(`${ev.title}|${ev.start}`));
          return {
            id: await deterministicUuid(`${team.id}|${uid}`),
            team_id: team.id,
            title: ev.title,
            type: ev.type || 'race',
            start: ev.start,
            end: ev.end || ev.start,
            location: ev.location || '',
            notes: '',
            source: 'import',
            external_uid: uid,
            created_by: user?.id,
          };
        })
      );
      const { error } = await supabase.from('events').upsert(rows, { onConflict: 'team_id,external_uid' });
      if (error) throw error;
      await reload();
    },
    [team, user, reload]
  );

  return { events: items, loading, reload, addEvent, updateEvent: update, removeEvent: remove, importEvents };
}
