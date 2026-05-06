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

// ---------- Members ----------

export async function loadMembers() {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((m) => ({ id: m.id, name: m.name, joinedAt: m.joined_at }));
}

export async function insertMember(member) {
  const { error } = await supabase
    .from('members')
    .insert({ id: member.id, name: member.name, joined_at: member.joinedAt });
  if (error) throw error;
}

// ---------- Collections ----------

export async function loadAllCollections() {
  const { data, error } = await supabase.from('collections').select('*');
  if (error) throw error;
  // Group by user_id -> { stickerNumber: count }
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

// ---------- Real-time subscription ----------

export function subscribeToChanges(onChange) {
  const channel = supabase
    .channel('the-album-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// ---------- Local-only "current user" ----------
// We remember which member you are in localStorage so the browser auto-signs in next time.

export function getCurrentUserId() {
  try { return localStorage.getItem('the-album:me') || null; } catch { return null; }
}
export function setCurrentUserId(id) {
  try {
    if (id) localStorage.setItem('the-album:me', id);
    else localStorage.removeItem('the-album:me');
  } catch {}
}
