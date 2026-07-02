import { useCallback, useEffect, useState } from 'react';

export function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const list = await window.api.documents.list();
    setDocuments(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const pickFiles = useCallback(() => window.api.documents.pickFiles(), []);

  const addDocument = useCallback(
    async (payload) => {
      const record = await window.api.documents.add(payload);
      await reload();
      return record;
    },
    [reload]
  );

  const updateDocument = useCallback(
    async (id, patch) => {
      await window.api.documents.update(id, patch);
      await reload();
    },
    [reload]
  );

  const removeDocument = useCallback(
    async (id) => {
      await window.api.documents.remove(id);
      await reload();
    },
    [reload]
  );

  const readDocument = useCallback((id) => window.api.documents.read(id), []);

  return { documents, loading, reload, pickFiles, addDocument, updateDocument, removeDocument, readDocument };
}
