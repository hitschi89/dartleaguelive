import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSyncedCollection } from './useSyncedCollection.js';
import { supabase } from '../lib/supabaseClient.js';

const byName = (a, b) => a.name.localeCompare(b.name);

export function useSeries() {
  const { team, user } = useAuth();
  const { items, loading, reload, add, update, remove } = useSyncedCollection('series', team?.id, {
    sort: byName,
  });

  const addSeries = (payload) => add({ ...payload, created_by: user?.id });

  // series_members is a lightweight join table (like channel_members) -
  // fetched directly rather than through the offline sync engine.
  const [membersBySeries, setMembersBySeries] = useState({});

  const reloadSeriesMembers = useCallback(async () => {
    if (!items.length) {
      setMembersBySeries({});
      return;
    }
    const { data, error } = await supabase
      .from('series_members')
      .select('series_id, team_member_id')
      .in('series_id', items.map((s) => s.id));
    if (error || !data) return;
    const grouped = {};
    for (const row of data) {
      if (!grouped[row.series_id]) grouped[row.series_id] = [];
      grouped[row.series_id].push(row.team_member_id);
    }
    setMembersBySeries(grouped);
  }, [items]);

  useEffect(() => {
    reloadSeriesMembers();
  }, [reloadSeriesMembers]);

  const setSeriesMembers = useCallback(
    async (seriesId, teamMemberIds) => {
      const { error: delError } = await supabase.from('series_members').delete().eq('series_id', seriesId);
      if (delError) throw delError;
      if (teamMemberIds.length) {
        const { error: insError } = await supabase
          .from('series_members')
          .insert(teamMemberIds.map((teamMemberId) => ({ series_id: seriesId, team_member_id: teamMemberId })));
        if (insError) throw insError;
      }
      await reloadSeriesMembers();
    },
    [reloadSeriesMembers]
  );

  return {
    series: items,
    loading,
    reload,
    addSeries,
    updateSeries: update,
    removeSeries: remove,
    membersBySeries,
    setSeriesMembers,
  };
}
