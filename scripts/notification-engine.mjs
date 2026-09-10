function chamberOf(official) {
  return official.imported_metadata?.chamber || official.chamber || official.office || '';
}

function currentOfficial(official) {
  return official.claim_status !== 'inactive' && !official.imported_metadata?.historical;
}

export function officialMatchesProfile(official, profile) {
  if (!currentOfficial(official) || !profile.home_state) return false;
  const chamber = chamberOf(official);
  if (chamber === 'U.S. Senate') return official.state === profile.home_state;
  if (chamber === 'U.S. House') {
    return official.state === profile.home_state && Number(official.district) === Number(profile.congressional_district);
  }
  if (profile.home_state !== 'FL') return false;
  if (chamber === 'Florida Senate') return Number(official.district) === Number(profile.state_senate_district);
  if (chamber === 'Florida House') return Number(official.district) === Number(profile.state_house_district);
  return false;
}

function defaultPreferences(profileId) {
  return {
    profile_id: profileId,
    frequency: 'immediate',
    representative_votes: true,
    bill_updates: true,
    forecast_results: true
  };
}

function shortHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function followedItem(item, follows = []) {
  return follows.some((follow) => (
    (follow.target_type === 'level' && follow.target_id === item.level)
    || (follow.target_type === 'source' && [item.source_id, item.source_name].includes(follow.target_id))
    || (follow.target_type === 'topic' && follow.target_id.toLowerCase() === String(item.category || '').toLowerCase())
  ));
}

export function buildNotificationRows({
  profiles,
  officials,
  civicItems,
  rollCalls,
  officialVotes,
  existingRollCallIds,
  previousItems,
  follows,
  savedItems,
  reminders,
  preferences,
  createdAt = new Date().toISOString()
}) {
  const rows = [];
  const officialMap = new Map(officials.map((official) => [official.id, official]));
  const itemMap = new Map(civicItems.map((item) => [item.id, item]));
  const rollCallMap = new Map(rollCalls.map((rollCall) => [rollCall.id, rollCall]));
  const preferencesByProfile = new Map(preferences.map((item) => [item.profile_id, item]));
  const followsByProfile = new Map();
  const watchedItemsByProfile = new Map();

  for (const follow of follows) {
    const list = followsByProfile.get(follow.profile_id) || [];
    list.push(follow);
    followsByProfile.set(follow.profile_id, list);
  }
  for (const item of [...savedItems, ...reminders]) {
    const set = watchedItemsByProfile.get(item.profile_id) || new Set();
    set.add(item.civic_item_id);
    watchedItemsByProfile.set(item.profile_id, set);
  }

  const newRollCallIds = new Set(rollCalls.filter((rollCall) => !existingRollCallIds.has(rollCall.id)).map((rollCall) => rollCall.id));
  const newVotes = officialVotes.filter((vote) => newRollCallIds.has(vote.roll_call_id));

  for (const profile of profiles) {
    const profilePreferences = { ...defaultPreferences(profile.id), ...(preferencesByProfile.get(profile.id) || {}) };
    if (profilePreferences.frequency === 'off') continue;
    const profileFollows = followsByProfile.get(profile.id) || [];
    const followedOfficials = new Set(profileFollows.filter((item) => item.target_type === 'official').map((item) => item.target_id));
    const representativeIds = new Set(officials.filter((official) => officialMatchesProfile(official, profile)).map((official) => official.id));

    if (profilePreferences.representative_votes) {
      for (const vote of newVotes) {
        if (!representativeIds.has(vote.official_id) && !followedOfficials.has(vote.official_id)) continue;
        const official = officialMap.get(vote.official_id);
        const rollCall = rollCallMap.get(vote.roll_call_id);
        if (!official || !rollCall) continue;
        const item = itemMap.get(rollCall.civic_item_id);
        rows.push({
          profile_id: profile.id,
          event_key: `representative-vote:${rollCall.id}:${official.id}`,
          event_type: 'representative_vote',
          civic_item_id: rollCall.civic_item_id || null,
          official_id: official.id,
          title: `${official.name} voted ${vote.vote.toUpperCase()}`,
          body: `${rollCall.bill_number}: ${item?.title || rollCall.title} · ${rollCall.vote_date}`,
          source_url: vote.source_url || rollCall.source_url,
          metadata: { vote: vote.vote, rollCallId: rollCall.id, chamber: rollCall.chamber },
          created_at: createdAt
        });
      }
    }

    if (!profilePreferences.bill_updates) continue;
    const watchedItems = watchedItemsByProfile.get(profile.id) || new Set();
    for (const item of civicItems) {
      const previous = previousItems.get(item.id);
      if (!previous) continue;
      const changed = previous.status !== item.status || previous.latest_action_at !== item.latest_action_at;
      if (!changed || (!watchedItems.has(item.id) && !followedItem(item, profileFollows))) continue;
      const changeFingerprint = shortHash(`${item.status || ''}|${item.latest_action_at || ''}`);
      rows.push({
        profile_id: profile.id,
        event_key: `bill-update:${item.id}:${changeFingerprint}`,
        event_type: 'bill_update',
        civic_item_id: item.id,
        official_id: null,
        title: `Update on ${item.title}`,
        body: item.status || 'The official record changed.',
        source_url: item.source_url,
        metadata: {
          previousStatus: previous.status || null,
          status: item.status || null,
          latestActionAt: item.latest_action_at || null
        },
        created_at: createdAt
      });
    }
  }
  return rows;
}

