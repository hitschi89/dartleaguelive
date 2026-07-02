const crypto = require('crypto');
const { ipcMain } = require('electron');
const { readCollection, writeCollection } = require('../db');

const COLLECTION = 'team';

function list() {
  return readCollection(COLLECTION, []);
}

function persist(items) {
  writeCollection(COLLECTION, items);
}

function register() {
  ipcMain.handle('team:list', () => list());

  ipcMain.handle('team:add', (_event, payload) => {
    const items = list();
    const record = {
      id: crypto.randomUUID(),
      name: payload.name,
      role: payload.role || 'Mitglied',
      email: payload.email || '',
      phone: payload.phone || '',
      notes: payload.notes || '',
      createdAt: new Date().toISOString(),
    };
    items.push(record);
    persist(items);
    return record;
  });

  ipcMain.handle('team:update', (_event, id, patch) => {
    const items = list();
    const idx = items.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...patch, id: items[idx].id };
    persist(items);
    return items[idx];
  });

  ipcMain.handle('team:remove', (_event, id) => {
    const items = list().filter((m) => m.id !== id);
    persist(items);
    return true;
  });
}

module.exports = { register };
