import { useCallback, useEffect, useState } from 'react';

export function useMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const list = await window.api.messages.list();
    setMessages(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addMessage = useCallback(
    async (payload) => {
      const record = await window.api.messages.add(payload);
      await reload();
      return record;
    },
    [reload]
  );

  const removeMessage = useCallback(
    async (id) => {
      await window.api.messages.remove(id);
      await reload();
    },
    [reload]
  );

  const exportText = useCallback((payload) => window.api.messages.exportText(payload), []);
  const exportPdf = useCallback((payload) => window.api.messages.exportPdf(payload), []);

  return { messages, loading, reload, addMessage, removeMessage, exportText, exportPdf };
}
