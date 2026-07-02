// Centralizes the small set of things that differ between running inside
// Electron (desktop) and running as a plain browser tab / installed PWA
// (mobile), so pages don't need their own platform branches.

export const isElectron = typeof window !== 'undefined' && Boolean(window.api);

function base64ToFile(base64, name, mime) {
  const byteChars = atob(base64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
  return new File([bytes], name, { type: mime });
}

// Resolves to a standard browser File (or null if cancelled), regardless of
// whether the file came from Electron's native dialog or an <input type=file>.
export async function pickFile({ extensions } = {}) {
  if (isElectron) {
    const result = await window.api.native.pickFile({ extensions });
    if (!result) return null;
    return base64ToFile(result.data, result.name, result.mime);
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (extensions?.length) input.accept = extensions.map((ext) => `.${ext}`).join(',');
    input.onchange = () => resolve(input.files?.[0] || null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export async function notify(title, body) {
  if (isElectron) {
    await window.api.native.notify({ title, body });
    return;
  }
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body });
  } else if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') new Notification(title, { body });
  }
}

export async function exportText(content, defaultName) {
  if (isElectron) {
    return window.api.native.saveTextFile({ content, defaultName });
  }
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultName || 'export.txt';
  a.click();
  URL.revokeObjectURL(url);
  return { canceled: false };
}

export async function exportPdf({ title, rowsHtml, defaultName }) {
  if (isElectron) {
    return window.api.native.exportHtmlAsPdf({ title, rowsHtml, defaultName });
  }
  const printWindow = window.open('', '_blank');
  if (!printWindow) return { canceled: true };
  printWindow.document.write(`<!doctype html><html><head><title>${title || 'Export'}</title><style>
    body{font-family:Arial,sans-serif;color:#111;padding:24px;}
    h1{font-size:18px;margin-bottom:16px;}
  </style></head><body><h1>${title || 'Export'}</h1>${rowsHtml}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  return { canceled: false };
}
