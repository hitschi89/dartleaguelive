const fs = require('fs');
const crypto = require('crypto');
const { ipcMain, dialog, BrowserWindow } = require('electron');
const { readCollection, writeCollection } = require('../db');

const COLLECTION = 'messages';

function list() {
  return readCollection(COLLECTION, []);
}

function persist(items) {
  writeCollection(COLLECTION, items);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function register(getMainWindow) {
  ipcMain.handle('messages:list', () => list());

  ipcMain.handle('messages:add', (_event, payload) => {
    const items = list();
    const record = {
      id: crypto.randomUUID(),
      author: payload.author || 'Team',
      text: payload.text || '',
      eventId: payload.eventId || null,
      createdAt: new Date().toISOString(),
    };
    items.push(record);
    persist(items);
    return record;
  });

  ipcMain.handle('messages:remove', (_event, id) => {
    const items = list().filter((m) => m.id !== id);
    persist(items);
    return true;
  });

  ipcMain.handle('messages:exportText', async (_event, { messages, title }) => {
    const win = getMainWindow();
    const result = await dialog.showSaveDialog(win, {
      title: 'Nachrichten exportieren',
      defaultPath: `${title || 'nachrichten'}.txt`,
      filters: [{ name: 'Textdatei', extensions: ['txt'] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    const content = messages
      .map((m) => `[${new Date(m.createdAt).toLocaleString('de-DE')}] ${m.author}: ${m.text}`)
      .join('\n');
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return { canceled: false, filePath: result.filePath };
  });

  ipcMain.handle('messages:exportPdf', async (_event, { messages, title }) => {
    const win = getMainWindow();
    const result = await dialog.showSaveDialog(win, {
      title: 'Nachrichten als PDF exportieren',
      defaultPath: `${title || 'nachrichten'}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };

    const rows = messages
      .map(
        (m) => `<div style="margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #ddd;">
          <div style="font-size:11px;color:#666;">${escapeHtml(new Date(m.createdAt).toLocaleString('de-DE'))} &middot; ${escapeHtml(m.author)}</div>
          <div style="font-size:13px;white-space:pre-wrap;">${escapeHtml(m.text)}</div>
        </div>`
      )
      .join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      body{font-family:Arial,sans-serif;color:#111;padding:24px;}
      h1{font-size:18px;margin-bottom:16px;}
    </style></head><body><h1>${escapeHtml(title || 'Team-Nachrichten')}</h1>${rows}</body></html>`;

    const pdfWindow = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const buffer = await pdfWindow.webContents.printToPDF({});
    pdfWindow.destroy();
    fs.writeFileSync(result.filePath, buffer);
    return { canceled: false, filePath: result.filePath };
  });
}

module.exports = { register };
