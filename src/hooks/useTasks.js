import { useAuth } from '../context/AuthContext.jsx';
import { useSyncedCollection } from './useSyncedCollection.js';

const byDueDate = (a, b) => {
  if (!a.due_date && !b.due_date) return new Date(a.created_at || 0) - new Date(b.created_at || 0);
  if (!a.due_date) return 1;
  if (!b.due_date) return -1;
  return new Date(a.due_date) - new Date(b.due_date);
};

export function useTasks() {
  const { team, user, membership } = useAuth();
  const { items, loading, reload, add, update, remove } = useSyncedCollection('tasks', team?.id, {
    sort: byDueDate,
  });

  const addTask = (payload) => add({ ...payload, created_by: user?.id });

  const toggleDone = (id, done) =>
    update(id, {
      done,
      completed_by: done ? user?.id : null,
      completed_by_name: done ? membership?.display_name || user?.email : null,
      completed_at: done ? new Date().toISOString() : null,
    });

  return { tasks: items, loading, reload, addTask, updateTask: update, toggleDone, removeTask: remove };
}
