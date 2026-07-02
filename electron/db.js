const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Simple JSON-file "collection" store. Kept behind a small API so the
// storage engine (JSON now, SQLite later) can be swapped without touching
// the IPC handlers or renderer code.

function dataDir() {
  const dir = path.join(app.getPath('userData'), 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function filesDir(...segments) {
  const dir = path.join(app.getPath('userData'), 'files', ...segments);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function collectionPath(name) {
  return path.join(dataDir(), `${name}.json`);
}

function readCollection(name, defaultValue) {
  const file = collectionPath(name);
  if (!fs.existsSync(file)) {
    writeCollection(name, defaultValue);
    return JSON.parse(JSON.stringify(defaultValue));
  }
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to read collection ${name}:`, err);
    return JSON.parse(JSON.stringify(defaultValue));
  }
}

function writeCollection(name, value) {
  const file = collectionPath(name);
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf-8');
}

module.exports = { dataDir, filesDir, readCollection, writeCollection };
