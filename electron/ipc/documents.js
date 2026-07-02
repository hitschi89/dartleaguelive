const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ipcMain, dialog } = require('electron');
const { readCollection, writeCollection, filesDir } = require('../db');

const COLLECTION = 'documents';

const MIME_TYPES = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.txt': 'text/plain',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function mimeFor(ext) {
  return MIME_TYPES[ext.toLowerCase()] || 'application/octet-stream';
}

function list() {
  return readCollection(COLLECTION, []);
}

function persist(docs) {
  writeCollection(COLLECTION, docs);
}

function register(getMainWindow) {
  ipcMain.handle('documents:list', () => list());

  ipcMain.handle('documents:pickFiles', async () => {
    const win = getMainWindow();
    const result = await dialog.showOpenDialog(win, {
      title: 'Dokumente auswählen',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Dokumente', extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'txt'] },
        { name: 'Alle Dateien', extensions: ['*'] },
      ],
    });
    if (result.canceled) return [];
    return result.filePaths.map((filePath) => {
      const stat = fs.statSync(filePath);
      return { filePath, name: path.basename(filePath), size: stat.size };
    });
  });

  ipcMain.handle('documents:add', (_event, { filePath, originalName, category, tags }) => {
    const ext = path.extname(originalName || filePath);
    const id = crypto.randomUUID();
    const storedName = `${id}${ext}`;
    const destDir = filesDir('documents');
    const destPath = path.join(destDir, storedName);
    fs.copyFileSync(filePath, destPath);
    const stat = fs.statSync(destPath);

    const docs = list();
    const record = {
      id,
      fileName: originalName || path.basename(filePath),
      storedName,
      category: category || 'Sonstiges',
      tags: Array.isArray(tags) ? tags : [],
      size: stat.size,
      addedAt: new Date().toISOString(),
    };
    docs.unshift(record);
    persist(docs);
    return record;
  });

  ipcMain.handle('documents:update', (_event, id, patch) => {
    const docs = list();
    const idx = docs.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    docs[idx] = { ...docs[idx], ...patch, id: docs[idx].id };
    persist(docs);
    return docs[idx];
  });

  ipcMain.handle('documents:remove', (_event, id) => {
    const docs = list();
    const idx = docs.findIndex((d) => d.id === id);
    if (idx === -1) return false;
    const [removed] = docs.splice(idx, 1);
    persist(docs);
    try {
      const filePath = path.join(filesDir('documents'), removed.storedName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err) {
      console.error('Failed to delete document file:', err);
    }
    return true;
  });

  ipcMain.handle('documents:read', (_event, id) => {
    const docs = list();
    const doc = docs.find((d) => d.id === id);
    if (!doc) return null;
    const filePath = path.join(filesDir('documents'), doc.storedName);
    if (!fs.existsSync(filePath)) return null;
    const buffer = fs.readFileSync(filePath);
    return {
      data: buffer.toString('base64'),
      mime: mimeFor(path.extname(doc.storedName)),
      fileName: doc.fileName,
    };
  });
}

module.exports = { register };
