const path = require('path');
const { app, BrowserWindow } = require('electron');

const documents = require('./ipc/documents');
const bulletins = require('./ipc/bulletins');
const messages = require('./ipc/messages');
const events = require('./ipc/events');
const team = require('./ipc/team');
const settings = require('./ipc/settings');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow = null;
const getMainWindow = () => mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f1115',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpcHandlers() {
  documents.register(getMainWindow);
  bulletins.register(getMainWindow);
  messages.register(getMainWindow);
  events.register(getMainWindow);
  team.register(getMainWindow);
  settings.register(getMainWindow);
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
