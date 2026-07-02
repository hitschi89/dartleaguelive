import { useAuth } from '../context/AuthContext.jsx';
import { useSyncedCollection } from './useSyncedCollection.js';

const byName = (a, b) => a.display_name.localeCompare(b.display_name);

export function useTeam() {
  const { team } = useAuth();
  const { items, loading, reload, update, remove } = useSyncedCollection('team_members', team?.id, {
    sort: byName,
  });

  return { members: items, loading, reload, updateMember: update, removeMember: remove };
}
