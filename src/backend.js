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

export async function syncSavedItem(profileId, civicItemId, shouldSave) {
  if (!supabase) {
    return { mode: 'local' };
  }

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
