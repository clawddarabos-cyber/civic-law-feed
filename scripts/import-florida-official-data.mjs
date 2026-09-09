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
  return rows.map((match) => {
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

function getPageCount(html) {
  const pageNumbers = [...html.matchAll(/PageNumber=(\d+)/g)].map((match) => Number(match[1]));
  return Math.max(1, ...pageNumbers);
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

function formatEasternDate(date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

async function importSenateBills(firstPageResponse) {
  if (!firstPageResponse.ok) return [];
  const pageCount = getPageCount(firstPageResponse.body);
  const remainingPages = Array.from({ length: pageCount - 1 }, (_, index) => index + 2);
  const pageResponses = await mapWithConcurrency(remainingPages, 6, (pageNumber) => (
    fetchText(`${sources.senateBills}?PageNumber=${pageNumber}`)
  ));
  const bills = [firstPageResponse, ...pageResponses]
    .filter((response) => response.ok)
    .flatMap((response) => parseSenateBills(response.body));
  return [...new Map(bills.map((bill) => [bill.id, bill])).values()];
}

function parseVoteHistory(html, bill) {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].filter((row) => row[1].includes('Vote Record.PDF'));
  return rows.map((row, index) => {
    const rowHtml = row[1];
    const link = rowHtml.match(/<a href="([^"]+Vote[^"]+\.PDF)" target="_blank">(\d+)\s+Yeas\s+-\s+(\d+)\s+Nays<\/a>/);
    if (!link) return null;
    const [, href, yeas, nays] = link;
    const context = cleanText(rowHtml);
    const date = context.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)?.[1] || '';
    const chamber = context.includes('Vote History - Floor') ? 'Floor' : 'Committee';
    return {
      id: `${bill.id}-vote-${index + 1}`,
      billId: bill.id,
      billNumber: bill.number,
      billTitle: bill.title,
      chamber,
      date,
      yeas: Number(yeas),
      nays: Number(nays),
      sourceUrl: new URL(href, bill.sourceUrl).toString()
    };
  }).filter(Boolean);
}

async function importVoteHistory(bills, windowStartDate) {
  const rollCallGroups = await mapWithConcurrency(bills, 4, async (bill) => {
    const response = await fetchText(bill.sourceUrl);
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (!response.ok) return [];
    return parseVoteHistory(response.body, bill).filter((rollCall) => {
      const voteDate = new Date(rollCall.date);
      return Number.isFinite(voteDate.getTime()) && voteDate >= windowStartDate;
    });
  });
  return rollCallGroups.flat();
}

const senateMembersResponse = await fetchText(sources.senateMembers);
const senateBillsResponse = await fetchText(sources.senateBills);
const houseMembersResponse = await fetchText(sources.houseMembers);
const generatedAt = new Date();
const windowStartDate = new Date(generatedAt);
windowStartDate.setUTCDate(windowStartDate.getUTCDate() - 365);
const windowEndDate = formatEasternDate(generatedAt);
const windowStart = formatEasternDate(windowStartDate);
const senateBills = await importSenateBills(senateBillsResponse);

const data = {
  generatedAt: generatedAt.toISOString(),
  window: {
    startDate: windowStart,
    endDate: windowEndDate,
    label: 'Past 12 months',
    note: 'Florida Senate roll calls published during the stated 12-month window. Profiles show only sourced member-level votes.'
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
  bills: senateBills,
  rollCalls: []
};

data.rollCalls = await importVoteHistory(data.bills, windowStartDate);

await mkdir('data', { recursive: true });
await writeFile('data/florida-official-data.json', `${JSON.stringify(data, null, 2)}\n`);

console.log(`Imported ${data.officials.length} Florida Senate officials, ${data.bills.length} Senate bills, and ${data.rollCalls.length} vote-history records.`);
if (!data.sourceStatus.houseMembers.ok) {
  console.log(data.sourceStatus.houseMembers.note);
}
