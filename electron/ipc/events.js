const crypto = require('crypto');
const { ipcMain } = require('electron');
const { readCollection, writeCollection } = require('../db');

const COLLECTION = 'events';

function list() {
  return readCollection(COLLECTION, []);
}

function persist(items) {
  writeCollection(COLLECTION, items);
}

function register() {
  ipcMain.handle('events:list', () => list());

  ipcMain.handle('events:add', (_event, payload) => {
    const items = list();
    const record = {
      id: crypto.randomUUID(),
      title: payload.title,
      type: payload.type || 'other',
      start: payload.start,
      end: payload.end || payload.start,
      location: payload.location || '',
      notes: payload.notes || '',
      createdAt: new Date().toISOString(),
    };
    items.push(record);
    persist(items);
    return record;
  });

  ipcMain.handle('events:update', (_event, id, patch) => {
    const items = list();
    const idx = items.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...patch, id: items[idx].id };
    persist(items);
    return items[idx];
  });

  ipcMain.handle('events:remove', (_event, id) => {
    const items = list().filter((e) => e.id !== id);
    persist(items);
    return true;
  });
}

module.exports = { register };
