import assert from 'node:assert/strict';
import test from 'node:test';
import { buildNotificationRows, officialMatchesProfile } from './notification-engine.mjs';

const profile = { id: 'user-1', home_state: 'FL', congressional_district: 2, state_senate_district: 3, state_house_district: 5 };
const houseOfficial = { id: 'official-1', state: 'FL', district: '5', claim_status: 'unclaimed', imported_metadata: { chamber: 'Florida House' }, name: 'Alex Example' };

test('matches a user to the exact current legislative district', () => {
  assert.equal(officialMatchesProfile(houseOfficial, profile), true);
  assert.equal(officialMatchesProfile({ ...houseOfficial, district: '6' }, profile), false);
  assert.equal(officialMatchesProfile({ ...houseOfficial, claim_status: 'inactive' }, profile), false);
});

test('creates one representative-vote alert only for a new roll call', () => {
  const input = {
    profiles: [profile], officials: [houseOfficial],
    civicItems: [{ id: 'bill-1', title: 'Water Quality', level: 'State', source_id: 'fl-house', source_name: 'Florida House', category: 'Environment', status: 'Passed', latest_action_at: '2026-09-10', source_url: '#' }],
    rollCalls: [{ id: 'roll-1', civic_item_id: 'bill-1', bill_number: 'HB 1', title: 'Water Quality', chamber: 'Florida House Floor', vote_date: '2026-09-10', source_url: '#' }],
    officialVotes: [{ roll_call_id: 'roll-1', official_id: 'official-1', vote: 'yes', source_url: '#' }],
    existingRollCallIds: new Set(), previousItems: new Map(), follows: [], savedItems: [], reminders: [], preferences: [], createdAt: '2026-09-10T12:00:00Z'
  };
  const rows = buildNotificationRows(input);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].event_key, 'representative-vote:roll-1:official-1');
  assert.equal(buildNotificationRows({ ...input, existingRollCallIds: new Set(['roll-1']) }).length, 0);
});

test('alerts on a changed saved bill and suppresses unchanged reruns', () => {
  const item = { id: 'bill-1', title: 'Water Quality', level: 'State', source_id: 'fl-house', source_name: 'Florida House', category: 'Environment', status: 'Passed', latest_action_at: '2026-09-10', source_url: '#' };
  const base = {
    profiles: [profile], officials: [], civicItems: [item], rollCalls: [], officialVotes: [], existingRollCallIds: new Set(),
    follows: [], savedItems: [{ profile_id: 'user-1', civic_item_id: 'bill-1' }], reminders: [], preferences: [], createdAt: '2026-09-10T12:00:00Z'
  };
  assert.equal(buildNotificationRows({ ...base, previousItems: new Map([['bill-1', { status: 'In committee', latest_action_at: '2026-09-09' }]]) }).length, 1);
  assert.equal(buildNotificationRows({ ...base, previousItems: new Map([['bill-1', { status: 'Passed', latest_action_at: '2026-09-10' }]]) }).length, 0);
});

test('respects disabled notification preferences', () => {
  const rows = buildNotificationRows({
    profiles: [profile], officials: [houseOfficial], civicItems: [], rollCalls: [], officialVotes: [],
    existingRollCallIds: new Set(), previousItems: new Map(), follows: [], savedItems: [], reminders: [],
    preferences: [{ profile_id: 'user-1', frequency: 'off', representative_votes: true, bill_updates: true, forecast_results: true }]
  });
  assert.deepEqual(rows, []);
});
