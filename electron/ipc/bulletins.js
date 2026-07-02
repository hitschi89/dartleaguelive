const crypto = require('crypto');
const { ipcMain, Notification } = require('electron');
const { readCollection, writeCollection } = require('../db');

const COLLECTION = 'bulletins';

function list() {
  return readCollection(COLLECTION, []);
}

function persist(items) {
  writeCollection(COLLECTION, items);
}

function register() {
  ipcMain.handle('bulletins:list', () => list());

  ipcMain.handle('bulletins:add', (_event, payload) => {
    const items = list();
    const record = {
      id: crypto.randomUUID(),
      title: payload.title,
      source: payload.source || '',
      category: payload.category || 'Allgemein',
      priority: payload.priority || 'info',
      date: payload.date || new Date().toISOString(),
      body: payload.body || '',
      eventId: payload.eventId || null,
      read: false,
      createdAt: new Date().toISOString(),
    };
    items.unshift(record);
    persist(items);

    if (record.priority === 'dringend' && Notification.isSupported()) {
      new Notification({
        title: `Dringendes Bulletin: ${record.title}`,
        body: record.source ? `Quelle: ${record.source}` : 'Neues wichtiges Bulletin',
      }).show();
    }
    return record;
  });

  ipcMain.handle('bulletins:update', (_event, id, patch) => {
    const items = list();
    const idx = items.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...patch, id: items[idx].id };
    persist(items);
    return items[idx];
  });

  ipcMain.handle('bulletins:remove', (_event, id) => {
    const items = list().filter((b) => b.id !== id);
    persist(items);
    return true;
  });
}

module.exports = { register };
