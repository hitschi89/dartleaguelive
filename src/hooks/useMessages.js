import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSyncedCollection } from './useSyncedCollection.js';
import { exportText as platformExportText, exportPdf as platformExportPdf } from '../lib/platform.js';

const byDateAsc = (a, b) => new Date(a.created_at) - new Date(b.created_at);

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function useMessages() {
  const { team, membership, user } = useAuth();
  const { items, loading, reload, add, remove } = useSyncedCollection('messages', team?.id, {
    sort: byDateAsc,
  });

  const addMessage = useCallback(
    (channelId, text) =>
      add({
        channel_id: channelId,
        author_id: user?.id,
        author_name: membership?.display_name || user?.email || 'Team',
        text,
      }),
    [add, user, membership]
  );

  const exportText = useCallback((messages, title) => {
    const content = messages
      .map((m) => `[${new Date(m.created_at).toLocaleString('de-DE')}] ${m.author_name}: ${m.text}`)
      .join('\n');
    return platformExportText(content, `${title || 'nachrichten'}.txt`);
  }, []);

  const exportPdf = useCallback((messages, title) => {
    const rowsHtml = messages
      .map(
        (m) => `<div style="margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #ddd;">
          <div style="font-size:11px;color:#666;">${new Date(m.created_at).toLocaleString('de-DE')} &middot; ${escapeHtml(m.author_name)}</div>
          <div style="font-size:13px;white-space:pre-wrap;">${escapeHtml(m.text)}</div>
        </div>`
      )
      .join('');
    return platformExportPdf({ title, rowsHtml, defaultName: `${title || 'nachrichten'}.pdf` });
  }, []);

  return { messages: items, loading, reload, addMessage, removeMessage: remove, exportText, exportPdf };
}
