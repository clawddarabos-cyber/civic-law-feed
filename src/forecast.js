const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'bill', 'by', 'for', 'from', 'has', 'house', 'in', 'is',
  'it', 'law', 'of', 'on', 'or', 'resolution', 'senate', 'that', 'the', 'this', 'to', 'under', 'with',
  'act', 'amendment', 'motion', 'passage', 'vote', 'votes', 'voting', 'federal', 'florida', 'state',
  'hr', 'hjres', 'hconres', 'hres', 's', 'sjres', 'sconres', 'sres', 'legislation', 'legislative',
  'provision', 'provisions', 'revise', 'revises', 'revision', 'laws', 'relating', 'committee'
]);

const TOPIC_RULES = {
  Agriculture: ['agriculture', 'farm', 'farmer', 'crop', 'livestock', 'food', 'rural'],
  'Budget and taxes': ['appropriation', 'budget', 'tax', 'revenue', 'spending', 'fiscal', 'debt', 'treasury'],
  Defense: ['defense', 'military', 'armed', 'veteran', 'weapon', 'national security'],
  Education: ['education', 'school', 'student', 'teacher', 'college', 'university', 'curriculum'],
  Elections: ['election', 'voting rights', 'ballot', 'campaign', 'candidate'],
  'Energy and environment': ['energy', 'environment', 'climate', 'water', 'pollution', 'conservation', 'wildlife', 'electric'],
  Health: ['health', 'medical', 'medicare', 'medicaid', 'hospital', 'drug', 'insurance', 'patient'],
  Immigration: ['immigration', 'immigrant', 'border', 'asylum', 'citizenship', 'visa'],
  Justice: ['crime', 'criminal', 'court', 'police', 'justice', 'prison', 'firearm', 'gun', 'sentencing'],
  Labor: ['labor', 'worker', 'employment', 'wage', 'union', 'workforce'],
  Housing: ['housing', 'homebuyer', 'mortgage', 'tenant', 'landlord', 'homeless'],
  'Technology and privacy': ['technology', 'privacy', 'data', 'cyber', 'internet', 'artificial intelligence', 'telecommunication'],
  Transportation: ['transportation', 'transit', 'highway', 'road', 'rail', 'aviation', 'airport', 'vehicle'],
  'Government operations': ['agency', 'government', 'regulation', 'rulemaking', 'ethics', 'procurement', 'administrative'],
  'Foreign affairs': ['foreign', 'international', 'sanction', 'treaty', 'diplomatic', 'aid']
};

