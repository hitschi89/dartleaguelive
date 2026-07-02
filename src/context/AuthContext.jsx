import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabaseClient.js';
import { startSync } from '../lib/sync.js';

export const AuthContext = createContext(null);

async function fetchMembership(userId) {
  const { data, error } = await supabase
    .from('team_members')
    .select('*, teams(*)')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = not loaded yet, null = no session
  const [membership, setMembership] = useState(undefined);
  const [membershipLoading, setMembershipLoading] = useState(false);

  const reloadMembership = useCallback(async (userId) => {
    if (!userId) {
      setMembership(null);
      return;
    }
    setMembershipLoading(true);
    try {
      const data = await fetchMembership(userId);
      setMembership(data || null);
    } finally {
      setMembershipLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) {
      setSession(null);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      if (data.session?.user?.id) reloadMembership(data.session.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next?.user?.id) reloadMembership(next.user.id);
      else setMembership(null);
    });

    return () => sub.subscription.unsubscribe();
  }, [reloadMembership]);

  useEffect(() => {
    if (!membership?.team_id) return undefined;
    return startSync(membership.team_id);
  }, [membership?.team_id]);

  const signUp = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const createTeam = useCallback(
    async ({ teamName, displayName, role }) => {
      const userId = session.user.id;
      // The team's id is generated client-side and the insert isn't
      // chained with .select() - reading the row back would need the
      // teams SELECT policy (which requires membership) to already pass,
      // but the membership row doesn't exist until the next step. Knowing
      // the id upfront sidesteps that chicken-and-egg RLS problem.
      const teamId = crypto.randomUUID();
      const { error: teamError } = await supabase.from('teams').insert({ id: teamId, name: teamName });
      if (teamError) throw teamError;

      const { error: memberError } = await supabase.from('team_members').insert({
        team_id: teamId,
        user_id: userId,
        display_name: displayName,
        role: role || 'Teamchef',
        email: session.user.email,
      });
      if (memberError) throw memberError;

      const { error: channelError } = await supabase
        .from('channels')
        .insert({ team_id: teamId, name: 'Allgemein', kind: 'general' });
      if (channelError) throw channelError;

      await reloadMembership(userId);
    },
    [session, reloadMembership]
  );

  const joinTeam = useCallback(
    async ({ inviteCode, displayName, role }) => {
      const userId = session.user.id;
      const { data: found, error: lookupError } = await supabase.rpc('find_team_by_invite_code', {
        code: inviteCode.trim(),
      });
      if (lookupError) throw lookupError;
      if (!found || found.length === 0) throw new Error('Ungültiger Einladungscode.');
      const team = found[0];

      const { error: memberError } = await supabase.from('team_members').insert({
        team_id: team.id,
        user_id: userId,
        display_name: displayName,
        role: role || 'Sonstiges',
        email: session.user.email,
      });
      if (memberError) throw memberError;

      await reloadMembership(userId);
      return team;
    },
    [session, reloadMembership]
  );

  const value = useMemo(
    () => ({
      configured: supabaseConfigured,
      session,
      user: session?.user || null,
      membership,
      team: membership?.teams || null,
      role: membership?.role || null,
      loading: session === undefined || (session && membership === undefined) || membershipLoading,
      signUp,
      signIn,
      signOut,
      createTeam,
      joinTeam,
      reloadMembership: () => reloadMembership(session?.user?.id),
    }),
    [session, membership, membershipLoading, signUp, signIn, signOut, createTeam, joinTeam, reloadMembership]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
