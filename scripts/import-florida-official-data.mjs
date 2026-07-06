import { mkdir, writeFile } from 'node:fs/promises';

const sources = {
  senateMembers: 'https://www.flsenate.gov/Senators',
  senateBills: 'https://www.flsenate.gov/Session/Bills/2026',
  houseMembers: 'https://www.flhouse.gov/Sections/Representatives/representatives.aspx'
};

const headers = {
  'user-agent': 'Mozilla/5.0 Civic Law Feed prototype data importer'
};

async function fetchText(url) {
  const response = await fetch(url, { headers });
  const body = await response.text();
  return { ok: response.ok && !body.includes('Request Rejected'), status: response.status, body };
}

function cleanText(value) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSenators(html) {
  const rows = [...html.matchAll(/<tr class="[^"]*">([\s\S]*?)<\/tr>/g)];
  return rows.map((row) => {
    const rowHtml = row[1];
    const link = rowHtml.match(/<a class="senatorLink" href="([^"]+)">([\s\S]*?)<\/a>/);
    const district = rowHtml.match(/<td class="middle">(\d+)<\/td>/);
    const party = rowHtml.match(/<td class="middle">([^<]+)<\/td>\s*<td class="lefttext">/);
    if (!link || !district || !party) return null;
    const [, href, labelHtml] = link;
    const name = cleanText(labelHtml).replace(/^Senator\s+/i, '');
    return {
      id: `fl-senate-${district[1]}`,
      name,
      chamber: 'Florida Senate',
      district: Number(district[1]),
      party: cleanText(party[1]),
      profileUrl: new URL(href, sources.senateMembers).toString(),
      claimStatus: 'unclaimed'
    };
  }).filter(Boolean);
}

function parseSenateBills(html) {
  const rows = [...html.matchAll(/<tr[^>]*>\s*<th scope="row"><a href="(\/Session\/Bill\/2026\/\d+)">([^<]+)<\/a><\/th>([\s\S]*?)<\/tr>/g)];
  return rows.slice(0, 40).map((match) => {
    const [, href, number, rowHtml] = match;
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((cell) => cleanText(cell[1]));
    const [title, filedBy, lastActionCell] = cells;
    const lastAction = lastActionCell?.replace(/^Last Action:\s*/i, '') || '';
    return {
      id: `fl-2026-${cleanText(number).toLowerCase().replace(/\s+/g, '-')}`,
      number: cleanText(number),
      title,
      filedBy,
      chamber: 'Florida Senate',
      session: '2026',
      lastAction,
      sourceUrl: new URL(href, sources.senateBills).toString()
    };
  });
}

const senateMembersResponse = await fetchText(sources.senateMembers);
const senateBillsResponse = await fetchText(sources.senateBills);
const houseMembersResponse = await fetchText(sources.houseMembers);

const data = {
  generatedAt: new Date().toISOString(),
  window: {
    mvpStartYear: 2020,
    note: 'Store all available official records; default MVP views to 2020-present.'
  },
  sources,
  sourceStatus: {
    senateMembers: { ok: senateMembersResponse.ok, status: senateMembersResponse.status },
    senateBills: { ok: senateBillsResponse.ok, status: senateBillsResponse.status },
    houseMembers: {
      ok: houseMembersResponse.ok,
      status: houseMembersResponse.status,
      note: houseMembersResponse.ok ? 'Fetched successfully' : 'Official site rejected automated fetch; keep as manual/source-link target for now.'
    }
  },
  officials: senateMembersResponse.ok ? parseSenators(senateMembersResponse.body) : [],
  bills: senateBillsResponse.ok ? parseSenateBills(senateBillsResponse.body) : []
};

await mkdir('data', { recursive: true });
await writeFile('data/florida-official-data.json', `${JSON.stringify(data, null, 2)}\n`);

console.log(`Imported ${data.officials.length} Florida Senate officials and ${data.bills.length} Senate bills.`);
if (!data.sourceStatus.houseMembers.ok) {
  console.log(data.sourceStatus.houseMembers.note);
}
