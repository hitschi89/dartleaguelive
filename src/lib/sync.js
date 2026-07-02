import { supabase } from './supabaseClient.js';
import {
  getAllByTeam,
  getOne,
  putLocal,
  enqueueOutbox,
  getOutbox,
  removeFromOutbox,
  getMeta,
  setMeta,
} from './localDb.js';

// Tables kept in sync via the generic outbox/pull engine. bulletin_reads is
// deliberately excluded - it's a simple per-user marker table without
// updated_at/soft-delete semantics, handled directly where it's used.
export const SYNCED_TABLES = ['team_members', 'documents', 'events', 'bulletins', 'channels', 'messages', 'tasks'];

const listeners = new Map();

export function onChange(table, callback) {
  if (!listeners.has(table)) listeners.set(table, new Set());
  listeners.get(table).add(callback);
  return () => listeners.get(table)?.delete(callback);
}

function emitChange(table) {
  listeners.get(table)?.forEach((cb) => cb());
}

// Optimistic local write: applied to the cache immediately and queued for
// the server. Conflict rule is last-write-wins by updated_at - acceptable
// for a team-sized app, not a full CRDT merge.
export async function writeRow(table, row) {
  const now = new Date().toISOString();
  const payload = { ...row, updated_at: now };
  await putLocal(table, payload);
  emitChange(table);
  await enqueueOutbox({ id: crypto.randomUUID(), table, payload, createdAt: Date.now() });
  drainOutbox();
  return payload;
}

export async function softDeleteRow(table, id) {
  const existing = await getOne(table, id);
  if (!existing) return;
  await writeRow(table, { ...existing, deleted_at: new Date().toISOString() });
}

let draining = false;

export async function drainOutbox() {
  if (draining || typeof navigator !== 'undefined' && !navigator.onLine) return;
  draining = true;
  try {
    const entries = await getOutbox();
    for (const entry of entries) {
      const { data, error } = await supabase.from(entry.table).upsert(entry.payload).select().single();
      if (error) {
        console.error(`Sync: push failed for ${entry.table}`, error.message);
        break;
      }
      await putLocal(entry.table, data);
      await removeFromOutbox(entry.id);
      emitChange(entry.table);
    }
  } finally {
    draining = false;
  }
}

async function pendingIdsForTable(table) {
  const entries = await getOutbox();
  return new Set(entries.filter((e) => e.table === table).map((e) => e.payload.id));
}

export async function pullTable(table, teamId) {
  const metaKey = `${table}:${teamId}`;
  const since = (await getMeta(metaKey)) || '1970-01-01T00:00:00Z';
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('team_id', teamId)
    .gt('updated_at', since)
    .order('updated_at', { ascending: true });

  if (error) {
    console.error(`Sync: pull failed for ${table}`, error.message);
    return;
  }
  if (!data || data.length === 0) return;

  const pendingIds = await pendingIdsForTable(table);
  let latest = since;
  for (const row of data) {
    if (!pendingIds.has(row.id)) {
      await putLocal(table, row);
    }
    if (row.updated_at > latest) latest = row.updated_at;
  }
  await setMeta(metaKey, latest);
  emitChange(table);
}

export async function runSyncCycle(teamId) {
  await drainOutbox();
  await Promise.all(SYNCED_TABLES.map((table) => pullTable(table, teamId)));
}

let activeSync = null;

export function startSync(teamId) {
  if (activeSync?.teamId === teamId) return activeSync.stop;
  activeSync?.stop();

  runSyncCycle(teamId);

  const interval = setInterval(() => {
    if (navigator.onLine) runSyncCycle(teamId);
  }, 20000);

  const onOnline = () => runSyncCycle(teamId);
  window.addEventListener('online', onOnline);

  const channel = supabase.channel(`team-sync:${teamId}`);
  for (const table of SYNCED_TABLES) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `team_id=eq.${teamId}` },
      async (payload) => {
        const pendingIds = await pendingIdsForTable(table);
        if (payload.eventType === 'DELETE') return;
        const row = payload.new;
        if (row && !pendingIds.has(row.id)) {
          await putLocal(table, row);
          emitChange(table);
        }
      }
    );
  }
  channel.subscribe();

  const stop = () => {
    clearInterval(interval);
    window.removeEventListener('online', onOnline);
    supabase.removeChannel(channel);
    activeSync = null;
  };

  activeSync = { teamId, stop };
  return stop;
}

export { getAllByTeam };
