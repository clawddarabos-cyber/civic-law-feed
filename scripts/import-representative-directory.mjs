import { mkdir, writeFile } from 'node:fs/promises';

const sources = {
  usHouse: 'https://clerk.house.gov/xml/lists/MemberData.xml',
  usSenate: 'https://www.senate.gov/legislative/LIS_MEMBER/cvc_member_data.xml',
  floridaHouse: 'https://www.flhouse.gov/Sections/Representatives/representatives.aspx'
};

const headers = { 'user-agent': 'Mozilla/5.0 Civic Law Feed representative directory importer' };

async function fetchText(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

function decodeText(value = '') {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&mdash;/g, '—')
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(block, name) {
  return decodeText(block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'))?.[1]);
}

function congressProfileUrl(name, bioguideId) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `https://www.congress.gov/member/${slug}/${bioguideId}`;
}

function parseUsHouse(xml) {
  return [...xml.matchAll(/<member>([\s\S]*?)<\/member>/gi)].map((match) => {
    const block = match[1];
    const statedistrict = tag(block, 'statedistrict');
    const state = statedistrict.slice(0, 2);
    const districtNumber = Number.parseInt(statedistrict.slice(2), 10);
    const bioguideId = tag(block, 'bioguideID');
    const name = tag(block, 'official-name') || tag(block, 'namelist');
    return {
      id: `congress-member-${bioguideId}`,
      bioguideId,
      name,
      office: `U.S. House District ${Number.isFinite(districtNumber) && districtNumber > 0 ? districtNumber : 'At Large'}`,
      level: 'Federal',
      chamber: 'U.S. House',
      state,
      district: Number.isFinite(districtNumber) ? districtNumber : 0,
      party: tag(block, 'party'),
      sourceName: 'U.S. House Clerk directory',
      sourceUrl: congressProfileUrl(name, bioguideId)
    };
  }).filter((official) => official.bioguideId && official.name);
}

function parseUsSenate(xml) {
  return [...xml.matchAll(/<senator[^>]*>([\s\S]*?)<\/senator>/gi)].map((match) => {
    const block = match[1];
    const bioguideId = tag(block, 'bioguideId');
    const name = [tag(block, 'first'), tag(block, 'last'), tag(block, 'suffix')].filter(Boolean).join(' ');
    return {
      id: `congress-member-${bioguideId}`,
      bioguideId,
      name,
      office: 'U.S. Senate',
      level: 'Federal',
      chamber: 'U.S. Senate',
      state: tag(block, 'state'),
      district: null,
      party: tag(block, 'party'),
      sourceName: 'U.S. Senate directory',
      sourceUrl: congressProfileUrl(name, bioguideId)
    };
  });
}

function parseFloridaHouse(html) {
  const pattern = /<a href="(\/Sections\/Representatives\/details\.aspx\?MemberId=(\d+)&amp;LegislativeTermId=\d+)"[\s\S]*?<h5>([\s\S]*?)<\/h5>\s*<p>([^<]+)&mdash;\s*<span[^>]*>District:\s*(\d+)<\/span>/gi;
  return [...html.matchAll(pattern)].map((match) => ({
    id: `fl-house-${match[5]}`,
    memberId: match[2],
    name: decodeText(match[3]),
    office: `Florida House District ${match[5]}`,
    level: 'State',
    chamber: 'Florida House',
    state: 'FL',
    district: Number(match[5]),
    party: decodeText(match[4]),
    sourceName: 'Florida House profile',
    sourceUrl: new URL(match[1].replace(/&amp;/g, '&'), sources.floridaHouse).toString()
  }));
}

const [usHouseHtml, usSenateHtml] = await Promise.all([
  fetchText(sources.usHouse),
  fetchText(sources.usSenate)
]);

let floridaHouseHtml = '';
try {
  floridaHouseHtml = await fetchText(sources.floridaHouse);
} catch (error) {
  console.warn(`Florida House directory unavailable: ${error.message}`);
}

const officials = [
  ...parseUsHouse(usHouseHtml),
  ...parseUsSenate(usSenateHtml),
  ...parseFloridaHouse(floridaHouseHtml)
];

const output = {
  generatedAt: new Date().toISOString(),
  sources,
  counts: {
    usHouse: officials.filter((official) => official.chamber === 'U.S. House').length,
    usSenate: officials.filter((official) => official.chamber === 'U.S. Senate').length,
    floridaHouse: officials.filter((official) => official.chamber === 'Florida House').length
  },
  warnings: floridaHouseHtml ? [] : ['Florida House directory rejected the automated request; no Florida House names were imported.'],
  officials
};

await mkdir('data', { recursive: true });
await writeFile('data/representative-directory.json', `${JSON.stringify(output, null, 2)}\n`);
console.log(`Imported ${output.counts.usHouse} U.S. House, ${output.counts.usSenate} U.S. Senate, and ${output.counts.floridaHouse} Florida House officials.`);
