import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSyncedCollection } from './useSyncedCollection.js';
import { putLocal } from '../lib/localDb.js';
import { supabase } from '../lib/supabaseClient.js';

const KIND_ORDER = { general: 0, event: 1, custom: 2 };
const byKindThenName = (a, b) => {
  if (a.kind !== b.kind) return (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9);
  return a.name.localeCompare(b.name);
};

export function useChannels() {
  const { team, user } = useAuth();
  const { items, loading, reload, remove } = useSyncedCollection('channels', team?.id, {
    sort: byKindThenName,
  });

  // Custom channels need an explicit member list, so both the channel and
  // its membership rows are inserted directly (awaited, in order) rather
  // than through the optimistic outbox: channel_members.channel_id has a
  // foreign key on channels(id), and the outbox pushes in the background,
  // so we can't guarantee the channel row exists server-side yet by the
  // time a queued channel_members insert would go out.
  const addCustomChannel = useCallback(
    async ({ name, memberUserIds }) => {
      const channelId = crypto.randomUUID();
      const channelRow = {
        id: channelId,
        team_id: team.id,
        name,
        kind: 'custom',
        created_by: user.id,
      };
      const { error: channelError } = await supabase.from('channels').insert(channelRow);
      if (channelError) throw channelError;
      await putLocal('channels', { ...channelRow, created_at: new Date().toISOString() });

      const uniqueUserIds = [...new Set([user.id, ...memberUserIds])];
      const { error: memberError } = await supabase
        .from('channel_members')
        .insert(uniqueUserIds.map((userId) => ({ channel_id: channelId, user_id: userId })));
      if (memberError) throw memberError;

      await reload();
      return channelId;
    },
    [team, user, reload]
  );

  return { channels: items, loading, reload, addCustomChannel, removeChannel: remove };
}
