import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSyncedCollection } from './useSyncedCollection.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { exportText as platformExportText, exportPdf as platformExportPdf } from '../lib/platform.js';
import { pickFile } from '../lib/platform.js';
import { supabase } from '../lib/supabaseClient.js';

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
  const { locale } = useLanguage();
  const { items, loading, reload, add, remove } = useSyncedCollection('messages', team?.id, {
    sort: byDateAsc,
  });

  const pickImage = useCallback(() => pickFile({ extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }), []);

  // Images upload straight to Supabase Storage (needs to be online), same
  // pattern as document/bulletin attachments. The message row itself still
  // goes through the normal offline-friendly path.
  const addMessage = useCallback(
    async (channelId, text, { replyToId, imageFile } = {}) => {
      let image_path = null;
      if (imageFile) {
        if (!navigator.onLine) throw new Error('Bild-Uploads benötigen eine Internetverbindung.');
        const ext = imageFile.name.includes('.') ? imageFile.name.slice(imageFile.name.lastIndexOf('.')) : '';
        image_path = `${team.id}/chat/${crypto.randomUUID()}${ext}`;
        const { error: uploadError } = await supabase.storage.from('team-files').upload(image_path, imageFile, {
          contentType: imageFile.type || 'image/jpeg',
        });
        if (uploadError) throw uploadError;
      }

      return add({
        channel_id: channelId,
        author_id: user?.id,
        author_name: membership?.display_name || user?.email || 'Team',
        text: text || '',
        reply_to_id: replyToId || null,
        image_path,
      });
    },
    [add, user, membership, team]
  );

  const getImageUrl = useCallback(async (path) => {
    const { data, error } = await supabase.storage.from('team-files').createSignedUrl(path, 3600);
    if (error) throw error;
    return data.signedUrl;
  }, []);

  const exportText = useCallback(
    (messages, title) => {
      const content = messages
        .map((m) => `[${new Date(m.created_at).toLocaleString(locale)}] ${m.author_name}: ${m.text}`)
        .join('\n');
      return platformExportText(content, `${title || 'chat'}.txt`);
    },
    [locale]
  );

  const exportPdf = useCallback(
    (messages, title) => {
      const rowsHtml = messages
        .map(
          (m) => `<div style="margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #ddd;">
          <div style="font-size:11px;color:#666;">${new Date(m.created_at).toLocaleString(locale)} &middot; ${escapeHtml(m.author_name)}</div>
          <div style="font-size:13px;white-space:pre-wrap;">${escapeHtml(m.text)}</div>
        </div>`
        )
        .join('');
      return platformExportPdf({ title, rowsHtml, defaultName: `${title || 'chat'}.pdf` });
    },
    [locale]
  );

  return {
    messages: items,
    loading,
    reload,
    addMessage,
    removeMessage: remove,
    exportText,
    exportPdf,
    pickImage,
    getImageUrl,
  };
}
