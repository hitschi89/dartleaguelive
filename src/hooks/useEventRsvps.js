import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabaseClient.js';

// RSVPs are visible team-wide (for headcount planning) but only editable by
// their own owner, so this is fetched directly rather than through the
// per-device offline cache used for the rest of the app's data.
export function useEventRsvps(eventId) {
  const { user } = useAuth();
  const [rsvps, setRsvps] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!eventId) {
      setRsvps([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.from('event_rsvps').select('*').eq('event_id', eventId);
    if (!error) setRsvps(data || []);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const myStatus = rsvps.find((r) => r.user_id === user?.id)?.status || null;

  const setMyStatus = useCallback(
    async (status) => {
      const { error } = await supabase
        .from('event_rsvps')
        .upsert({ event_id: eventId, user_id: user.id, status, responded_at: new Date().toISOString() });
      if (error) throw error;
      await reload();
    },
    [eventId, user, reload]
  );

  return { rsvps, loading, reload, myStatus, setMyStatus };
}
