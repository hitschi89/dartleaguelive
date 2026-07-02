import { useCallback, useEffect, useState } from 'react';

export function useTeam() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const list = await window.api.team.list();
    setMembers(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addMember = useCallback(
    async (payload) => {
      const record = await window.api.team.add(payload);
      await reload();
      return record;
    },
    [reload]
  );

  const updateMember = useCallback(
    async (id, patch) => {
      await window.api.team.update(id, patch);
      await reload();
    },
    [reload]
  );

  const removeMember = useCallback(
    async (id) => {
      await window.api.team.remove(id);
      await reload();
    },
    [reload]
  );

  return { members, loading, reload, addMember, updateMember, removeMember };
}
