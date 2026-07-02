import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSyncedCollection } from './useSyncedCollection.js';
import { supabase } from '../lib/supabaseClient.js';
import { pickFile as platformPickFile } from '../lib/platform.js';

const byDateDesc = (a, b) => new Date(b.added_at) - new Date(a.added_at);

export function useDocuments() {
  const { team, user } = useAuth();
  const { items, loading, reload, remove, update } = useSyncedCollection('documents', team?.id, {
    sort: byDateDesc,
  });

  const pickFiles = useCallback(async () => {
    const file = await platformPickFile({
      extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'txt'],
    });
    return file ? [file] : [];
  }, []);

  // Uploads go straight to Supabase Storage (not queued offline) - binary
  // sync is out of scope for the MVP's offline mode, only metadata is cached.
  const addDocument = useCallback(
    async ({ file, category, tags }) => {
      if (!navigator.onLine) throw new Error('Datei-Uploads benötigen eine Internetverbindung.');
      const id = crypto.randomUUID();
      const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '';
      const storagePath = `${team.id}/documents/${id}${ext}`;

      const { error: uploadError } = await supabase.storage.from('team-files').upload(storagePath, file, {
        contentType: file.type || 'application/octet-stream',
      });
      if (uploadError) throw uploadError;

      const { error } = await supabase.from('documents').insert({
        id,
        team_id: team.id,
        file_name: file.name,
        storage_path: storagePath,
        category: category || 'Sonstiges',
        tags: tags || [],
        size: file.size,
        added_by: user.id,
      });
      if (error) throw error;
      await reload();
    },
    [team, user, reload]
  );

  const readDocument = useCallback(async (id) => {
    const doc = items.find((d) => d.id === id);
    if (!doc) return null;
    const { data, error } = await supabase.storage.from('team-files').createSignedUrl(doc.storage_path, 3600);
    if (error) throw error;
    return { url: data.signedUrl, fileName: doc.file_name };
  }, [items]);

  const removeDocument = useCallback(
    async (id) => {
      const doc = items.find((d) => d.id === id);
      await remove(id);
      if (doc) await supabase.storage.from('team-files').remove([doc.storage_path]);
    },
    [items, remove]
  );

  return {
    documents: items,
    loading,
    reload,
    pickFiles,
    addDocument,
    updateDocument: update,
    removeDocument,
    readDocument,
  };
}
