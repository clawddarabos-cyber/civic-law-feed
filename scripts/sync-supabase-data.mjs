import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { buildNotificationRows } from './notification-engine.mjs';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const [floridaData, floridaHouseData, directoryData, federalData, federalVoteData] = await Promise.all([
  readJson('data/florida-official-data.json'),
  readJson('data/florida-house-official-data.json'),
  readJson('data/representative-directory.json'),
  readJson('data/federal-civic-items.json'),
  readJson('data/federal-votes.json')
]);
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function upsertBatches(table, rows, onConflict, size = 500, ignoreDuplicates = false) {
  for (let index = 0; index < rows.length; index += size) {
    const { error } = await supabase.from(table).upsert(rows.slice(index, index + size), { onConflict, ignoreDuplicates });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

async function fetchAllRows(table, columns, configureQuery) {
  const rows = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    let query = supabase.from(table).select(columns).range(from, from + size - 1);
    if (configureQuery) query = configureQuery(query);
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < size) return rows;
  }
}

function isoDate(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const [month, day, year] = String(value).split('/').map(Number);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function floridaActionDate(value) {
  const match = String(value || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return match ? `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}` : null;
}

const floridaOfficials = floridaData.officials.map((official) => ({
  id: official.id,
  source_id: 'florida-senate',
  name: official.name,
  office: `${official.chamber} District ${official.district}`,
  jurisdiction: 'Florida',
  party: official.party,
  state: 'FL',
  district: String(official.district),
  source_url: official.profileUrl,
  claim_status: official.claimStatus,
  imported_metadata: { chamber: official.chamber, source: 'Florida Senate' },
  updated_at: floridaData.generatedAt
}));
const floridaHouseOfficials = floridaHouseData.officials.map((official) => ({
  id: official.id,
  source_id: 'florida-house',
  name: official.name,
  office: official.historical ? 'Florida House (historical member)' : `Florida House District ${official.district}`,
  jurisdiction: 'Florida',
  party: official.party,
  state: 'FL',
  district: String(official.district),
  source_url: official.profileUrl,
  claim_status: official.claimStatus,
  imported_metadata: { chamber: official.chamber, memberId: official.memberId, historical: official.historical },
  updated_at: floridaHouseData.generatedAt
}));
const directoryOfficials = directoryData.officials.map((official) => ({
  id: official.id,
  source_id: 'us-official-directory',
  name: official.name,
  office: official.office,
  jurisdiction: official.level === 'Federal' ? 'Federal' : 'Florida',
  party: official.party,
  state: official.state,
  district: official.district === null ? null : String(official.district),
  source_url: official.sourceUrl,
  claim_status: 'unclaimed',
  imported_metadata: { chamber: official.chamber, bioguideId: official.bioguideId || null },
  updated_at: directoryData.generatedAt
}));
const officialMap = new Map([...directoryOfficials, ...floridaOfficials, ...floridaHouseOfficials].map((official) => [official.id, official]));
for (const official of federalVoteData.historicalOfficials || []) {
  const chamber = official.office.startsWith('U.S. House') ? 'U.S. House' : 'U.S. Senate';
  officialMap.set(official.id, {
    id: official.id,
    source_id: chamber === 'U.S. House' ? 'us-house-clerk' : 'us-senate-roll-calls',
    name: official.name,
    office: official.office,
    jurisdiction: 'Federal',
    party: official.party,
    state: official.state,
    district: null,
    source_url: official.sourceUrl,
    claim_status: 'inactive',
    imported_metadata: { chamber, lisMemberId: official.lisMemberId || null, historical: true },
    updated_at: federalVoteData.generatedAt
  });
}

const floridaItems = floridaData.bills.map((bill) => ({
  id: bill.id,
  source_id: 'florida-senate',
  title: bill.title,
  chamber: bill.chamber,
  jurisdiction: 'Florida',
  level: 'State',
  status: bill.lastAction,
  category: 'Legislation',
  summary: bill.title,
  ai_summary: null,
  detail: bill.lastAction,
  source_name: 'Florida Senate',
  source_url: bill.sourceUrl,
  official_text_url: bill.sourceUrl,
  latest_action_at: floridaActionDate(bill.lastAction),
  updated_at: floridaData.generatedAt,
  imported_at: floridaData.generatedAt,
  image_url: null,
  pros: [],
  cons: [],
  sponsors: [],
  committees: [],
  actions: [],
  imported_metadata: { number: bill.number, session: bill.session, filedBy: bill.filedBy }
}));
const floridaHouseItems = floridaHouseData.bills.map((bill) => ({
  id: bill.id,
  source_id: 'florida-house',
  title: bill.title,
  chamber: bill.number,
  jurisdiction: 'Florida',
  level: 'State',
  status: bill.lastAction,
  category: 'Legislation',
  summary: bill.summary,
  ai_summary: null,
  detail: bill.summary,
  source_name: 'Florida House',
  source_url: bill.sourceUrl,
  official_text_url: bill.sourceUrl,
  latest_action_at: floridaActionDate(bill.lastAction),
  updated_at: floridaHouseData.generatedAt,
  imported_at: floridaHouseData.generatedAt,
  image_url: null,
  pros: [],
  cons: [],
  sponsors: bill.filedBy ? [bill.filedBy] : [],
  committees: [],
  actions: [],
  imported_metadata: { number: bill.number, session: bill.session, filedBy: bill.filedBy }
}));
const federalItems = federalData.items.map((bill) => ({
  id: bill.id,
  source_id: 'congress-gov',
  title: bill.title,
  chamber: bill.chamber,
  jurisdiction: bill.jurisdiction,
  level: bill.level,
  status: bill.status,
  category: bill.category,
  summary: bill.summary,
  ai_summary: bill.aiSummary || bill.summary,
  detail: bill.detail,
  source_name: bill.sourceName,
  source_url: bill.sourceUrl,
  official_text_url: bill.officialTextUrl,
  introduced_at: bill.imported?.introducedDate || null,
  latest_action_at: bill.imported?.latestActionDate || null,
  updated_at: bill.imported?.updateDate || federalData.generatedAt,
  imported_at: federalData.generatedAt,
  image_url: bill.image || null,
  pros: bill.pros || [],
  cons: bill.cons || [],
  sponsors: bill.sponsors || [],
  committees: bill.committees || [],
  actions: bill.actions || [],
  imported_metadata: bill.imported || {}
}));

function congressBillUrl(id) {
  const match = String(id).match(/^congress-(\d+)-(hr|hres|hjres|hconres|s|sres|sjres|sconres)-(\d+)$/);
  if (!match) return 'https://www.congress.gov/';
  const paths = {
    hr: 'house-bill', hres: 'house-resolution', hjres: 'house-joint-resolution', hconres: 'house-concurrent-resolution',
    s: 'senate-bill', sres: 'senate-resolution', sjres: 'senate-joint-resolution', sconres: 'senate-concurrent-resolution'
  };
  return `https://www.congress.gov/bill/${match[1]}th-congress/${paths[match[2]]}/${match[3]}`;
}

const federalItemIds = new Set(federalItems.map((item) => item.id));
const federalVoteItemMap = new Map();
for (const rollCall of federalVoteData.rollCalls) {
  if (!rollCall.billId || federalItemIds.has(rollCall.billId) || federalVoteItemMap.has(rollCall.billId)) continue;
  const sourceName = rollCall.chamber === 'U.S. House' ? 'U.S. House Clerk' : 'U.S. Senate';
  federalVoteItemMap.set(rollCall.billId, {
    id: rollCall.billId,
    source_id: rollCall.chamber === 'U.S. House' ? 'us-house-clerk' : 'us-senate-roll-calls',
    title: rollCall.billTitle,
    chamber: rollCall.billNumber,
    jurisdiction: 'Federal',
    level: 'Federal',
    status: [rollCall.question, rollCall.result].filter(Boolean).join(' · '),
    category: 'Federal legislation',
    summary: rollCall.billTitle,
    ai_summary: null,
    detail: rollCall.billTitle,
    source_name: sourceName,
    source_url: rollCall.sourceUrl,
    official_text_url: congressBillUrl(rollCall.billId),
    latest_action_at: isoDate(rollCall.date),
    updated_at: federalVoteData.generatedAt,
    imported_at: federalVoteData.generatedAt,
    image_url: null,
    pros: [],
    cons: [],
    sponsors: [],
    committees: [],
    actions: [],
    imported_metadata: { source: `${sourceName} roll call`, congress: federalVoteData.congress, number: rollCall.billNumber }
  });
}
const federalVoteItems = [...federalVoteItemMap.values()];

const knownCivicItemIds = new Set([...federalItems, ...federalVoteItems, ...floridaItems, ...floridaHouseItems].map((item) => item.id));
const rollCalls = [
  ...floridaData.rollCalls.map((rollCall) => ({ ...rollCall, datasetGeneratedAt: floridaData.generatedAt })),
  ...floridaHouseData.rollCalls.map((rollCall) => ({ ...rollCall, datasetGeneratedAt: floridaHouseData.generatedAt })),
  ...federalVoteData.rollCalls.map((rollCall) => ({ ...rollCall, datasetGeneratedAt: federalVoteData.generatedAt }))
].map((rollCall) => ({
  id: rollCall.id,
  civic_item_id: knownCivicItemIds.has(rollCall.billId) ? rollCall.billId : null,
  bill_number: rollCall.billNumber,
  title: rollCall.billTitle,
  chamber: rollCall.chamber,
  vote_date: isoDate(rollCall.date),
  yea_count: rollCall.yeas,
  nay_count: rollCall.nays,
  source_url: rollCall.sourceUrl,
  validation_status: rollCall.validation?.matchesPublishedTotals ? 'validated' : 'rejected',
  imported_at: rollCall.datasetGeneratedAt
}));

const floridaBySurname = new Map(floridaData.officials.map((official) => [official.name.split(',')[0].trim().toLowerCase(), official.id]));
const officialVotes = [];
let historicalOfficials = 0;
for (const rollCall of floridaData.rollCalls) {
  for (const memberVote of rollCall.memberVotes || []) {
    const surname = memberVote.name.trim().toLowerCase();
    let officialId = floridaBySurname.get(surname);
    if (!officialId) {
      officialId = `fl-senate-historical-${surname.replace(/[^a-z0-9]+/g, '-')}`;
      if (!officialMap.has(officialId)) {
        historicalOfficials += 1;
        officialMap.set(officialId, {
          id: officialId,
          name: memberVote.name.trim(),
          office: 'Florida Senate (historical member)',
          jurisdiction: 'Florida',
          party: null,
          state: 'FL',
          district: null,
          source_url: rollCall.sourceUrl,
          claim_status: 'inactive',
          imported_metadata: { chamber: 'Florida Senate', historical: true },
          updated_at: floridaData.generatedAt
        });
      }
    }
    officialVotes.push({
      roll_call_id: rollCall.id,
      official_id: officialId,
      vote: memberVote.vote,
      source_url: rollCall.sourceUrl
    });
  }
}
for (const rollCall of floridaHouseData.rollCalls) {
  for (const memberVote of rollCall.memberVotes || []) {
    officialVotes.push({
      roll_call_id: rollCall.id,
      official_id: memberVote.officialId,
      vote: memberVote.vote,
      source_url: rollCall.sourceUrl
    });
  }
}
for (const rollCall of federalVoteData.rollCalls) {
  for (const memberVote of rollCall.memberVotes || []) {
    officialVotes.push({
      roll_call_id: rollCall.id,
      official_id: memberVote.officialId,
      vote: memberVote.vote,
      source_url: rollCall.sourceUrl
    });
  }
}

const sources = [
  {
    id: 'congress-gov',
    name: 'Congress.gov',
    level: 'Federal',
    jurisdiction: 'United States',
    homepage_url: 'https://www.congress.gov/',
    api_url: 'https://api.congress.gov/',
    source_type: 'legislation_api',
    last_checked_at: new Date().toISOString(),
    freshness_status: 'current'
  },
  {
    id: 'florida-senate',
    name: 'Florida Senate',
    level: 'State',
    jurisdiction: 'Florida',
    homepage_url: 'https://www.flsenate.gov/',
    api_url: null,
    source_type: 'official_legislature',
    last_checked_at: new Date().toISOString(),
    freshness_status: 'current'
  },
  {
    id: 'florida-house',
    name: 'Florida House of Representatives',
    level: 'State',
    jurisdiction: 'Florida',
    homepage_url: 'https://www.flhouse.gov/',
    api_url: null,
    source_type: 'official_legislature',
    last_checked_at: new Date().toISOString(),
    freshness_status: 'current'
  },
  {
    id: 'us-official-directory',
    name: 'Official congressional directories',
    level: 'Federal',
    jurisdiction: 'United States',
    homepage_url: 'https://www.congress.gov/members',
    api_url: null,
    source_type: 'official_directory',
    last_checked_at: new Date().toISOString(),
    freshness_status: 'current'
  },
  {
    id: 'us-house-clerk',
    name: 'U.S. House Clerk',
    level: 'Federal',
    jurisdiction: 'United States',
    homepage_url: 'https://clerk.house.gov/Votes',
    api_url: null,
    source_type: 'official_roll_calls',
    last_checked_at: new Date().toISOString(),
    freshness_status: 'current'
  },
  {
    id: 'us-senate-roll-calls',
    name: 'U.S. Senate Roll Call Votes',
    level: 'Federal',
    jurisdiction: 'United States',
    homepage_url: 'https://www.senate.gov/legislative/votes_new.htm',
    api_url: null,
    source_type: 'official_roll_calls',
    last_checked_at: new Date().toISOString(),
    freshness_status: 'current'
  }
];

const [existingRollCallRows, existingItemRows] = await Promise.all([
  fetchAllRows('roll_calls', 'id'),
  fetchAllRows('civic_items', 'id,status,latest_action_at')
]);
const existingRollCallIds = new Set(existingRollCallRows.map((row) => row.id));
const previousItems = new Map(existingItemRows.map((row) => [row.id, row]));

await upsertBatches('sources', sources, 'id');
await upsertBatches('officials', [...officialMap.values()], 'id');
await upsertBatches('civic_items', [...federalItems, ...federalVoteItems, ...floridaItems, ...floridaHouseItems], 'id');
await upsertBatches('roll_calls', rollCalls, 'id');
await upsertBatches('official_votes', officialVotes, 'roll_call_id,official_id', 2000);

const [profiles, follows, savedItems, reminders, notificationPreferences] = await Promise.all([
  fetchAllRows('profiles', 'id,home_state,congressional_district,state_senate_district,state_house_district'),
  fetchAllRows('follows', 'profile_id,target_type,target_id'),
  fetchAllRows('saved_items', 'profile_id,civic_item_id'),
  fetchAllRows('reminders', 'profile_id,civic_item_id,status', (query) => query.eq('status', 'active')),
  fetchAllRows('notification_preferences', 'profile_id,frequency,representative_votes,bill_updates,forecast_results')
]);
const notificationRows = buildNotificationRows({
  profiles,
  officials: [...officialMap.values()],
  civicItems: [...federalItems, ...federalVoteItems, ...floridaItems, ...floridaHouseItems],
  rollCalls,
  officialVotes,
  existingRollCallIds,
  previousItems,
  follows,
  savedItems,
  reminders,
  preferences: notificationPreferences,
  createdAt: new Date().toISOString()
});
await upsertBatches('notifications', notificationRows, 'profile_id,event_key', 500, true);

const completedAt = new Date().toISOString();
const { error: sourceCheckError } = await supabase.from('source_checks').insert(sources.map((source) => ({
  source_id: source.id,
  checked_at: completedAt,
  status: 'completed',
  message: 'Official-source sync completed.',
  raw_metadata: {
    officials: officialMap.size,
    civicItems: federalItems.length + federalVoteItems.length + floridaItems.length + floridaHouseItems.length,
    rollCalls: rollCalls.length,
    officialVotes: officialVotes.length
  }
})));
if (sourceCheckError) throw new Error(`source_checks: ${sourceCheckError.message}`);

console.log(JSON.stringify({
  officials: officialMap.size,
  civicItems: federalItems.length + federalVoteItems.length + floridaItems.length + floridaHouseItems.length,
  rollCalls: rollCalls.length,
  officialVotes: officialVotes.length,
  notificationsCreated: notificationRows.length,
  historicalOfficials,
  skippedVotes: 0
}, null, 2));
