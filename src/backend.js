import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const backendMode = supabaseUrl && supabaseAnonKey ? 'supabase' : 'local';

export const backendLabel = backendMode === 'supabase'
  ? 'Supabase sync configured'
  : 'Local guest session';

const supabase = backendMode === 'supabase'
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

async function ensureProfile(profileId) {
  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: profileId,
        display_name: 'Guest user',
        updated_at: new Date().toISOString()
      },
      { onConflict: 'id' }
    );

  if (error) throw error;
}

async function ensureCivicItem(civicItem) {
  if (typeof civicItem === 'string') return civicItem;

  const { error } = await supabase
    .from('civic_items')
    .upsert(
      {
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
      },
      { onConflict: 'id' }
    );

  if (error) throw error;
  return civicItem.id;
}

export async function syncSavedItem(profileId, civicItem, shouldSave) {
  if (!supabase) {
    return { mode: 'local' };
  }

  await ensureProfile(profileId);
  const civicItemId = await ensureCivicItem(civicItem);

  if (shouldSave) {
    const { error } = await supabase
      .from('saved_items')
      .upsert(
        {
          profile_id: profileId,
          civic_item_id: civicItemId
        },
        { onConflict: 'profile_id,civic_item_id' }
      );

    if (error) throw error;
    return { mode: 'supabase', action: 'saved' };
  }

  const { error } = await supabase
    .from('saved_items')
    .delete()
    .eq('profile_id', profileId)
    .eq('civic_item_id', civicItemId);

  if (error) throw error;
  return { mode: 'supabase', action: 'removed' };
}

export async function syncUserVote(profileId, civicItem, vote) {
  if (!supabase) {
    return { mode: 'local' };
  }

  await ensureProfile(profileId);
  const civicItemId = await ensureCivicItem(civicItem);

  if (vote) {
    const { error } = await supabase
      .from('user_votes')
      .upsert(
        {
          profile_id: profileId,
          civic_item_id: civicItemId,
          vote,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'profile_id,civic_item_id' }
      );

    if (error) throw error;
    return { mode: 'supabase', action: 'voted' };
  }

  const { error } = await supabase
    .from('user_votes')
    .delete()
    .eq('profile_id', profileId)
    .eq('civic_item_id', civicItemId);

  if (error) throw error;
  return { mode: 'supabase', action: 'removed' };
}

export async function createComment(profileId, civicItem, body) {
  if (!supabase) {
    return { mode: 'local' };
  }

  await ensureProfile(profileId);
  const civicItemId = await ensureCivicItem(civicItem);

  const { error } = await supabase
    .from('comments')
    .insert({
      profile_id: profileId,
      civic_item_id: civicItemId,
      body,
      moderation_status: 'pending'
    });

  if (error) throw error;
  return { mode: 'supabase', action: 'queued' };
}

export async function createSourceReport(profileId, civicItem, body, reportType = 'source_issue') {
  if (!supabase) {
    return { mode: 'local' };
  }

  await ensureProfile(profileId);
  const civicItemId = await ensureCivicItem(civicItem);

  const { error } = await supabase
    .from('source_reports')
    .insert({
      profile_id: profileId,
      civic_item_id: civicItemId,
      report_type: reportType,
      body,
      status: 'queued'
    });

  if (error) throw error;
  return { mode: 'supabase', action: 'queued' };
}
