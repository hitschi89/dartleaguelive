import { openDB } from 'idb';

const DB_NAME = 'pitwall';
const DB_VERSION = 2; // bumped to add the 'tasks' store for existing browsers

export const TABLES = ['team_members', 'documents', 'events', 'bulletins', 'bulletin_reads', 'channels', 'messages', 'tasks'];

let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        for (const table of TABLES) {
          if (!db.objectStoreNames.contains(table)) {
            const store = db.createObjectStore(table, { keyPath: 'id' });
            store.createIndex('team_id', 'team_id');
          }
        }
        if (!db.objectStoreNames.contains('outbox')) {
          db.createObjectStore('outbox', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllByTeam(table, teamId) {
  const db = await getDb();
  const rows = await db.getAllFromIndex(table, 'team_id', teamId);
  return rows.filter((r) => !r.deleted_at);
}

export async function getOne(table, id) {
  const db = await getDb();
  return db.get(table, id);
}

export async function putLocal(table, row) {
  const db = await getDb();
  await db.put(table, row);
}

export async function putManyLocal(table, rows) {
  if (!rows.length) return;
  const db = await getDb();
  const tx = db.transaction(table, 'readwrite');
  await Promise.all(rows.map((row) => tx.store.put(row)));
  await tx.done;
}

export async function deleteLocal(table, id) {
  const db = await getDb();
  await db.delete(table, id);
}

export async function enqueueOutbox(entry) {
  const db = await getDb();
  await db.put('outbox', entry);
}

export async function getOutbox() {
  const db = await getDb();
  const all = await db.getAll('outbox');
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeFromOutbox(id) {
  const db = await getDb();
  await db.delete('outbox', id);
}

export async function getMeta(key) {
  const db = await getDb();
  const row = await db.get('meta', key);
  return row?.value;
}

export async function setMeta(key, value) {
  const db = await getDb();
  await db.put('meta', { key, value });
}