function normalize(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stem(word) {
  if (word.length <= 4) return word;
  return word
    .replace(/(ization|ational|fulness|iveness|ments|ment|ation|ities)$/u, '')
    .replace(/(ingly|edly|ing|ed|es|s)$/u, '');
}

function tokens(value) {
  return new Set(normalize(value).split(' ').filter((word) => word.length > 2 && !STOP_WORDS.has(word)).map(stem));
}

function billText(bill = {}) {
  return [bill.title, bill.category, bill.summary, bill.aiSummary, bill.detail].filter(Boolean).join(' ');
}

function topicTags(value) {
  const text = normalize(value);
  return Object.entries(TOPIC_RULES)
    .filter(([, terms]) => terms.some((term) => text.includes(normalize(term))))
    .map(([topic]) => topic);
}

function intersection(left, right) {
  return [...left].filter((value) => right.has(value));
}

function sameSponsor(profile, sponsor = {}) {
  if (profile.bioguideId && sponsor.bioguideId === profile.bioguideId) return true;
  const profileName = normalize(profile.name).replace(/^(representative|senator) /, '');
  const sponsorName = normalize(sponsor.name).replace(/^(representative|senator) /, '');
  if (!profileName || !sponsorName) return false;
  return profileName === sponsorName || profileName.split(' ').at(-1) === sponsorName.split(' ').at(-1);
}

function analyzeCandidate(record, target, billMap) {
  const linkedBill = billMap.get(record.billId) || {};
  const text = [record.title, record.topic, billText(linkedBill)].filter(Boolean).join(' ');
  const candidateTokens = tokens(text);
  const candidateTopics = new Set(topicTags(text));
  const candidatePrimaryTopics = new Set(topicTags([record.title, linkedBill.title, linkedBill.category].filter(Boolean).join(' ')));
  const sharedPrimaryTopics = intersection(target.primaryTopics, candidatePrimaryTopics);
  const sharedTopics = intersection(target.topics, candidateTopics);
  const sharedTerms = intersection(target.tokens, candidateTokens).slice(0, 4);
  const sameCategory = target.category && linkedBill.category && normalize(target.category) === normalize(linkedBill.category)
    && normalize(target.category) !== 'legislation';
  const floorBoost = normalize(record.topic).includes('floor') ? 3 : 0;
  const score = sharedPrimaryTopics.length * 30 + sharedTopics.length * 18 + sharedTerms.length * 5 + (sameCategory ? 12 : 0) + floorBoost;
  if (score <= 0 || (target.topics.size && !sharedTopics.length)) return null;
  const relevanceTopics = [...new Set([...sharedPrimaryTopics, ...sharedTopics])];
  const relevance = relevanceTopics.length
    ? relevanceTopics.join(', ')
    : sameCategory
      ? `${target.category} policy`
      : `Shared terms: ${sharedTerms.join(', ')}`;
  return { ...record, relevance, relevanceScore: score };
}

export function buildBillVoteForecast(profile, bill, bills = []) {
  const archive = profile.archive || [];
  const billMap = new Map(bills.map((item) => [item.id, item]));
  const targetText = billText(bill);
  const target = {
    tokens: tokens(targetText),
    topics: new Set(topicTags(targetText)),
    primaryTopics: new Set(topicTags([bill.title, bill.category].filter(Boolean).join(' '))),
    category: bill.category
  };
  const unique = new Map();

  for (const record of archive) {
    if (record.billId && record.billId === bill.id) continue;
    const candidate = analyzeCandidate(record, target, billMap);
    if (!candidate) continue;
    const key = record.billId || normalize(record.title);
    const previous = unique.get(key);
    if (!previous || candidate.relevanceScore > previous.relevanceScore || candidate.sortDate > previous.sortDate) {
      unique.set(key, candidate);
    }
  }

  const evidence = [...unique.values()]
    .sort((left, right) => right.relevanceScore - left.relevanceScore || right.sortDate - left.sortDate)
    .slice(0, 3);
  const sponsored = (bill.sponsors || []).some((sponsor) => sameSponsor(profile, sponsor));

  if (evidence.length < 3) {
    return {
      vote: null,
      label: 'Unclear',
      confidence: 'Insufficient evidence',
      detail: `Only ${evidence.length} sufficiently related sourced vote${evidence.length === 1 ? '' : 's'} ${evidence.length === 1 ? 'was' : 'were'} found. Three are required for a forecast.`,
      evidence,
      signals: sponsored ? ['The official is listed as a sponsor of this measure.'] : []
    };
  }

  const yesVotes = evidence.filter((record) => record.vote === 'yes').length;
  const noVotes = evidence.length - yesVotes;
  let vote = yesVotes > noVotes ? 'yes' : 'no';
  const agreement = Math.max(yesVotes, noVotes) / evidence.length;
  const relevanceQuality = evidence.reduce((total, record) => total + Math.min(record.relevanceScore / 45, 1), 0) / evidence.length;
  let confidenceScore = Math.round(28 + agreement * 32 + relevanceQuality * 30);
  if (sponsored) {
    vote = 'yes';
    confidenceScore = Math.min(95, confidenceScore + 8);
  }
  const confidence = confidenceScore >= 80 ? 'High confidence' : confidenceScore >= 65 ? 'Moderate confidence' : 'Low confidence';
  const majority = vote === 'yes' ? yesVotes : noVotes;
  const unclear = confidenceScore < 58;

  return {
    vote: unclear ? null : vote,
    label: unclear ? 'Unclear' : `Likely ${vote === 'yes' ? 'Yes' : 'No'}`,
    confidence,
    confidenceScore,
    detail: sponsored
      ? `This official sponsors the measure, and ${yesVotes} of the 3 most relevant sourced votes were YES.`
      : `${majority} of the 3 most relevant sourced votes were ${vote.toUpperCase()}. Topic similarity and vote consistency determine the confidence level.`,
    evidence,
    signals: sponsored ? ['The official is listed as a sponsor of this measure.'] : []
  };
}

export function buildRecentVotePattern(recentVotes = []) {
  if (recentVotes.length < 3) {
    return { vote: null, label: 'Not enough history', detail: 'Three sourced member votes are required to show a recent voting pattern.' };
  }
  const yesVotes = recentVotes.filter((record) => record.vote === 'yes').length;
  const vote = yesVotes >= 2 ? 'yes' : 'no';
  const majority = vote === 'yes' ? yesVotes : recentVotes.length - yesVotes;
  return {
    vote,
    label: `${majority} of 3 ${vote.toUpperCase()}`,
    detail: 'This describes only the latest three recorded votes; it is not a bill-specific prediction.'
  };
}
