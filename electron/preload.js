const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('api', {
  documents: {
    list: invoke('documents:list'),
    pickFiles: invoke('documents:pickFiles'),
    add: invoke('documents:add'),
    update: invoke('documents:update'),
    remove: invoke('documents:remove'),
    read: invoke('documents:read'),
  },
  bulletins: {
    list: invoke('bulletins:list'),
    add: invoke('bulletins:add'),
    update: invoke('bulletins:update'),
    remove: invoke('bulletins:remove'),
  },
  messages: {
    list: invoke('messages:list'),
    add: invoke('messages:add'),
    remove: invoke('messages:remove'),
    exportText: invoke('messages:exportText'),
    exportPdf: invoke('messages:exportPdf'),
  },
  events: {
    list: invoke('events:list'),
    add: invoke('events:add'),
    update: invoke('events:update'),
    remove: invoke('events:remove'),
  },
  team: {
    list: invoke('team:list'),
    add: invoke('team:add'),
    update: invoke('team:update'),
    remove: invoke('team:remove'),
  },
  settings: {
    get: invoke('settings:get'),
    update: invoke('settings:update'),
    pickLogo: invoke('settings:pickLogo'),
    readLogo: invoke('settings:readLogo'),
    openDataFolder: invoke('settings:openDataFolder'),
    exportBackup: invoke('settings:exportBackup'),
    importBackup: invoke('settings:importBackup'),
  },
});
