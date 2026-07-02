import { useCallback, useEffect, useState } from 'react';

export function useBulletins() {
  const [bulletins, setBulletins] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const list = await window.api.bulletins.list();
    setBulletins(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addBulletin = useCallback(
    async (payload) => {
      const record = await window.api.bulletins.add(payload);
      await reload();
      return record;
    },
    [reload]
  );

  const updateBulletin = useCallback(
    async (id, patch) => {
      await window.api.bulletins.update(id, patch);
      await reload();
    },
    [reload]
  );

  const toggleRead = useCallback(
    async (id, read) => {
      await window.api.bulletins.update(id, { read });
      await reload();
    },
    [reload]
  );

  const removeBulletin = useCallback(
    async (id) => {
      await window.api.bulletins.remove(id);
      await reload();
    },
    [reload]
  );

  return { bulletins, loading, reload, addBulletin, updateBulletin, toggleRead, removeBulletin };
}
