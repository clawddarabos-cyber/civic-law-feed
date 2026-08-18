import { writeFile } from 'node:fs/promises';

const API_ROOT = 'https://api.congress.gov/v3';
const CONGRESS = process.env.CONGRESS_NUMBER || '119';
const API_KEY = process.env.CONGRESS_GOV_API_KEY || 'DEMO_KEY';
const LIMIT = Number(process.env.FEDERAL_MEMBER_IMPORT_LIMIT || 50);
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

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function memberUrl(member) {
  if (member.bioguideId && member.name) {
    const slug = member.name
      .toLowerCase()
      .replace(/\[[^\]]+\]/g, '')
      .replace(/\b(rep|sen)\b/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `https://www.congress.gov/member/${slug}/${member.bioguideId}`;
  }
  if (member.url?.includes('/member/')) {
    return member.url
      .replace('https://api.congress.gov/v3/member/', 'https://www.congress.gov/member/')
      .replace(/\?.*$/, '');
  }
  return 'https://www.congress.gov/members';
}

function normalizeMember(member) {
  const latestTerm = member.terms?.item?.at?.(-1) || member.terms?.at?.(-1) || {};
  const chamber = latestTerm.chamber || member.chamber || 'Congress';
  const district = member.district ? ` District ${member.district}` : '';
  const party = member.partyName || member.party || '';
  const name = member.name || member.directOrderName || [member.firstName, member.lastName].filter(Boolean).join(' ');

  return {
    id: `congress-member-${member.bioguideId || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    bioguideId: member.bioguideId,
    name,
    office: `${chamber}, ${member.state || 'United States'}${district}`,
    jurisdiction: 'Federal',
    state: member.state,
    district: member.district || null,
    party,
    status: 'Official profile',
    sourceName: 'Congress.gov member record',
    sourceUrl: memberUrl(member),
    apiUrl: member.url || null,
    votes: {},
    sponsoredItems: [],
    archiveSince: String(CONGRESS),
    archive: []
  };
}

async function main() {
  const data = await fetchJson(`/member/congress/${CONGRESS}`, {
    limit: LIMIT,
    currentMember: true
  });

  const officials = [];
  for (const member of data.members || []) {
    officials.push(normalizeMember(member));
    await wait(REQUEST_DELAY_MS);
  }

  const output = {
    generatedAt: new Date().toISOString(),
    source: 'https://api.congress.gov/',
    congress: Number(CONGRESS),
    count: officials.length,
    officials
  };

  await writeFile('data/federal-official-data.json', `${JSON.stringify(output, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
