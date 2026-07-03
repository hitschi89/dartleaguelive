import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';

// Sensitive, low-frequency data - fetched directly (RLS restricts it to the
// member themselves or a Teamchef) rather than cached in the shared
// offline-first engine used for everyday team data.
export function useEmergencyInfo(teamMemberId) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!teamMemberId) {
      setInfo(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('member_emergency_info')
      .select('*')
      .eq('team_member_id', teamMemberId)
      .maybeSingle();
    setInfo(data || null);
    setLoading(false);
  }, [teamMemberId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback(
    async (patch) => {
      const { error } = await supabase
        .from('member_emergency_info')
        .upsert({ team_member_id: teamMemberId, ...patch, updated_at: new Date().toISOString() });
      if (error) throw error;
      await reload();
    },
    [teamMemberId, reload]
  );

  return { info, loading, reload, save };
}
