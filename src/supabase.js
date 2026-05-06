import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    'Missing Supabase credentials. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local'
  );
}

export const supabase = createClient(url, key, {
  realtime: { params: { eventsPerSecond: 5 } },
});

// ============================================================
// AUTH
// ============================================================

// Build a fake email from a username so Supabase Auth (which requires email)
// can be used with just a username + password from the user's perspective.
const USERNAME_DOMAIN = 'thealbum.local';
const usernameToEmail = (u) => `${u.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')}@${USERNAME_DOMAIN}`;

export async function signUpWithUsername({ username, password, displayName }) {
  const email = usernameToEmail(username);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName || username, username } },
  });
  if (error) throw error;
  // Auto-create a member row keyed to the auth user id
  if (data.user) {
    await ensureMemberRow(data.user.id, displayName || username);
  }
  return data;
}

export async function signInWithUsername({ username, password }) {
  const email = usernameToEmail(username);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  // Make sure a members row exists (in case of legacy account)
  if (data.user) {
    const displayName = data.user.user_metadata?.display_name || username;
    await ensureMemberRow(data.user.id, displayName);
  }
  return data;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session || null;
}

export function onAuthChange(cb) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

// After Google sign-in, we need to give the user a display name and create
// their member row. Returns true if a name still needs to be set.
export async function needsDisplayName(user) {
  if (!user) return false;
  const { data } = await supabase.from('members').select('id').eq('id', user.id).maybeSingle();
  return !data;
}

export async function ensureMemberRow(userId, name) {
  // Insert if not exists; do not overwrite an existing row
  const { data: existing } = await supabase
    .from('members')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (existing) return;
  const { error } = await supabase
    .from('members')
    .insert({ id: userId, name, joined_at: Date.now() });
  if (error && error.code !== '23505') throw error; // ignore unique violation
}

export async function updateDisplayName(userId, name) {
  const { error } = await supabase.from('members').update({ name }).eq('id', userId);
  if (error) throw error;
}

// ============================================================
// MEMBERS / COLLECTIONS
// ============================================================

export async function loadMembers() {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((m) => ({ id: m.id, name: m.name, joinedAt: m.joined_at }));
}

export async function loadAllCollections() {
  const { data, error } = await supabase.from('collections').select('*');
  if (error) throw error;
  const grouped = {};
  for (const row of data || []) {
    if (!grouped[row.user_id]) grouped[row.user_id] = {};
    grouped[row.user_id][row.sticker_number] = row.count;
  }
  return grouped;
}

export async function upsertSticker(userId, stickerNumber, count) {
  if (count <= 0) {
    const { error } = await supabase
      .from('collections')
      .delete()
      .match({ user_id: userId, sticker_number: stickerNumber });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('collections')
      .upsert(
        { user_id: userId, sticker_number: stickerNumber, count },
        { onConflict: 'user_id,sticker_number' }
      );
    if (error) throw error;
  }
}

// ============================================================
// ADMIN — delete other members (for cleanup)
// ============================================================

export async function deleteMember(memberId) {
  // collections cascade-delete via the foreign key
  const { error } = await supabase.from('members').delete().eq('id', memberId);
  if (error) throw error;
}

// ============================================================
// REAL-TIME
// ============================================================

export function subscribeToChanges(onChange) {
  const channel = supabase
    .channel('the-album-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}
