import { writeFile } from 'node:fs/promises';

const API_ROOT = 'https://api.congress.gov/v3';
const CONGRESS = process.env.CONGRESS_NUMBER || '119';
const API_KEY = process.env.CONGRESS_GOV_API_KEY || 'DEMO_KEY';
const LIMIT = Number(process.env.FEDERAL_IMPORT_LIMIT || 6);
const REQUEST_DELAY_MS = Number(process.env.FEDERAL_IMPORT_DELAY_MS || 900);

function apiUrl(path, params = {}) {
  const url = new URL(`${API_ROOT}${path}`);
  url.searchParams.set('format', 'json');
  url.searchParams.set('api_key', API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url;
}

async function fetchJson(path, params) {
  const response = await fetch(apiUrl(path, params));
  if (!response.ok) {
    throw new Error(`Congress.gov request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function optionalFetchJson(path, params) {
  try {
    return await fetchJson(path, params);
  } catch {
    return null;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function billTypePath(type) {
  const paths = {
    HR: 'house-bill',
    HRES: 'house-resolution',
    HJRES: 'house-joint-resolution',
    HCONRES: 'house-concurrent-resolution',
    S: 'senate-bill',
    SRES: 'senate-resolution',
    SJRES: 'senate-joint-resolution',
    SCONRES: 'senate-concurrent-resolution'
  };
  return paths[type] || type.toLowerCase();
}

function humanBillUrl(bill) {
  return `https://www.congress.gov/bill/${bill.congress}th-congress/${billTypePath(bill.type)}/${bill.number}`;
}

function chamberLabel(bill) {
  if (bill.type === 'HR') return `House Bill ${bill.number}`;
  if (bill.type === 'S') return `Senate Bill ${bill.number}`;
  return `${bill.type} ${bill.number}`;
}

function sentenceFromHtml(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function summaryForBill(bill) {
  const data = await fetchJson(`/bill/${bill.congress}/${bill.type.toLowerCase()}/${bill.number}/summaries`, {
    limit: 1
  });
  const summary = data.summaries?.[0]?.text;
  return sentenceFromHtml(summary);
}

async function contextForBill(bill) {
  const type = bill.type.toLowerCase();
  const basePath = `/bill/${bill.congress}/${type}/${bill.number}`;
  const detailData = await optionalFetchJson(basePath);
  await wait(REQUEST_DELAY_MS);
  const actionsData = await optionalFetchJson(`${basePath}/actions`, { limit: 5 });
  await wait(REQUEST_DELAY_MS);
  const committeesData = await optionalFetchJson(`${basePath}/committees`, { limit: 5 });

  const detailBill = detailData?.bill || {};
  const actions = (actionsData?.actions || []).map((action) => ({
    date: action.actionDate,
    text: sentenceFromHtml(action.text),
    type: action.type
  }));
  const committees = (committeesData?.committees || []).map((committee) => ({
    name: committee.name,
    chamber: committee.chamber,
    type: committee.type,
    activities: committee.activities || []
  }));
  const sponsors = (detailBill.sponsors || bill.sponsors || []).map((sponsor) => ({
    name: sponsor.fullName || [sponsor.firstName, sponsor.lastName].filter(Boolean).join(' '),
    party: sponsor.party,
    state: sponsor.state,
    bioguideId: sponsor.bioguideId,
    url: sponsor.url
  }));

  return {
    bill: { ...bill, ...detailBill },
    sponsors,
    committees,
    actions
  };
}

function normalizeBill(bill, summary, context) {
  const sourceUrl = humanBillUrl(bill);
  const latestAction = bill.latestAction?.text || 'Latest official action is available on Congress.gov.';
  const latestActionDate = bill.latestAction?.actionDate || bill.updateDate || bill.introducedDate;
  const shortSummary = summary || latestAction;
  const primarySponsor = context.sponsors[0]?.name || 'Sponsor listed on Congress.gov';
  const primaryCommittee = context.committees[0]?.name || 'Committee referral listed on Congress.gov';

  return {
    id: `congress-${bill.congress}-${bill.type.toLowerCase()}-${bill.number}`,
    title: bill.title,
    chamber: chamberLabel(bill),
    jurisdiction: 'Federal',
    level: 'Federal',
    status: latestAction,
    deadline: latestActionDate ? `Latest action ${latestActionDate}` : 'Latest action available',
    lastUpdated: bill.updateDate ? `Updated ${bill.updateDate}` : 'Updated by Congress.gov',
    sourceStatus: 'Congress.gov record checked',
    nextAction: `Review ${primarySponsor} and ${primaryCommittee}`,
    category: bill.policyArea?.name || 'Federal legislation',
    sourceName: 'Congress.gov',
    sourceUrl,
    officialTextUrl: sourceUrl,
    image: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1200&q=80',
    summary: shortSummary,
    detail: shortSummary,
    pros: [
      'Review the official text and CRS summary',
      'Check sponsors, committees, and latest actions',
      'Compare changes before voting or commenting'
    ],
    cons: [
      'Public impact depends on final text',
      'Committee and amendment activity may change the bill',
      'Fiscal and implementation details may require deeper review'
    ],
    yes: 0,
    no: 0,
    friendVotes: [],
    comments: 0,
    sponsors: context.sponsors,
    committees: context.committees,
    actions: context.actions,
    imported: {
      source: 'Congress.gov API',
      apiUrl: bill.url,
      congress: bill.congress,
      type: bill.type,
      number: bill.number,
      introducedDate: bill.introducedDate,
      latestActionDate,
      updateDate: bill.updateDate,
      detailLoaded: Boolean(context.sponsors.length || context.committees.length || context.actions.length)
    }
  };
}

async function main() {
  const data = await fetchJson(`/bill/${CONGRESS}`, {
    limit: LIMIT,
    sort: 'updateDate desc'
  });

  const items = [];
  for (const bill of data.bills || []) {
    const context = await contextForBill(bill);
    await wait(REQUEST_DELAY_MS);
    let summary = '';
    try {
      summary = await summaryForBill(context.bill);
    } catch {
      summary = '';
    }
    items.push(normalizeBill(context.bill, summary, context));
    await wait(REQUEST_DELAY_MS);
  }

  const output = {
    generatedAt: new Date().toISOString(),
    source: 'https://api.congress.gov/',
    congress: Number(CONGRESS),
    count: items.length,
    items
  };

  await writeFile('data/federal-civic-items.json', `${JSON.stringify(output, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
