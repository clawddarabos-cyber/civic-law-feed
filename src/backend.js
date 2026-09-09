import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const backendMode = supabaseUrl && supabaseAnonKey ? 'supabase' : 'local';
export const backendLabel = backendMode === 'supabase' ? 'Cloud sync available' : 'Local guest session';
export const cloudConfigured = backendMode === 'supabase';

const supabase = cloudConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

async function authenticatedUser() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

async function ensureProfile(user, preferences = {}) {
  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email,
    display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Civics user',
    ...preferences,
    updated_at: new Date().toISOString()
  }, { onConflict: 'id' });
  if (error) throw error;
}

async function ensureCivicItem(civicItem) {
  if (typeof civicItem === 'string') return civicItem;
  const { error } = await supabase.from('civic_items').upsert({
    id: civicItem.id,
    title: civicItem.title,
    chamber: civicItem.chamber,
    jurisdiction: civicItem.jurisdiction,
    level: civicItem.level,
    status: civicItem.status,
    category: civicItem.category,
    summary: civicItem.summary,
    detail: civicItem.detail,
    source_url: civicItem.sourceUrl,
    official_text_url: civicItem.officialTextUrl,
    imported_metadata: civicItem.imported || {}
  }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw error;
  return civicItem.id;
}

export async function getAuthSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function subscribeToAuth(callback) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export async function sendSignInLink(email) {
  if (!supabase) throw new Error('Cloud sync is not configured yet.');
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` }
  });
  if (error) throw error;
}

export async function signOutUser() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function loadCloudActivity() {
  const user = await authenticatedUser();
  if (!user) return null;
  await ensureProfile(user);
  const [profile, votes, saved, follows, reminders] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('user_votes').select('civic_item_id,vote').eq('profile_id', user.id),
    supabase.from('saved_items').select('civic_item_id').eq('profile_id', user.id),
    supabase.from('follows').select('target_type,target_id').eq('profile_id', user.id),
    supabase.from('reminders').select('civic_item_id,status').eq('profile_id', user.id).eq('status', 'active')
  ]);
  const firstError = [profile, votes, saved, follows, reminders].find((result) => result.error)?.error;
  if (firstError) throw firstError;
  return {
    user,
    profile: profile.data,
    votes: Object.fromEntries(votes.data.map((item) => [item.civic_item_id, item.vote])),
    saved: saved.data.map((item) => item.civic_item_id),
    followed: follows.data.map((item) => item.target_id),
    reminders: reminders.data.map((item) => item.civic_item_id)
  };
}

export async function syncLocalSnapshot(snapshot, civicItems) {
  const user = await authenticatedUser();
  if (!user) return { mode: 'local' };
  const civicItemMap = new Map(civicItems.map((item) => [item.id, item]));
  const knownItemIds = new Set(civicItemMap.keys());
  await ensureProfile(user);
  const actionItemIds = new Set([
    ...Object.keys(snapshot.votes || {}),
    ...(snapshot.saved || []),
    ...(snapshot.reminders || [])
  ]);
  for (const itemId of actionItemIds) {
    const item = civicItemMap.get(itemId);
    if (item) await ensureCivicItem(item);
  }
  const voteRows = Object.entries(snapshot.votes || {}).filter(([civicItemId]) => knownItemIds.has(civicItemId)).map(([civicItemId, vote]) => ({ profile_id: user.id, civic_item_id: civicItemId, vote }));
  const savedRows = (snapshot.saved || []).filter((civicItemId) => knownItemIds.has(civicItemId)).map((civicItemId) => ({ profile_id: user.id, civic_item_id: civicItemId }));
  const sourceNames = new Set(civicItems.map((item) => item.sourceName));
  const levelNames = new Set(['Federal', 'State', 'County', 'City']);
  const followRows = (snapshot.followed || []).map((targetId) => ({
    profile_id: user.id,
    target_type: levelNames.has(targetId) ? 'level' : sourceNames.has(targetId) ? 'source' : 'topic',
    target_id: targetId
  }));
  const reminderRows = (snapshot.reminders || []).filter((civicItemId) => knownItemIds.has(civicItemId)).map((civicItemId) => ({ profile_id: user.id, civic_item_id: civicItemId, status: 'active' }));
  const writes = [];
  if (voteRows.length) writes.push(supabase.from('user_votes').upsert(voteRows, { onConflict: 'profile_id,civic_item_id' }));
  if (savedRows.length) writes.push(supabase.from('saved_items').upsert(savedRows, { onConflict: 'profile_id,civic_item_id', ignoreDuplicates: true }));
  if (followRows.length) writes.push(supabase.from('follows').upsert(followRows, { onConflict: 'profile_id,target_type,target_id', ignoreDuplicates: true }));
  if (reminderRows.length) writes.push(supabase.from('reminders').upsert(reminderRows, { onConflict: 'profile_id,civic_item_id' }));
  const results = await Promise.all(writes);
  const firstError = results.find((result) => result.error)?.error;
  if (firstError) throw firstError;
  return { mode: 'supabase' };
}

export async function syncPreferences(jurisdiction, theme) {
  const user = await authenticatedUser();
  if (!user) return { mode: 'local' };
  await ensureProfile(user, {
    home_state: jurisdiction.stateCode,
    home_county: jurisdiction.county,
    congressional_district: jurisdiction.congressionalDistrict,
    state_senate_district: jurisdiction.stateSenateDistrict,
    state_house_district: jurisdiction.stateHouseDistrict,
    theme_preference: theme,
    jurisdiction_data: jurisdiction
  });
  return { mode: 'supabase' };
}

export async function syncSavedItem(_profileId, civicItem, shouldSave) {
  const user = await authenticatedUser();
  if (!user) return { mode: 'local' };
  await ensureProfile(user);
  const civicItemId = await ensureCivicItem(civicItem);
  if (shouldSave) {
    const { error } = await supabase.from('saved_items').upsert({ profile_id: user.id, civic_item_id: civicItemId }, { onConflict: 'profile_id,civic_item_id', ignoreDuplicates: true });
    if (error) throw error;
    return { mode: 'supabase', action: 'saved' };
  }
  const { error } = await supabase.from('saved_items').delete().eq('profile_id', user.id).eq('civic_item_id', civicItemId);
  if (error) throw error;
  return { mode: 'supabase', action: 'removed' };
}

export async function syncUserVote(_profileId, civicItem, vote) {
  const user = await authenticatedUser();
  if (!user) return { mode: 'local' };
  await ensureProfile(user);
  const civicItemId = await ensureCivicItem(civicItem);
  if (vote) {
    const { error } = await supabase.from('user_votes').upsert({ profile_id: user.id, civic_item_id: civicItemId, vote, updated_at: new Date().toISOString() }, { onConflict: 'profile_id,civic_item_id' });
    if (error) throw error;
    return { mode: 'supabase', action: 'voted' };
  }
  const { error } = await supabase.from('user_votes').delete().eq('profile_id', user.id).eq('civic_item_id', civicItemId);
  if (error) throw error;
  return { mode: 'supabase', action: 'removed' };
}

export async function syncFollowTarget(targetId, shouldFollow, targetType = 'topic') {
  const user = await authenticatedUser();
  if (!user) return { mode: 'local' };
  await ensureProfile(user);
  if (shouldFollow) {
    const { error } = await supabase.from('follows').upsert({ profile_id: user.id, target_type: targetType, target_id: targetId }, { onConflict: 'profile_id,target_type,target_id', ignoreDuplicates: true });
    if (error) throw error;
  } else {
    const { error } = await supabase.from('follows').delete().eq('profile_id', user.id).eq('target_type', targetType).eq('target_id', targetId);
    if (error) throw error;
  }
  return { mode: 'supabase' };
}

export async function syncReminder(_profileId, civicItem, shouldRemind) {
  const user = await authenticatedUser();
  if (!user) return { mode: 'local' };
  await ensureProfile(user);
  const civicItemId = await ensureCivicItem(civicItem);
  if (shouldRemind) {
    const { error } = await supabase.from('reminders').upsert({ profile_id: user.id, civic_item_id: civicItemId, status: 'active' }, { onConflict: 'profile_id,civic_item_id' });
    if (error) throw error;
  } else {
    const { error } = await supabase.from('reminders').delete().eq('profile_id', user.id).eq('civic_item_id', civicItemId);
    if (error) throw error;
  }
  return { mode: 'supabase' };
}

export async function createComment(_profileId, civicItem, body) {
  const user = await authenticatedUser();
  if (!user) return { mode: 'local' };
  await ensureProfile(user);
  const civicItemId = await ensureCivicItem(civicItem);
  const { error } = await supabase.from('comments').insert({ profile_id: user.id, civic_item_id: civicItemId, body, moderation_status: 'pending' });
  if (error) throw error;
  return { mode: 'supabase', action: 'queued' };
}

export async function createSourceReport(_profileId, civicItem, body, reportType = 'source_issue') {
  const user = await authenticatedUser();
  if (!user) return { mode: 'local' };
  await ensureProfile(user);
  const civicItemId = await ensureCivicItem(civicItem);
  const { error } = await supabase.from('source_reports').insert({ profile_id: user.id, civic_item_id: civicItemId, report_type: reportType, body, status: 'queued' });
  if (error) throw error;
  return { mode: 'supabase', action: 'queued' };
}
