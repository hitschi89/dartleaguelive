import { useAuth } from '../context/AuthContext.jsx';
import { useSyncedCollection } from './useSyncedCollection.js';

const byKindThenName = (a, b) => {
  if (a.kind !== b.kind) return a.kind === 'general' ? -1 : 1;
  return a.name.localeCompare(b.name);
};

export function useChannels() {
  const { team } = useAuth();
  const { items, loading, reload, add, remove } = useSyncedCollection('channels', team?.id, {
    sort: byKindThenName,
  });

  return { channels: items, loading, reload, addChannel: add, removeChannel: remove };
}
