const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ipcMain, dialog, shell, app } = require('electron');
const { readCollection, writeCollection, filesDir } = require('../db');

const COLLECTION = 'settings';
const ALL_COLLECTIONS = ['documents', 'bulletins', 'messages', 'events', 'team', 'settings'];

const DEFAULT_SETTINGS = {
  teamName: 'Mein Motorsport-Team',
  logoPath: null,
  theme: 'dark',
  accent: 'red',
  updatedAt: new Date().toISOString(),
};

function getSettings() {
  return readCollection(COLLECTION, DEFAULT_SETTINGS);
}

function register(getMainWindow) {
  ipcMain.handle('settings:get', () => getSettings());

  ipcMain.handle('settings:update', (_event, patch) => {
    const current = getSettings();
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    writeCollection(COLLECTION, next);
    return next;
  });

  ipcMain.handle('settings:pickLogo', async () => {
    const win = getMainWindow();
    const result = await dialog.showOpenDialog(win, {
      title: 'Logo auswählen',
      properties: ['openFile'],
      filters: [{ name: 'Bilder', extensions: ['png', 'jpg', 'jpeg', 'svg', 'gif'] }],
    });
    if (result.canceled) return null;
    const filePath = result.filePaths[0];
    const ext = path.extname(filePath);
    const destDir = filesDir('branding');
    const destName = `logo-${crypto.randomUUID()}${ext}`;
    const destPath = path.join(destDir, destName);
    fs.copyFileSync(filePath, destPath);

    const current = getSettings();
    if (current.logoPath) {
      const oldPath = path.join(destDir, current.logoPath);
      if (fs.existsSync(oldPath) && oldPath !== destPath) {
        try { fs.unlinkSync(oldPath); } catch (e) { /* ignore */ }
      }
    }
    const next = { ...current, logoPath: destName, updatedAt: new Date().toISOString() };
    writeCollection(COLLECTION, next);
    return next;
  });

  ipcMain.handle('settings:readLogo', () => {
    const current = getSettings();
    if (!current.logoPath) return null;
    const filePath = path.join(filesDir('branding'), current.logoPath);
    if (!fs.existsSync(filePath)) return null;
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    return { data: buffer.toString('base64'), mime };
  });

  ipcMain.handle('settings:openDataFolder', () => {
    shell.openPath(app.getPath('userData'));
  });

  ipcMain.handle('settings:exportBackup', async () => {
    const win = getMainWindow();
    const result = await dialog.showSaveDialog(win, {
      title: 'Backup exportieren',
      defaultPath: `pitwall-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'PitWall Backup', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };

    const bundle = { version: 1, exportedAt: new Date().toISOString(), data: {} };
    for (const name of ALL_COLLECTIONS) {
      bundle.data[name] = readCollection(name, name === 'settings' ? DEFAULT_SETTINGS : []);
    }
    fs.writeFileSync(result.filePath, JSON.stringify(bundle, null, 2), 'utf-8');
    return { canceled: false, filePath: result.filePath };
  });

  ipcMain.handle('settings:importBackup', async () => {
    const win = getMainWindow();
    const result = await dialog.showOpenDialog(win, {
      title: 'Backup importieren',
      properties: ['openFile'],
      filters: [{ name: 'PitWall Backup', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePaths.length) return { canceled: true };

    const raw = fs.readFileSync(result.filePaths[0], 'utf-8');
    const bundle = JSON.parse(raw);
    if (!bundle || !bundle.data) return { canceled: true, error: 'Ungültiges Backup' };

    for (const name of ALL_COLLECTIONS) {
      if (bundle.data[name] !== undefined) {
        writeCollection(name, bundle.data[name]);
      }
    }
    return { canceled: false };
  });
}

module.exports = { register, getSettings, DEFAULT_SETTINGS };
