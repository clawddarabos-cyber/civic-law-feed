import assert from 'node:assert/strict';
import test from 'node:test';
import { buildBillVoteForecast } from './forecast.js';

const target = {
  id: 'target',
  title: 'Clean Water Infrastructure Act',
  category: 'Environment',
  summary: 'Funds drinking water treatment and pollution controls.',
  detail: '',
  sponsors: []
};

const profile = {
  name: 'Alex Example',
  archive: [
    { billId: 'unrelated', title: 'Annual defense authorization', vote: 'no', sortDate: 9, sourceUrl: '#' },
    { billId: 'water-1', title: 'Safe Drinking Water Grants', vote: 'yes', sortDate: 8, sourceUrl: '#' },
    { billId: 'water-2', title: 'Water Pollution Control Funding', vote: 'yes', sortDate: 7, sourceUrl: '#' },
    { billId: 'water-3', title: 'Municipal Water Treatment Standards', vote: 'no', sortDate: 6, sourceUrl: '#' },
    { billId: 'target', title: 'Clean Water Infrastructure Act', vote: 'yes', sortDate: 10, sourceUrl: '#' }
  ]
};

test('uses three relevant historical measures and excludes the current measure', () => {
  const result = buildBillVoteForecast(profile, target, []);
  assert.equal(result.label, 'Likely Yes');
  assert.deepEqual(result.evidence.map((vote) => vote.billId).sort(), ['water-1', 'water-2', 'water-3']);
});

test('returns unclear when fewer than three related votes exist', () => {
  const result = buildBillVoteForecast({ ...profile, archive: profile.archive.slice(0, 2) }, target, []);
  assert.equal(result.label, 'Unclear');
  assert.equal(result.vote, null);
});

test('uses sponsorship as a transparent supporting signal', () => {
  const sponsoredTarget = { ...target, sponsors: [{ name: 'Alex Example' }] };
  const result = buildBillVoteForecast(profile, sponsoredTarget, []);
  assert.equal(result.vote, 'yes');
  assert.match(result.detail, /sponsors the measure/i);
});
