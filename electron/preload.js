const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);

// PitWall's renderer talks to Supabase directly for all team data; this
// bridge only covers native OS conveniences a browser tab can't offer.
contextBridge.exposeInMainWorld('api', {
  native: {
    pickFile: invoke('native:pickFile'),
    notify: invoke('native:notify'),
    saveTextFile: invoke('native:saveTextFile'),
    exportHtmlAsPdf: invoke('native:exportHtmlAsPdf'),
    openExternal: invoke('native:openExternal'),
  },
});
