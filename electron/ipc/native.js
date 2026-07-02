const fs = require('fs');
const path = require('path');
const { ipcMain, dialog, Notification, BrowserWindow, shell } = require('electron');

const MIME_TYPES = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function mimeFor(ext) {
  return MIME_TYPES[ext.toLowerCase()] || 'application/octet-stream';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// PitWall's Electron shell is intentionally thin: all team data lives in
// Supabase now, so main.js only exposes native OS conveniences that a
// browser tab can't offer (file dialogs, desktop notifications, PDF export).
function register(getMainWindow) {
  ipcMain.handle('native:pickFile', async (_event, { extensions } = {}) => {
    const win = getMainWindow();
    const result = await dialog.showOpenDialog(win, {
      title: 'Datei auswählen',
      properties: ['openFile'],
      filters: [
        { name: 'Dateien', extensions: extensions && extensions.length ? extensions : ['*'] },
        { name: 'Alle Dateien', extensions: ['*'] },
      ],
    });
    if (result.canceled || !result.filePaths.length) return null;
    const filePath = result.filePaths[0];
    const stat = fs.statSync(filePath);
    const buffer = fs.readFileSync(filePath);
    return {
      name: path.basename(filePath),
      size: stat.size,
      mime: mimeFor(path.extname(filePath)),
      data: buffer.toString('base64'),
    };
  });

  ipcMain.handle('native:notify', (_event, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  });

  ipcMain.handle('native:saveTextFile', async (_event, { content, defaultName }) => {
    const win = getMainWindow();
    const result = await dialog.showSaveDialog(win, {
      title: 'Exportieren',
      defaultPath: defaultName || 'export.txt',
      filters: [{ name: 'Textdatei', extensions: ['txt'] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return { canceled: false, filePath: result.filePath };
  });

  ipcMain.handle('native:exportHtmlAsPdf', async (_event, { title, rowsHtml, defaultName }) => {
    const win = getMainWindow();
    const result = await dialog.showSaveDialog(win, {
      title: 'Als PDF exportieren',
      defaultPath: defaultName || 'export.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };

    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      body{font-family:Arial,sans-serif;color:#111;padding:24px;}
      h1{font-size:18px;margin-bottom:16px;}
    </style></head><body><h1>${escapeHtml(title || 'Export')}</h1>${rowsHtml}</body></html>`;

    const pdfWindow = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const buffer = await pdfWindow.webContents.printToPDF({});
    pdfWindow.destroy();
    fs.writeFileSync(result.filePath, buffer);
    return { canceled: false, filePath: result.filePath };
  });

  ipcMain.handle('native:openExternal', (_event, url) => shell.openExternal(url));
}

module.exports = { register };
