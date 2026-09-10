import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AtSign,
  Bell,
  Bookmark,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight,
  CircleUserRound,
  ExternalLink,
  FileText,
  Filter,
  Home,
  LocateFixed,
  MapPin,
  MessageSquare,
  Moon,
  MoreHorizontal,
  PenLine,
  Repeat2,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  Sun,
  SlidersHorizontal,
  ThumbsDown,
  ThumbsUp,
  Users,
  X
} from 'lucide-react';
import federalCivicItems from '../data/federal-civic-items.json';
import federalOfficialData from '../data/federal-official-data.json';
import floridaOfficialData from '../data/florida-official-data.json';
import representativeDirectory from '../data/representative-directory.json';
import {
  backendLabel,
  cloudConfigured,
  createComment,
  createSourceReport,
  getAuthSession,
  loadCloudActivity,
  loadPublicCivicData,
  sendSignInLink,
  signOutUser,
  subscribeToAuth,
  syncFollowTarget,
  syncLocalSnapshot,
  syncPreferences,
  syncReminder,
  syncSavedItem,
  syncUserVote
} from './backend.js';
import { getGuestProfileId, removeStoredValues, storageKeys, useStoredSet, useStoredState } from './storage.js';

const prototypeBills = [
  {
    id: 'hb-418',
    title: 'Clean Water Infrastructure Renewal Act',
    chamber: 'House Bill 418',
    jurisdiction: 'Florida',
    level: 'State',
    status: 'Voting closes in 2 days',
    deadline: 'Comment or vote by Aug 20',
    lastUpdated: 'Updated 2h ago',
    sourceStatus: 'Official source checked',
    nextAction: 'Review water-quality reporting rules',
    category: 'Environment',
    sourceName: 'Florida House Bills',
    sourceUrl: 'https://www.flhouse.gov/sections/bills/bills.aspx',
    officialTextUrl: 'https://www.flhouse.gov/sections/bills/bills.aspx',
    image:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    summary:
      'Funds upgrades for aging water treatment systems and requires annual public reporting on local water quality metrics.',
    detail:
      'This proposal creates a matching grant program for counties and municipalities replacing high-risk water infrastructure. It also requires utilities to publish annual testing data in a standardized public format.',
    pros: ['Improves public health transparency', 'Helps smaller counties modernize systems', 'Creates construction and inspection work'],
    cons: ['Requires new state spending', 'May raise compliance costs for local utilities', 'Implementation timeline is aggressive'],
    yes: 12840,
    no: 4930,
    friendVotes: [
      { name: 'Maria', vote: 'yes' },
      { name: 'Anthony', vote: 'yes' },
      { name: 'Reese', vote: 'no' }
    ],
    comments: 348
  },
  {
    id: 'sb-92',
    title: 'Small Business Property Tax Relief',
    chamber: 'County ordinance agenda item',
    jurisdiction: 'St. Johns County',
    level: 'County',
    status: 'Committee vote tomorrow',
    deadline: 'Committee vote Aug 19',
    lastUpdated: 'Updated 4h ago',
    sourceStatus: 'Agenda source checked',
    nextAction: 'Check exemption eligibility language',
    category: 'Economy',
    sourceName: 'St. Johns County BCC Agendas',
    sourceUrl: 'https://stjohnsclerk.com/board-records/agendas/',
    officialTextUrl: 'https://stjohnsclerk.com/board-records/agendas/',
    image:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
    summary:
      'Expands property tax exemptions for qualifying small businesses with fewer than 25 employees.',
    detail:
      'The bill increases the exemption threshold for business equipment and storefront improvements. Local governments would receive a temporary state offset for the first two fiscal years.',
    pros: ['Lowers operating costs for small businesses', 'Encourages storefront upgrades', 'Includes a temporary local revenue offset'],
    cons: ['May reduce future county revenue', 'Eligibility rules could be complex', 'Benefits may cluster in higher-value districts'],
    yes: 9620,
    no: 7210,
    friendVotes: [
      { name: 'Dana', vote: 'yes' },
      { name: 'Chris', vote: 'no' }
    ],
    comments: 214
  },
  {
    id: 'hb-771',
    title: 'Student Data Privacy Standards',
    chamber: 'Federal bill',
    jurisdiction: 'Federal',
    level: 'Federal',
    status: 'Floor vote Friday',
    deadline: 'Floor vote Aug 21',
    lastUpdated: 'Updated today',
    sourceStatus: 'Federal source checked',
    nextAction: 'Compare vendor privacy requirements',
    category: 'Education',
    sourceName: 'Congress.gov',
    sourceUrl: 'https://www.congress.gov/',
    officialTextUrl: 'https://www.congress.gov/',
    image:
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80',
    summary:
      'Sets national limits on how education technology vendors collect, retain, and sell student data.',
    detail:
      'Schools would need written privacy agreements with vendors, annual deletion audits, and parent-accessible data summaries. The bill restricts targeted advertising based on student profiles.',
    pros: ['Protects minors from data resale', 'Creates consistent vendor standards', 'Gives parents better visibility'],
    cons: ['Could raise software costs for schools', 'Adds administrative work', 'Smaller vendors may struggle to comply'],
    yes: 18690,
    no: 3910,
    friendVotes: [
      { name: 'Alex', vote: 'yes' },
      { name: 'Priya', vote: 'yes' },
      { name: 'Sam', vote: 'yes' }
    ],
    comments: 581
  },
  {
    id: 'sb-144',
    title: 'Public Transit Reliability Funding',
    chamber: 'Public hearing item',
    jurisdiction: 'St. Johns County',
    level: 'County',
    status: 'Public comment open',
    deadline: 'Public comment open now',
    lastUpdated: 'Updated yesterday',
    sourceStatus: 'Calendar source checked',
    nextAction: 'Review hearing time and comment rules',
    category: 'Transportation',
    sourceName: 'St. Johns County Calendar',
    sourceUrl: 'https://www.sjcfl.us/bcc-calendar/',
    officialTextUrl: 'https://www.sjcfl.us/bcc-calendar/',
    image:
      'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=1200&q=80',
    summary:
      'Creates performance-based funding for transit agencies that improve on-time service and accessibility.',
    detail:
      'Transit agencies would receive funding incentives tied to on-time performance, station accessibility upgrades, and public reporting. The program prioritizes high-ridership corridors.',
    pros: ['Links funding to measurable service', 'Prioritizes accessibility', 'Improves public accountability'],
    cons: ['May disadvantage already underfunded routes', 'Performance measures can be gamed', 'Requires new reporting systems'],
    yes: 11180,
    no: 8450,
    friendVotes: [
      { name: 'Jordan', vote: 'no' },
      { name: 'Morgan', vote: 'yes' }
    ],
    comments: 402
  }
];

const fallbackBills = [...federalCivicItems.items, ...prototypeBills];

const filters = ['All', 'Federal', 'State', 'County'];

const topicSuggestions = ['Water quality', 'Small business', 'Student privacy', 'Public transit', 'Rulemaking', 'Local agendas'];

const chatThreads = [
  {
    id: 'water-watch',
    title: 'Water infrastructure watch',
    handle: '@waterquality',
    excerpt: '3 new official documents were added to the water quality tracker.',
    count: 12
  },
  {
    id: 'county-agendas',
    title: 'County agenda room',
    handle: '@localagendas',
    excerpt: 'Compare tomorrow’s committee agenda with saved transit items.',
    count: 7
  },
  {
    id: 'school-privacy',
    title: 'Student privacy notes',
    handle: '@edpolicy',
    excerpt: 'Parents are asking for a plain-English vendor-data checklist.',
    count: 19
  }
];

const officialSourceRegistry = [
  {
    level: 'Federal',
    sources: [
      { name: 'Congress.gov', url: 'https://www.congress.gov/' },
      { name: 'GovInfo', url: 'https://www.govinfo.gov/' },
      { name: 'Federal Register', url: 'https://www.federalregister.gov/' },
      { name: 'Regulations.gov', url: 'https://www.regulations.gov/' },
      { name: 'eCFR', url: 'https://www.ecfr.gov/' }
    ]
  },
  {
    level: 'State',
    sources: [
      { name: 'Official state legislature sites', url: 'https://www.usa.gov/state-governments' },
      { name: 'State bill text, amendments, journals, and roll calls', url: 'https://www.usa.gov/state-governments' },
      { name: 'State executive agency rulemaking portals', url: 'https://www.usa.gov/state-governments' }
    ]
  },
  {
    level: 'Local',
    sources: [
      { name: 'County and city commission agendas', url: 'https://www.usa.gov/local-governments' },
      { name: 'Clerk, recorder, and board minutes portals', url: 'https://www.usa.gov/local-governments' },
      { name: 'Local official directories and election offices', url: 'https://www.usa.gov/local-governments' }
    ]
  }
];

const floridaOfficialProfiles = floridaOfficialData.officials.map((official) => ({
  id: official.id,
  name: official.name,
  office: `${official.chamber} District ${official.district}`,
  jurisdiction: 'Florida',
  state: 'FL',
  district: official.district,
  chamber: 'Florida Senate',
  party: official.party,
  status: official.claimStatus === 'unclaimed' ? 'Unclaimed profile' : 'Claimed profile',
  sourceName: 'Florida Senate profile',
  sourceUrl: official.profileUrl,
  votes: {},
  archiveWindow: floridaOfficialData.window,
  archive: floridaOfficialData.rollCalls
    .flatMap((rollCall) => {
      const surname = official.name.split(',')[0].trim().toLowerCase();
      const memberVote = rollCall.memberVotes?.find((vote) => vote.name.toLowerCase() === surname);
      return memberVote ? [{
        id: rollCall.id,
        title: `${rollCall.billNumber}: ${rollCall.billTitle}`,
        year: rollCall.date,
        topic: `${rollCall.chamber} vote`,
        vote: memberVote.vote,
        sourceUrl: rollCall.sourceUrl,
        sortDate: new Date(rollCall.date).getTime()
      }] : [];
    })
    .sort((a, b) => b.sortDate - a.sortDate)
}));

const federalOfficialProfiles = federalOfficialData.officials.map((official) => ({
  id: official.id,
  bioguideId: official.bioguideId,
  name: official.name,
  office: official.office,
  jurisdiction: official.jurisdiction,
  state: official.state,
  district: official.district,
  chamber: official.office?.toLowerCase().includes('senate') ? 'U.S. Senate' : 'U.S. House',
  party: official.party,
  status: official.status,
  sourceName: official.sourceName,
  sourceUrl: official.sourceUrl,
  votes: official.votes || {},
  sponsoredItems: official.sponsoredItems || [],
  archiveWindow: official.archiveWindow || {
    startDate: official.archiveSince,
    endDate: 'Present',
    label: 'Available official history',
    note: 'Federal member-level roll-call history has not been imported yet.'
  },
  archive: official.archive || []
}));

const directoryOfficialProfiles = representativeDirectory.officials.map((official) => ({
  ...official,
  jurisdiction: official.level === 'Federal' ? 'Federal' : 'Florida',
  status: 'Official directory profile',
  votes: {},
  archiveWindow: {
    startDate: null,
    endDate: 'Present',
    label: 'Voting history expansion pending',
    note: 'Member-level voting history has not been imported for this chamber yet.'
  },
  archive: []
}));

const officialProfileMap = new Map(directoryOfficialProfiles.map((profile) => [profile.id, profile]));
for (const profile of [...federalOfficialProfiles, ...floridaOfficialProfiles]) {
  officialProfileMap.set(profile.id, { ...officialProfileMap.get(profile.id), ...profile });
}
const fallbackOfficialProfiles = [...officialProfileMap.values()];

const fallbackBillMap = new Map(fallbackBills.map((bill) => [bill.id, bill]));
const fallbackProfileMap = new Map(fallbackOfficialProfiles.map((profile) => [profile.id, profile]));
const defaultBillImages = {
  Federal: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1200&q=80',
  State: 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=1200&q=80',
  County: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
  City: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=1200&q=80'
};

function normalizeCloudPublicData(data) {
  const cloudBills = data.civicItems.map((row) => {
    const fallback = fallbackBillMap.get(row.id) || {};
    const imported = row.imported_metadata || {};
    const updatedAt = row.updated_at || row.imported_at || row.latest_action_at;
    return {
      ...fallback,
      id: row.id,
      title: row.title,
      chamber: row.chamber || fallback.chamber || 'Legislative item',
      jurisdiction: row.jurisdiction,
      level: row.level,
      status: row.status || 'Official status pending',
      deadline: row.latest_action_at ? `Latest action ${formatCloudDate(row.latest_action_at)}` : 'No deadline published',
      lastUpdated: updatedAt ? `Updated ${formatCloudDate(updatedAt)}` : 'Update time unavailable',
      sourceStatus: 'Official source synced',
      nextAction: row.detail || row.status || 'Review the official record',
      category: row.category || 'Legislation',
      sourceName: row.source_name || fallback.sourceName || inferSourceName(row),
      sourceUrl: row.source_url,
      officialTextUrl: row.official_text_url || row.source_url,
      image: row.image_url || fallback.image || defaultBillImages[row.level] || defaultBillImages.State,
      summary: row.summary || row.detail || row.title,
      aiSummary: row.ai_summary || row.summary || row.detail || row.title,
      summaryLabel: row.ai_summary && row.ai_summary !== row.title ? 'AI summary' : 'Official description',
      detail: row.detail || row.summary || row.title,
      pros: Array.isArray(row.pros) && row.pros.length ? row.pros : (fallback.pros || []),
      cons: Array.isArray(row.cons) && row.cons.length ? row.cons : (fallback.cons || []),
      sponsors: Array.isArray(row.sponsors) && row.sponsors.length ? row.sponsors : (fallback.sponsors || []),
      committees: Array.isArray(row.committees) && row.committees.length ? row.committees : (fallback.committees || []),
      actions: Array.isArray(row.actions) && row.actions.length ? row.actions : (fallback.actions || []),
      imported: { ...imported, updateDate: imported.updateDate || updatedAt },
      yes: fallback.yes || 0,
      no: fallback.no || 0,
      friendVotes: fallback.friendVotes || [],
      comments: fallback.comments || 0
    };
  });

  const rollCallMap = new Map(data.rollCalls.map((rollCall) => [rollCall.id, rollCall]));
  const archivesByOfficial = new Map();
  for (const officialVote of data.officialVotes) {
    const rollCall = rollCallMap.get(officialVote.roll_call_id);
    if (!rollCall) continue;
    const records = archivesByOfficial.get(officialVote.official_id) || [];
    records.push({
      id: rollCall.id,
      billId: rollCall.civic_item_id,
      title: `${rollCall.bill_number}: ${rollCall.title}`,
      year: formatCloudDate(rollCall.vote_date),
      topic: `${rollCall.chamber} vote`,
      vote: officialVote.vote,
      sourceUrl: officialVote.source_url || rollCall.source_url,
      sortDate: new Date(`${rollCall.vote_date}T00:00:00`).getTime()
    });
    archivesByOfficial.set(officialVote.official_id, records);
  }

  const archiveDates = data.rollCalls.map((rollCall) => rollCall.vote_date).filter(Boolean).sort();
  const cloudArchiveWindow = {
    startDate: archiveDates[0] || null,
    endDate: archiveDates.at(-1) || 'Present',
    label: 'Validated cloud archive',
    note: 'Member-level votes loaded from validated official roll calls in Supabase.'
  };
  const cloudProfiles = data.officials.map((row) => {
    const fallback = fallbackProfileMap.get(row.id) || {};
    const metadata = row.imported_metadata || {};
    const archive = (archivesByOfficial.get(row.id) || []).sort((a, b) => b.sortDate - a.sortDate);
    const numericDistrict = row.district === null || row.district === '' ? null : Number(row.district);
    return {
      ...fallback,
      id: row.id,
      bioguideId: metadata.bioguideId || fallback.bioguideId,
      name: row.name,
      office: row.office,
      jurisdiction: row.jurisdiction,
      state: row.state,
      district: Number.isFinite(numericDistrict) ? numericDistrict : row.district,
      chamber: metadata.chamber || fallback.chamber || inferOfficialChamber(row.office),
      party: row.party,
      status: row.claim_status === 'inactive' ? 'Historical official record' : row.claim_status === 'claimed' ? 'Claimed profile' : 'Official directory profile',
      sourceName: fallback.sourceName || `${metadata.chamber || inferOfficialChamber(row.office)} official source`,
      sourceUrl: row.source_url,
      votes: archive.length
        ? Object.fromEntries(archive.filter((record) => record.billId).map((record) => [record.billId, record.vote]))
        : (fallback.votes || {}),
      sponsoredItems: fallback.sponsoredItems || [],
      archiveWindow: archive.length ? cloudArchiveWindow : (fallback.archiveWindow || {
        startDate: null,
        endDate: 'Present',
        label: 'Voting history expansion pending',
        note: 'Member-level voting history has not been imported for this chamber yet.'
      }),
      archive: archive.length ? archive : (fallback.archive || [])
    };
  });
  const latestAt = data.latestCheck?.checked_at || newestTimestamp([
    ...data.civicItems.map((item) => item.updated_at || item.imported_at),
    ...data.officials.map((official) => official.updated_at)
  ]);
  return {
    bills: cloudBills,
    officialProfiles: cloudProfiles,
    mode: 'live',
    lastUpdated: latestAt,
    stale: latestAt ? Date.now() - new Date(latestAt).getTime() > 36 * 60 * 60 * 1000 : true,
    counts: {
      civicItems: cloudBills.length,
      officials: cloudProfiles.length,
      rollCalls: data.rollCalls.length,
      officialVotes: data.officialVotes.length,
      usHouse: cloudProfiles.filter((profile) => profile.chamber === 'U.S. House').length,
      usSenate: cloudProfiles.filter((profile) => profile.chamber === 'U.S. Senate').length,
      floridaSenate: cloudProfiles.filter((profile) => profile.chamber === 'Florida Senate' && profile.status !== 'Historical official record').length,
      floridaHouse: cloudProfiles.filter((profile) => profile.chamber === 'Florida House' && profile.status !== 'Historical official record').length
    }
  };
}

function inferSourceName(row) {
  if (row.level === 'Federal') return 'Congress.gov';
  if (row.jurisdiction === 'Florida') return 'Florida Legislature';
  return `${row.jurisdiction} official source`;
}

function inferOfficialChamber(office = '') {
  if (office.includes('Florida Senate')) return 'Florida Senate';
  if (office.includes('U.S. Senate')) return 'U.S. Senate';
  if (office.includes('U.S. House')) return 'U.S. House';
  return 'Public office';
}

function newestTimestamp(values) {
  return values.filter(Boolean).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;
}

function formatCloudDate(value) {
  if (!value) return 'Not available';
  const date = new Date(String(value).length === 10 ? `${value}T00:00:00` : value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : value;
}

const fallbackPublicData = {
  bills: fallbackBills,
  officialProfiles: fallbackOfficialProfiles,
  mode: cloudConfigured ? 'loading' : 'fallback',
  lastUpdated: newestTimestamp([federalCivicItems.generatedAt, floridaOfficialData.generatedAt, representativeDirectory.generatedAt]),
  stale: true,
  counts: {
    civicItems: fallbackBills.length,
    officials: fallbackOfficialProfiles.length,
    rollCalls: floridaOfficialData.rollCalls.length,
    officialVotes: floridaOfficialData.rollCalls.reduce((total, rollCall) => total + (rollCall.memberVotes?.length || 0), 0),
    usHouse: representativeDirectory.counts.usHouse,
    usSenate: representativeDirectory.counts.usSenate,
    floridaSenate: floridaOfficialData.officials.length,
    floridaHouse: representativeDirectory.counts?.floridaHouse || 0
  }
};

const defaultJurisdiction = {
  label: 'Nationwide demo',
  state: 'All states',
  stateCode: null,
  county: 'All counties',
  congressionalDistrict: null,
  stateSenateDistrict: null,
  stateHouseDistrict: null,
  levels: ['Federal', 'State', 'County']
};

function App() {
  const [publicData, setPublicData] = useState(fallbackPublicData);
  const bills = publicData.bills;
  const officialProfiles = publicData.officialProfiles;
  const [activeSection, setActiveSection] = useState('feed');
  const [activeTab, setActiveTab] = useState('forYou');
  const [activeFilter, setActiveFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(fallbackBills[0].id);
  const [votes, setVotes] = useStoredState(storageKeys.votes, {});
  const [saved, setSaved] = useStoredSet(storageKeys.saved, ['hb-771']);
  const [followed, setFollowed] = useStoredSet(storageKeys.followed, ['Federal', 'Congress.gov']);
  const [reminders, setReminders] = useStoredSet(storageKeys.reminders, ['sb-144']);
  const [reposted, setReposted] = useStoredSet(storageKeys.reposted, []);
  const [userPosts, setUserPosts] = useStoredState(storageKeys.userPosts, []);
  const [composerDraft, setComposerDraft] = useState('');
  const [chatDraft, setChatDraft] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [jurisdiction, setJurisdiction] = useStoredState(storageKeys.jurisdiction, defaultJurisdiction);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [locationMessage, setLocationMessage] = useState('Showing federal, state, and local civic items from official government sources.');
  const [addressDraft, setAddressDraft] = useState('');
  const [activeOverviewId, setActiveOverviewId] = useState(() => getOverviewIdFromHash());
  const [activeProfileId, setActiveProfileId] = useState(() => getProfileIdFromHash());
  const [localComments, setLocalComments] = useStoredState(storageKeys.localComments, {});
  const [sourceReports, setSourceReports] = useStoredState(storageKeys.sourceReports, {});
  const [onboardingDismissed, setOnboardingDismissed] = useStoredState(storageKeys.onboardingDismissed, false);
  const [sourceReportDrafts, setSourceReportDrafts] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [notice, setNotice] = useState('');
  const [theme, setTheme] = useStoredState(
    storageKeys.theme,
    window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  const [authSession, setAuthSession] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authStatus, setAuthStatus] = useState(cloudConfigured ? 'Checking account…' : 'Cloud project not connected');
  const [cloudReady, setCloudReady] = useState(false);
  const activitySnapshotRef = useRef(null);
  const hydratingUserRef = useRef(null);
  activitySnapshotRef.current = { votes, saved: [...saved], followed: [...followed], reminders: [...reminders], jurisdiction, theme };

  useEffect(() => {
    let active = true;
    if (!cloudConfigured) return undefined;
    loadPublicCivicData()
      .then((cloudData) => {
        if (active && cloudData) setPublicData(normalizeCloudPublicData(cloudData));
      })
      .catch((error) => {
        if (!active) return;
        setPublicData({
          ...fallbackPublicData,
          mode: 'fallback',
          error: error?.message || 'Cloud data could not be loaded.'
        });
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    let active = true;
    async function hydrate(session) {
      if (!active) return;
      setAuthSession(session);
      if (!session) {
        hydratingUserRef.current = null;
        setCloudReady(false);
        setAuthStatus(cloudConfigured ? 'Not signed in' : 'Cloud project not connected');
        return;
      }
      if (hydratingUserRef.current === session.user.id) return;
      hydratingUserRef.current = session.user.id;
      setAuthStatus('Syncing this device…');
      try {
        const cloud = await loadCloudActivity();
        if (!active || !cloud) return;
        await syncLocalSnapshot(activitySnapshotRef.current, bills);
        setVotes((current) => ({ ...cloud.votes, ...current }));
        setSaved((current) => new Set([...cloud.saved, ...current]));
        setFollowed((current) => new Set([...cloud.followed, ...current]));
        setReminders((current) => new Set([...cloud.reminders, ...current]));
        if (cloud.profile?.jurisdiction_data?.stateCode) setJurisdiction(cloud.profile.jurisdiction_data);
        if (['light', 'dark'].includes(cloud.profile?.theme_preference)) setTheme(cloud.profile.theme_preference);
        setCloudReady(true);
        setAuthStatus('Synced');
      } catch {
        hydratingUserRef.current = null;
        setCloudReady(false);
        if (active) setAuthStatus('Signed in; sync needs attention');
      }
    }
    getAuthSession().then(hydrate);
    const unsubscribe = subscribeToAuth(hydrate);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authSession || !cloudReady) return;
    syncPreferences(jurisdiction, theme).catch(() => setAuthStatus('Signed in; preferences not synced'));
  }, [authSession, cloudReady, jurisdiction, theme]);

  useEffect(() => {
    function syncHashRoute() {
      setActiveOverviewId(getOverviewIdFromHash());
      setActiveProfileId(getProfileIdFromHash());
    }

    window.addEventListener('hashchange', syncHashRoute);
    return () => window.removeEventListener('hashchange', syncHashRoute);
  }, []);

  const visibleBills = useMemo(() => {
    return bills.filter((bill) => {
      const matchesFilter = activeFilter === 'All' || bill.level === activeFilter;
      const matchesJurisdiction = jurisdiction.levels.includes(bill.level);
      const needle = `${bill.title} ${bill.summary} ${bill.jurisdiction} ${bill.sourceName}`.toLowerCase();
      return matchesFilter && matchesJurisdiction && needle.includes(query.toLowerCase());
    });
  }, [activeFilter, bills, jurisdiction.levels, query]);

  const followingBills = useMemo(() => {
    return visibleBills.filter((bill) => (
      followed.has(bill.id) ||
      followed.has(bill.level) ||
      followed.has(bill.sourceName) ||
      saved.has(bill.id)
    ));
  }, [followed, saved, visibleBills]);

  const allTimelineBills = activeTab === 'following' ? followingBills : visibleBills;
  const timelineBills = allTimelineBills.slice(0, query.trim() ? 250 : 120);
  const hasFeedFilters = query.trim() || activeFilter !== 'All';
  const timelineEmptyTitle = hasFeedFilters ? 'No matching civic items' : 'No posts in this feed yet';
  const timelineEmptyBody = hasFeedFilters
    ? 'Try a broader search or switch the level filter back to All.'
    : 'Follow a source, level, or saved bill to populate this timeline.';
  const selected = bills.find((bill) => bill.id === selectedId) || visibleBills[0] || bills[0];
  const activeOverview = bills.find((bill) => bill.id === activeOverviewId);
  const activeProfile = officialProfiles.find((profile) => profile.id === activeProfileId);

  function voteOnBill(id, vote) {
    const bill = bills.find((item) => item.id === id);
    const nextVote = votes[id] === vote ? undefined : vote;
    setVotes((current) => {
      const next = { ...current };
      if (nextVote) {
        next[id] = nextVote;
      } else {
        delete next[id];
      }
      return next;
    });
    syncUserVote(getGuestProfileId(), bill || id, nextVote).catch(() => {
      showNotice('Vote saved locally; sync failed');
    });
  }

  function toggleSaved(id) {
    const bill = bills.find((item) => item.id === id);
    const shouldSave = !saved.has(id);
    setSaved((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    showNotice(shouldSave ? 'Saved' : 'Removed from saved');
    syncSavedItem(getGuestProfileId(), bill || id, shouldSave).catch(() => {
      showNotice('Saved locally; sync failed');
    });
  }

  function toggleFollow(key, label = key) {
    const shouldFollow = !followed.has(key);
    setFollowed((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
        showNotice(`Unfollowed ${label}`);
      } else {
        next.add(key);
        showNotice(`Following ${label}`);
      }
      return next;
    });
    const targetType = filters.includes(key) ? 'level' : bills.some((bill) => bill.sourceName === key) ? 'source' : 'topic';
    syncFollowTarget(key, shouldFollow, targetType).catch(() => showNotice('Follow saved locally; sync failed'));
  }

  function toggleRepost(id) {
    setReposted((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
        showNotice('Repost removed');
      } else {
        next.add(id);
        showNotice('Reposted to your followers');
      }
      return next;
    });
  }

  function toggleReminder(id) {
    const bill = bills.find((item) => item.id === id);
    const shouldRemind = !reminders.has(id);
    setReminders((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
        showNotice('Reminder removed');
      } else {
        next.add(id);
        showNotice('Reminder set');
      }
      return next;
    });
    syncReminder(getGuestProfileId(), bill || id, shouldRemind).catch(() => showNotice('Reminder saved locally; sync failed'));
  }

  async function requestSignIn(event) {
    event?.preventDefault();
    const email = authEmail.trim();
    if (!email) {
      setAuthStatus('Enter your email address');
      return;
    }
    setAuthStatus('Sending secure sign-in link…');
    try {
      await sendSignInLink(email);
      setAuthStatus('Check your email for the sign-in link');
    } catch (error) {
      setAuthStatus(error?.message || 'Sign-in link could not be sent');
    }
  }

  async function signOut() {
    try {
      await signOutUser();
      setAuthSession(null);
      setCloudReady(false);
      setAuthStatus(cloudConfigured ? 'Not signed in' : 'Cloud project not connected');
      showNotice('Signed out');
    } catch {
      showNotice('Sign out failed');
    }
  }

  function createPost() {
    const text = composerDraft.trim();
    if (!text) {
      showNotice('Write something first');
      return;
    }
    setUserPosts((current) => [
      {
        id: `post-${Date.now()}`,
        text,
        created: 'Just now'
      },
      ...current
    ]);
    setComposerDraft('');
    showNotice('Posted');
  }

  function openSection(section) {
    clearDetailRoute();
    setActiveSection(section);
    if (section === 'explore') setSearchOpen(true);
    window.scrollTo(0, 0);
  }

  function showNotice(message) {
    setNotice(message);
    window.clearTimeout(showNotice.timeoutId);
    showNotice.timeoutId = window.setTimeout(() => setNotice(''), 1800);
  }

  async function shareBill(bill) {
    const url = `${window.location.origin}${window.location.pathname}#overview/${bill.id}`;
    const shareData = {
      title: bill.title,
      text: bill.summary,
      url
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        showNotice('Shared');
        return;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        showNotice('Link copied');
        return;
      }
      window.prompt('Copy link', url);
    } catch (error) {
      if (error?.name !== 'AbortError') {
        showNotice('Share failed');
      }
    }
  }

  function applyGeographies(geographies, matchMethod) {
    const state = geographies.States?.[0]?.NAME;
    const stateCode = geographies.States?.[0]?.STUSAB || null;
    const countyName = geographies.Counties?.[0]?.NAME;
    if (!state || !stateCode || !countyName) throw new Error('Census response did not include a complete jurisdiction.');
    const county = countyName.endsWith('County') ? countyName : `${countyName} County`;
    const congressionalDistrict = findDistrict(geographies, 'Congressional District');
    const stateSenateDistrict = findDistrict(geographies, 'State Legislative Districts - Upper');
    const stateHouseDistrict = findDistrict(geographies, 'State Legislative Districts - Lower');
    setJurisdiction({
      label: `${county}, ${state}`,
      state,
      stateCode,
      county,
      congressionalDistrict,
      stateSenateDistrict,
      stateHouseDistrict,
      matchMethod,
      levels: ['Federal', 'State', 'County']
    });
    setActiveFilter('All');
    setLocationStatus('ready');
    setLocationMessage(`Matched to ${county}, ${state}. Your street address is not saved.`);
  }

  async function lookupAddress(event) {
    event?.preventDefault();
    const address = addressDraft.trim();
    if (!address) {
      setLocationStatus('error');
      setLocationMessage('Enter a complete street address, city, state, and ZIP code.');
      return;
    }
    setLocationStatus('loading');
    setLocationMessage('Matching address to official districts...');
    try {
      const params = new URLSearchParams({
        address,
        benchmark: 'Public_AR_Current',
        vintage: 'Current_Current',
        format: 'json'
      });
      const data = await fetchCensusGeographies('onelineaddress', params);
      const geographies = data?.result?.addressMatches?.[0]?.geographies;
      if (!geographies) throw new Error('Address was not matched.');
      applyGeographies(geographies, 'address');
      setAddressDraft('');
      setLocationOpen(false);
      openSection('representatives');
    } catch {
      setLocationStatus('error');
      setLocationMessage('That address could not be matched. Include street, city, state, and ZIP, then try again.');
    }
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationMessage('This browser does not support location sharing. Nationwide demo remains selected.');
      return;
    }

    setLocationStatus('loading');
    setLocationMessage('Requesting location permission...');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const params = new URLSearchParams({
            x: String(coords.longitude),
            y: String(coords.latitude),
            benchmark: 'Public_AR_Current',
            vintage: 'Current_Current',
            format: 'json'
          });
          const data = await fetchCensusGeographies('coordinates', params);
          applyGeographies(data?.result?.geographies || {}, 'device');
          setLocationOpen(false);
          openSection('representatives');
        } catch {
          setLocationStatus('error');
          setLocationMessage('Location was allowed, but jurisdiction lookup failed. Nationwide demo remains selected.');
        }
      },
      () => {
        setLocationStatus('error');
        setLocationMessage('Location was not allowed. Nationwide demo remains selected.');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  function openOverview(id) {
    setActiveProfileId(null);
    setActiveOverviewId(id);
    window.location.hash = `overview/${encodeURIComponent(id)}`;
    window.scrollTo(0, 0);
  }

  function closeOverview() {
    setActiveOverviewId(null);
    if (window.location.hash.startsWith('#overview/')) {
      window.history.pushState('', document.title, window.location.pathname + window.location.search);
    }
  }

  function openProfile(id) {
    setActiveOverviewId(null);
    setActiveProfileId(id);
    window.location.hash = `official/${encodeURIComponent(id)}`;
    window.scrollTo(0, 0);
  }

  function closeProfile() {
    clearDetailRoute();
    setActiveSection((current) => current === 'representatives' ? 'representatives' : 'officials');
    window.scrollTo(0, 0);
  }

  function clearDetailRoute() {
    setActiveOverviewId(null);
    setActiveProfileId(null);
    if (window.location.hash.startsWith('#overview/') || window.location.hash.startsWith('#official/')) {
      window.history.pushState('', document.title, window.location.pathname + window.location.search);
    }
  }

  function addComment(id) {
    const bill = bills.find((item) => item.id === id);
    const text = (commentDrafts[id] || '').trim();
    if (!text) return;
    setLocalComments((current) => ({
      ...current,
      [id]: [
        ...(current[id] || []),
        {
          id: `${id}-${Date.now()}`,
          author: 'You',
          text
        }
      ]
    }));
    setCommentDrafts((current) => ({ ...current, [id]: '' }));
    createComment(getGuestProfileId(), bill || id, text).catch(() => {
      showNotice('Comment saved locally; sync failed');
    });
  }

  function submitSourceReport(id) {
    const bill = bills.find((item) => item.id === id);
    const text = (sourceReportDrafts[id] || '').trim();
    if (!text) {
      showNotice('Add a report note first');
      return;
    }
    setSourceReports((current) => ({
      ...current,
      [id]: [
        ...(current[id] || []),
        {
          id: `${id}-report-${Date.now()}`,
          text,
          created: 'Just now',
          status: 'Queued for source review'
        }
      ]
    }));
    setSourceReportDrafts((current) => ({ ...current, [id]: '' }));
    showNotice('Source report saved');
    createSourceReport(getGuestProfileId(), bill || id, text).catch(() => {
      showNotice('Report saved locally; sync failed');
    });
  }

  function resetLocalData() {
    removeStoredValues();
    setVotes({});
    setSaved(new Set(['hb-771']));
    setFollowed(new Set(['Federal', 'Congress.gov']));
    setReminders(new Set(['sb-144']));
    setReposted(new Set());
    setUserPosts([]);
    setLocalComments({});
    setSourceReports({});
    setSourceReportDrafts({});
    setOnboardingDismissed(false);
    setJurisdiction(defaultJurisdiction);
    showNotice('Local demo data reset');
  }

  return (
    <div className="app-shell">
      <aside className="left-rail" aria-label="Primary navigation">
        <div className="brand">
          <div className="brand-mark"><ShieldCheck size={24} /></div>
          <div>
            <strong>Civics</strong>
            <span>Official feed</span>
          </div>
        </div>
        <nav className="nav-stack">
          <button
            className={activeSection === 'feed' ? 'nav-item active' : 'nav-item'}
            aria-label="Feed"
            onClick={() => openSection('feed')}
          >
            <Home size={24} /><span>Home</span>
          </button>
          <button
            className={activeSection === 'explore' ? 'nav-item active' : 'nav-item'}
            aria-label="Explore"
            onClick={() => openSection('explore')}
          >
            <Search size={24} /><span>Explore</span>
          </button>
          <button className={activeSection === 'notifications' ? 'nav-item active' : 'nav-item'} aria-label="Notifications" onClick={() => openSection('notifications')}><Bell size={24} /><span>Notifications</span></button>
          <button
            className={activeSection === 'representatives' ? 'nav-item active' : 'nav-item'}
            aria-label="My representatives"
            onClick={() => openSection('representatives')}
          >
            <Users size={24} /><span>My Reps</span>
          </button>
          <button className={['more', 'follow', 'chat', 'saved'].includes(activeSection) ? 'nav-item active' : 'nav-item'} aria-label="Settings" onClick={() => openSection('more')}><Settings size={24} /><span>Settings</span></button>
        </nav>
        <button className="post-button" onClick={() => openSection('feed')}><PenLine size={18} /><span>Post</span></button>
        <div className="top-actions">
          <button
            className={locationOpen ? 'profile-button active' : 'profile-button'}
            aria-label="Location and profile"
            aria-expanded={locationOpen}
            onClick={() => setLocationOpen((open) => !open)}
          >
            <CircleUserRound size={24} />
          </button>
          <div className="rail-account">
            <strong>Nationwide demo</strong>
            <span>@civic_feed</span>
          </div>
        </div>
      </aside>

      <main className="feed-area">
        {activeOverview ? (
          <OverviewPage
            bill={activeOverview}
            officialProfiles={officialProfiles}
            jurisdiction={jurisdiction}
            comments={localComments[activeOverview.id] || []}
            commentDraft={commentDrafts[activeOverview.id] || ''}
            commentCount={getCommentCount(activeOverview, localComments)}
            sourceReports={sourceReports[activeOverview.id] || []}
            sourceReportDraft={sourceReportDrafts[activeOverview.id] || ''}
            onBack={closeOverview}
            onCommentChange={(value) => setCommentDrafts((current) => ({ ...current, [activeOverview.id]: value }))}
            onCommentSubmit={() => addComment(activeOverview.id)}
            onSourceReportChange={(value) => setSourceReportDrafts((current) => ({ ...current, [activeOverview.id]: value }))}
            onSourceReportSubmit={() => submitSourceReport(activeOverview.id)}
            onOpenProfile={openProfile}
          />
        ) : activeProfile ? (
          <PoliticianProfilePage
            profile={activeProfile}
            votes={votes}
            onBack={closeProfile}
            onClaim={(profile) => showNotice(`Claim started: ${profile.office}`)}
          />
        ) : activeSection === 'officials' ? (
          <PoliticianProfilesPage
            profiles={officialProfiles}
            votes={votes}
            onClaim={(profile) => showNotice(`Claim started: ${profile.office}`)}
            onOpenProfile={openProfile}
          />
        ) : activeSection === 'representatives' ? (
          <MyRepresentativesPage
            jurisdiction={jurisdiction}
            profiles={officialProfiles}
            addressDraft={addressDraft}
            locationStatus={locationStatus}
            locationMessage={locationMessage}
            onAddressChange={setAddressDraft}
            onAddressSubmit={lookupAddress}
            onUseLocation={requestLocation}
            onOpenProfile={openProfile}
            onOpenDirectory={() => openSection('officials')}
          />
        ) : activeSection === 'explore' ? (
          <ExplorePage
            query={query}
            onQueryChange={setQuery}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            visibleBills={visibleBills}
            followed={followed}
            onFollow={toggleFollow}
            onOpenOverview={openOverview}
          />
        ) : activeSection === 'notifications' ? (
          <NotificationsPage
            bills={bills}
            saved={saved}
            followed={followed}
            onSave={toggleSaved}
            onFollow={toggleFollow}
            onOpenOverview={openOverview}
          />
        ) : activeSection === 'follow' ? (
          <FollowPage
            bills={bills}
            followed={followed}
            saved={saved}
            onFollow={toggleFollow}
            onOpenOverview={openOverview}
          />
        ) : activeSection === 'chat' ? (
          <ChatPage
            draft={chatDraft}
            onDraftChange={setChatDraft}
            onSend={() => {
              if (!chatDraft.trim()) {
                showNotice('Write a message first');
                return;
              }
              setChatDraft('');
              showNotice('Message posted to demo thread');
            }}
          />
        ) : activeSection === 'saved' ? (
          <SavedPage
            bills={bills.filter((bill) => saved.has(bill.id))}
            onOpenOverview={openOverview}
            onSave={toggleSaved}
          />
        ) : activeSection === 'more' ? (
          <MorePage
            sourceRegistry={officialSourceRegistry}
            federalData={federalCivicItems}
            federalOfficialData={federalOfficialData}
            officialData={floridaOfficialData}
            directoryData={representativeDirectory}
            publicData={publicData}
            jurisdiction={jurisdiction}
            backendLabel={backendLabel}
            cloudConfigured={cloudConfigured}
            authSession={authSession}
            authEmail={authEmail}
            authStatus={authStatus}
            onAuthEmailChange={setAuthEmail}
            onSignIn={requestSignIn}
            onSignOut={signOut}
            onResetData={resetLocalData}
            onAction={showNotice}
            onNavigate={openSection}
          />
        ) : (
          <>
            <header className="timeline-header">
              <div>
                <strong>Home</strong>
                <span>{jurisdiction.label}</span>
              </div>
              <div className="header-actions">
                <button
                  className="round-action"
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                  title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                  onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
                >
                  {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
                </button>
                <button
                  className={locationOpen ? 'round-action active' : 'round-action'}
                  aria-label="Location and profile"
                  aria-expanded={locationOpen}
                  onClick={() => setLocationOpen((open) => !open)}
                >
                  <MapPin size={19} />
                </button>
              </div>
            </header>
            <div className="timeline-tabs" role="tablist" aria-label="Timeline mode">
              <button className={activeTab === 'forYou' ? 'active' : ''} onClick={() => setActiveTab('forYou')}>For you</button>
              <button className={activeTab === 'following' ? 'active' : ''} onClick={() => setActiveTab('following')}>Following</button>
            </div>
            <PublicDataStatus data={publicData} />
            {!onboardingDismissed && (
              <LaunchOnboarding
                onDismiss={() => setOnboardingDismissed(true)}
                onUseLocation={requestLocation}
                onExplore={() => openSection('explore')}
              />
            )}
            {locationOpen && (
          <section className="location-panel" aria-label="Location settings">
            <div className="location-copy">
              <MapPin size={18} />
              <div>
                <strong>{jurisdiction.label}</strong>
                <span>{locationMessage}</span>
              </div>
            </div>
            <button className="location-button" onClick={requestLocation} disabled={locationStatus === 'loading'}>
              <LocateFixed size={17} />
              {locationStatus === 'loading' ? 'Locating' : 'Use my location'}
            </button>
            <form className="address-lookup-form" onSubmit={lookupAddress}>
              <label htmlFor="address-lookup">Or enter your address</label>
              <div>
                <input
                  id="address-lookup"
                  type="text"
                  autoComplete="street-address"
                  value={addressDraft}
                  onChange={(event) => setAddressDraft(event.target.value)}
                  placeholder="123 Main St, City, FL 12345"
                />
                <button className="location-button" disabled={locationStatus === 'loading'}>Match districts</button>
              </div>
              <small>Sent to the U.S. Census Geocoder for district lookup. The street address is not saved.</small>
            </form>
          </section>
            )}

            {searchOpen && (
          <section className="controls" aria-label="Feed controls">
            <label className="search-box">
              <Search size={18} />
              <input
                type="search"
                placeholder="Search laws, places, topics"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoFocus
              />
            </label>
            <div className="filter-row">
              <Filter size={17} />
              {filters.map((filter) => (
                <button
                  key={filter}
                  className={filter === activeFilter ? 'chip active' : 'chip'}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </section>
            )}

            <section className="composer" aria-label="New civic post">
              <div className="avatar">CF</div>
              <div>
                <textarea
                  value={composerDraft}
                  placeholder="What should your officials see?"
                  onChange={(event) => setComposerDraft(event.target.value)}
                />
                <span>Draft comments, votes, and questions from official source material.</span>
                <div className="composer-actions">
                  <button onClick={() => setSearchOpen(true)}><FileText size={17} /> Cite source</button>
                  <button onClick={createPost}><PenLine size={17} /> Post</button>
                </div>
              </div>
            </section>

            <section className="feed-list" aria-label="Bill feed">
          {userPosts.map((post) => (
            <UserPostCard key={post.id} post={post} onShare={() => showNotice('Post link copied')} />
          ))}
          {timelineBills.map((bill) => (
            <BillCard
              key={bill.id}
              bill={bill}
              commentCount={getCommentCount(bill, localComments)}
              userVote={votes[bill.id]}
              saved={saved.has(bill.id)}
              reminderSet={reminders.has(bill.id)}
              followed={followed.has(bill.id) || followed.has(bill.sourceName)}
              reposted={reposted.has(bill.id)}
              selected={bill.id === selected.id}
              onSelect={() => setSelectedId(bill.id)}
              onOpenOverview={() => openOverview(bill.id)}
              onVote={(vote) => voteOnBill(bill.id, vote)}
              onSave={() => toggleSaved(bill.id)}
              onReminder={() => toggleReminder(bill.id)}
              onFollow={() => toggleFollow(bill.sourceName)}
              onRepost={() => toggleRepost(bill.id)}
              onShare={() => shareBill(bill)}
              onActivity={() => showNotice(`${formatCount(bill.yes + bill.no)} total votes tracked`)}
            />
          ))}
          {allTimelineBills.length > timelineBills.length && (
            <div className="feed-limit-note">
              Showing the {timelineBills.length} most relevant records. Use search or a level filter to find older items.
            </div>
          )}
          {!timelineBills.length && (
            <EmptyState
              title={timelineEmptyTitle}
              body={timelineEmptyBody}
              action={hasFeedFilters ? 'Clear filters' : 'Explore sources'}
              onAction={() => {
                if (hasFeedFilters) {
                  setQuery('');
                  setActiveFilter('All');
                } else {
                  openSection('explore');
                }
              }}
            />
          )}
            </section>
          </>
        )}
      </main>

      {!activeOverview && (
        <RightRail
          bills={bills}
          bill={selected}
          commentCount={getCommentCount(selected, localComments)}
          userVote={votes[selected.id]}
          saved={saved.has(selected.id)}
          onVote={(vote) => voteOnBill(selected.id, vote)}
          onSave={() => toggleSaved(selected.id)}
          reminderSet={reminders.has(selected.id)}
          onReminder={() => toggleReminder(selected.id)}
          query={query}
          onQueryChange={setQuery}
          onOpenExplore={() => openSection('explore')}
          officialProfiles={officialProfiles}
          onOpenProfile={openProfile}
        />
      )}
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
}

function findDistrict(geographies, label) {
  const entry = Object.entries(geographies).find(([key]) => key.includes(label));
  const geography = entry?.[1]?.[0];
  const value = geography?.BASENAME || geography?.NAME?.match(/District\s+(\d+)/i)?.[1];
  const district = Number.parseInt(value, 10);
  return Number.isFinite(district) ? district : null;
}

function fetchCensusGeographies(endpoint, params) {
  return new Promise((resolve, reject) => {
    const callbackName = `censusCallback${Date.now()}${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const timeoutId = window.setTimeout(() => finish(new Error('Census lookup timed out.')), 12000);

    function finish(error, data) {
      window.clearTimeout(timeoutId);
      script.remove();
      delete window[callbackName];
      if (error) reject(error);
      else resolve(data);
    }

    window[callbackName] = (data) => finish(null, data);
    script.onerror = () => finish(new Error('Census lookup failed.'));
    params.set('format', 'jsonp');
    params.set('callback', callbackName);
    script.src = `https://geocoding.geo.census.gov/geocoder/geographies/${endpoint}?${params}`;
    document.head.appendChild(script);
  });
}

function getOverviewIdFromHash() {
  const match = window.location.hash.match(/^#overview\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getProfileIdFromHash() {
  const match = window.location.hash.match(/^#official\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getCommentCount(bill, localComments) {
  return bill.comments + (localComments[bill.id]?.length || 0);
}

function FederalContext({ bill, officialProfiles = [], onOpenProfile }) {
  const sponsor = bill.sponsors?.[0];
  const sponsorProfile = sponsor && officialProfiles.find((profile) => (
    profile.bioguideId === sponsor.bioguideId || profile.name === sponsor.name
  ));
  const committee = bill.committees?.[0];
  const action = bill.actions?.[0];

  if (!sponsor && !committee && !action) return null;

  return (
    <div className="federal-context-row">
      {sponsor && sponsorProfile && onOpenProfile ? (
        <button className="federal-profile-link" onClick={() => onOpenProfile(sponsorProfile.id)}>
          <Users size={14} /> {sponsor.name}
        </button>
      ) : sponsor && <span><Users size={14} /> {sponsor.name}</span>}
      {committee && <span><BadgeCheck size={14} /> {committee.name}</span>}
      {action && <span><FileText size={14} /> {action.date}</span>}
    </div>
  );
}

function PublicDataStatus({ data }) {
  const isLoading = data.mode === 'loading';
  const isFallback = data.mode === 'fallback';
  const label = isLoading
    ? 'Refreshing official data'
    : isFallback
      ? 'Offline snapshot'
      : data.stale
        ? 'Cloud data may be stale'
        : 'Cloud data current';
  const detail = isLoading
    ? 'Showing the bundled snapshot while Supabase loads.'
    : isFallback
      ? 'Supabase is unavailable; the bundled official-source snapshot remains usable.'
      : `${data.counts.civicItems.toLocaleString()} civic items · ${data.counts.officials.toLocaleString()} officials · updated ${formatCloudDate(data.lastUpdated)}`;

  return (
    <div className={`public-data-status ${isFallback || data.stale ? 'warning' : ''}`} role="status">
      <span className="public-data-dot" />
      <div>
        <strong>{label}</strong>
        <span>{detail}</span>
      </div>
    </div>
  );
}

function LaunchOnboarding({ onDismiss, onUseLocation, onExplore }) {
  return (
    <section className="launch-onboarding" aria-label="Getting started">
      <div className="launch-onboarding-copy">
        <span><ShieldCheck size={16} /> Guest mode</span>
        <strong>Official-source civic feed</strong>
        <p>Track bills, agendas, officials, votes, reminders, and source reports. Guest activity stays on this device; sign in from Settings to sync it across devices.</p>
      </div>
      <div className="launch-onboarding-actions">
        <button className="small-pill active" onClick={onUseLocation}>
          <LocateFixed size={15} />
          Use location
        </button>
        <button className="small-pill" onClick={onExplore}>
          <Search size={15} />
          Explore
        </button>
        <button className="round-action" onClick={onDismiss} aria-label="Dismiss getting started">
          <X size={18} />
        </button>
      </div>
    </section>
  );
}

function BillCard({ bill, commentCount, userVote, saved, reminderSet, followed, reposted, selected, onSelect, onOpenOverview, onVote, onSave, onReminder, onFollow, onRepost, onShare, onActivity }) {
  const yesCount = bill.yes + (userVote === 'yes' ? 1 : 0);
  const noCount = bill.no + (userVote === 'no' ? 1 : 0);
  const overviewHref = `#overview/${bill.id}`;

  function handleOverviewClick(event) {
    event.preventDefault();
    onOpenOverview();
  }

  return (
    <article className={selected ? 'bill-card selected' : 'bill-card'}>
      <button className="card-hit-area" onClick={onSelect} aria-label={`Open ${bill.title}`} />
      <div className="bill-content">
        <a className="bill-image-link" href={overviewHref} onClick={handleOverviewClick} aria-label={`Open Plain-English summary for ${bill.title}`}>
          <img src={bill.image} alt="" className="bill-image" loading="lazy" />
        </a>
        <div className="minimal-card-meta">
          <span>{bill.chamber}</span>
          <span aria-hidden="true">·</span>
          <span>{bill.jurisdiction}</span>
        </div>
        <a className="post-title-link" href={overviewHref} onClick={handleOverviewClick}>
          <h2>{bill.title}</h2>
        </a>
        <a className="ai-summary" href={overviewHref} onClick={handleOverviewClick}>
          <span className="ai-summary-label">
            {bill.summaryLabel === 'Official description' ? <FileText size={14} /> : <Sparkles size={14} />}
            {bill.summaryLabel || 'AI summary'}
          </span>
          <span>{bill.aiSummary || bill.summary}</span>
        </a>
        <div className="minimal-card-footer">
          <span>{bill.status}</span>
          <a className="source-link" href={bill.sourceUrl} target="_blank" rel="noreferrer">
            <ShieldCheck size={14} />
            Official source
          </a>
        </div>
        <div className="action-row">
          <VoteButton active={userVote === 'yes'} icon={<ThumbsUp size={18} />} label={formatCount(yesCount)} onClick={() => onVote('yes')} />
          <VoteButton active={userVote === 'no'} icon={<ThumbsDown size={18} />} label={formatCount(noCount)} onClick={() => onVote('no')} />
          <button className="icon-action" onClick={onActivity} aria-label="View activity">
            <MessageSquare size={18} />
            <span>{formatCount(commentCount)}</span>
          </button>
          <button
            className={saved ? 'icon-action saved' : 'icon-action'}
            onClick={(event) => {
              event.stopPropagation();
              onSave();
            }}
            aria-label={saved ? 'Unsave bill' : 'Save bill'}
          >
            <Bookmark size={17} />
          </button>
          <button
            className="icon-action"
            onClick={(event) => {
              event.stopPropagation();
              onShare();
            }}
            aria-label="Share bill"
          >
            <Share2 size={17} />
          </button>
        </div>
      </div>
    </article>
  );
}

function formatCount(value) {
  if (value >= 1000000) return `${Math.round(value / 100000) / 10}M`;
  if (value >= 1000) return `${Math.round(value / 100) / 10}K`;
  return String(value);
}

function VoteButton({ active, icon, label, onClick }) {
  return (
    <button className={active ? 'vote-button active' : 'vote-button'} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}

function RightRail({ bills, bill, commentCount, userVote, saved, reminderSet, onVote, onSave, onReminder, query, onQueryChange, onOpenExplore, officialProfiles, onOpenProfile }) {
  return (
    <aside className="detail-panel" aria-label="Timeline context">
      <label className="rail-search">
        <Search size={18} />
        <input
          type="search"
          placeholder="Search"
          value={query}
          onFocus={onOpenExplore}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
      <section className="right-card">
        <div className="right-card-header">
          <strong>Today’s Civic News</strong>
          <CalendarDays size={17} />
        </div>
        {bills.slice(0, 3).map((item) => (
          <a className="trend-link" href={`#overview/${item.id}`} key={item.id}>
            <span>{item.level} · {item.jurisdiction}</span>
            <strong>{item.title}</strong>
            <small>{item.status} · {formatCount(item.comments)} comments</small>
          </a>
        ))}
      </section>
      <section className="right-card">
        <div className="right-card-header">
          <strong>Selected Item</strong>
          <button className={saved ? 'round-action active' : 'round-action'} onClick={onSave} aria-label="Save">
            <Bookmark size={18} />
          </button>
        </div>
        <div className="meta-row">
          <span>{bill.chamber}</span>
          <span>{bill.category}</span>
          <span>{bill.jurisdiction}</span>
        </div>
        <h2>{bill.title}</h2>
        <p className="detail-copy">{bill.detail}</p>
        <div className="right-action-stack">
          <button className="small-pill active" onClick={onOpenExplore}>
            <Search size={15} />
            Find related
          </button>
          <button className={reminderSet ? 'small-pill active' : 'small-pill'} onClick={onReminder}>
            <CalendarDays size={15} />
            {reminderSet ? 'Reminder set' : 'Remind me'}
          </button>
        </div>
        <FederalContext bill={bill} officialProfiles={officialProfiles} onOpenProfile={onOpenProfile} />
        <div className="source-box">
          <a href={bill.sourceUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            Official source
          </a>
          <a href={bill.officialTextUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            Text / validation
          </a>
        </div>
        <div className="detail-vote-box">
          <div>
            <strong>Cast your vote</strong>
            <span>{bill.status}</span>
          </div>
          <div className="detail-votes">
            <VoteButton active={userVote === 'yes'} icon={<Check size={17} />} label="Yes" onClick={() => onVote('yes')} />
            <VoteButton active={userVote === 'no'} icon={<X size={17} />} label="No" onClick={() => onVote('no')} />
          </div>
        </div>
        {!!(bill.pros.length || bill.cons.length) && (
          <div className="split-section">
            <InfoList title="Arguments for" items={bill.pros} tone="yes" />
            <InfoList title="Arguments against" items={bill.cons} tone="no" />
          </div>
        )}
        <section className="friend-box">
          <div className="section-title">
            <Users size={18} />
            <strong>Friends watching this</strong>
          </div>
          {bill.friendVotes.map((friend) => (
            <div className="friend-row" key={friend.name}>
              <span>{friend.name}</span>
              <span className={friend.vote === 'yes' ? 'friend-yes' : 'friend-no'}>{friend.vote.toUpperCase()}</span>
            </div>
          ))}
        </section>
        <section className="comment-box">
          <div className="section-title">
            <MessageSquare size={18} />
            <strong>{commentCount} comments</strong>
          </div>
          <p>Top comments would appear here after moderation and source-quality checks.</p>
        </section>
      </section>
    </aside>
  );
}

function UserPostCard({ post, onShare }) {
  return (
    <article className="bill-card user-post">
      <div className="avatar">YOU</div>
      <div className="bill-content">
        <div className="post-author-row">
          <strong>You</strong>
          <span>@civic_feed · {post.created}</span>
          <button className="inline-icon" aria-label="More post options">
            <MoreHorizontal size={18} />
          </button>
        </div>
        <p>{post.text}</p>
        <div className="source-note">
          <ShieldCheck size={16} />
          Signed-in comments enter moderation before they appear publicly.
        </div>
        <div className="action-row">
          <button className="icon-action" aria-label="Reply"><MessageSquare size={18} /></button>
          <button className="icon-action" aria-label="Repost"><Repeat2 size={18} /></button>
          <button className="icon-action" aria-label="Activity"><BarChart3 size={18} /></button>
          <button className="icon-action" onClick={onShare} aria-label="Share"><Share2 size={18} /></button>
        </div>
      </div>
    </article>
  );
}

function ExplorePage({ query, onQueryChange, activeFilter, onFilterChange, visibleBills, followed, onFollow, onOpenOverview }) {
  const displayedBills = visibleBills.slice(0, 250);
  return (
    <section className="view-page" aria-label="Explore civic updates">
      <PageHeader title="Explore" subtitle="Search official-source civic items, topics, and source accounts." />
      <div className="controls standalone">
        <label className="search-box">
          <Search size={18} />
          <input
            type="search"
            placeholder="Search laws, places, topics"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            autoFocus
          />
        </label>
        <div className="filter-row">
          <Filter size={17} />
          {filters.map((filter) => (
            <button key={filter} className={filter === activeFilter ? 'chip active' : 'chip'} onClick={() => onFilterChange(filter)}>
              {filter}
            </button>
          ))}
        </div>
      </div>
      <section className="quick-grid" aria-label="Topics">
        {topicSuggestions.map((topic) => (
          <button key={topic} onClick={() => onQueryChange(topic)}>
            <HashIcon />
            <span>{topic}</span>
          </button>
        ))}
      </section>
      <section className="result-list" aria-label="Search results">
        {displayedBills.map((bill) => (
          <article className="compact-row" key={bill.id}>
            <div>
              <span>{bill.level} · {bill.jurisdiction}</span>
              <strong>{bill.title}</strong>
              <p>{bill.summary}</p>
            </div>
            <div className="row-actions">
              <button className={followed.has(bill.sourceName) ? 'small-pill active' : 'small-pill'} onClick={() => onFollow(bill.sourceName)}>
                {followed.has(bill.sourceName) ? 'Following' : 'Follow'}
              </button>
              <button className="round-action" onClick={() => onOpenOverview(bill.id)} aria-label={`Open ${bill.title}`}>
                <ChevronRight size={18} />
              </button>
            </div>
          </article>
        ))}
        {visibleBills.length > displayedBills.length && (
          <div className="feed-limit-note">Showing 250 results. Refine the search or level filter to narrow the full database.</div>
        )}
      </section>
    </section>
  );
}

function NotificationsPage({ bills, saved, followed, onSave, onFollow, onOpenOverview }) {
  const notifications = bills.slice(0, 120).map((bill, index) => ({
    id: `notification-${bill.id}`,
    bill,
    label: index % 2 === 0 ? 'Status update' : 'Official source update',
    text: `${bill.status}: ${bill.title}`
  }));

  return (
    <section className="view-page" aria-label="Notifications">
      <PageHeader title="Notifications" subtitle="Bill movement, source updates, and activity from followed items." />
      <div className="result-list">
        {notifications.map(({ id, bill, label, text }) => (
          <article className="compact-row" key={id}>
            <div className="notification-icon"><Bell size={18} /></div>
            <div>
              <span>{label} · {bill.jurisdiction}</span>
              <strong>{text}</strong>
              <p>{bill.sourceName} is linked as the official source.</p>
            </div>
            <div className="row-actions">
              <button className={saved.has(bill.id) ? 'small-pill active' : 'small-pill'} onClick={() => onSave(bill.id)}>
                {saved.has(bill.id) ? 'Saved' : 'Save'}
              </button>
              <button className={followed.has(bill.sourceName) ? 'small-pill active' : 'small-pill'} onClick={() => onFollow(bill.sourceName)}>
                {followed.has(bill.sourceName) ? 'Following' : 'Follow'}
              </button>
              <button className="round-action" onClick={() => onOpenOverview(bill.id)} aria-label={`Open ${bill.title}`}>
                <ChevronRight size={18} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function FollowPage({ bills, followed, saved, onFollow, onOpenOverview }) {
  const followTargets = [
    ...filters.filter((filter) => filter !== 'All').map((filter) => ({ key: filter, label: `${filter} updates`, detail: `Include ${filter.toLowerCase()} items in Following.` })),
    ...Array.from(new Set(bills.map((bill) => bill.sourceName))).map((source) => ({ key: source, label: source, detail: 'Official source account.' }))
  ];
  const followedBills = bills.filter((bill) => followed.has(bill.level) || followed.has(bill.sourceName) || saved.has(bill.id));
  const displayedFollowedBills = followedBills.slice(0, 120);

  return (
    <section className="view-page" aria-label="Follow">
      <PageHeader title="Follow" subtitle="Choose the sources, levels, and saved items that shape your Following feed." />
      <div className="quick-grid follow-grid">
        {followTargets.map((target) => (
          <button className={followed.has(target.key) ? 'active' : ''} key={target.key} onClick={() => onFollow(target.key, target.label)}>
            <AtSign size={18} />
            <span className="follow-target-copy">
              <strong>{target.label}</strong>
              <small>{target.detail}</small>
            </span>
          </button>
        ))}
      </div>
      <section className="result-list">
        {displayedFollowedBills.map((bill) => (
          <article className="compact-row" key={bill.id}>
            <div>
              <span>{bill.level} · {bill.sourceName}</span>
              <strong>{bill.title}</strong>
              <p>{bill.status}</p>
            </div>
            <button className="round-action" onClick={() => onOpenOverview(bill.id)} aria-label={`Open ${bill.title}`}>
              <ChevronRight size={18} />
            </button>
          </article>
        ))}
        {!followedBills.length && <EmptyState title="No followed items yet" body="Follow a level or official source to build this feed." />}
      </section>
    </section>
  );
}

function ChatPage({ draft, onDraftChange, onSend }) {
  return (
    <section className="view-page" aria-label="Chat">
      <PageHeader title="Chat" subtitle="Demo discussion rooms tied to bills, official sources, and watched topics." />
      <div className="result-list">
        {chatThreads.map((thread) => (
          <article className="compact-row" key={thread.id}>
            <div className="notification-icon"><MessageSquare size={18} /></div>
            <div>
              <span>{thread.handle} · {thread.count} updates</span>
              <strong>{thread.title}</strong>
              <p>{thread.excerpt}</p>
            </div>
            <button className="round-action" aria-label={`Open ${thread.title}`}><ChevronRight size={18} /></button>
          </article>
        ))}
      </div>
      <div className="chat-composer">
        <textarea value={draft} onChange={(event) => onDraftChange(event.target.value)} placeholder="Post a message to the selected civic room" />
        <button className="location-button" onClick={onSend}><Send size={17} /> Send</button>
      </div>
    </section>
  );
}

function SavedPage({ bills, onOpenOverview, onSave }) {
  return (
    <section className="view-page" aria-label="Saved">
      <PageHeader title="Saved" subtitle="Bills, source accounts, and searches you want to revisit." />
      <div className="result-list">
        {bills.map((bill) => (
          <article className="compact-row" key={bill.id}>
            <div>
              <span>{bill.level} · {bill.jurisdiction}</span>
              <strong>{bill.title}</strong>
              <p>{bill.summary}</p>
            </div>
            <div className="row-actions">
              <button className="small-pill active" onClick={() => onSave(bill.id)}>Saved</button>
              <button className="round-action" onClick={() => onOpenOverview(bill.id)} aria-label={`Open ${bill.title}`}>
                <ChevronRight size={18} />
              </button>
            </div>
          </article>
        ))}
        {!bills.length && <EmptyState title="Nothing saved yet" body="Use the bookmark action on any civic item to save it here." />}
      </div>
    </section>
  );
}

function MyRepresentativesPage({ jurisdiction, profiles, addressDraft, locationStatus, locationMessage, onAddressChange, onAddressSubmit, onUseLocation, onOpenProfile, onOpenDirectory }) {
  const hasLocation = Boolean(jurisdiction.stateCode);
  const congressionalDistrict = jurisdiction.congressionalDistrict ?? 0;
  const matched = hasLocation ? [
    ...profiles.filter((profile) => profile.chamber === 'U.S. Senate' && profile.state === jurisdiction.stateCode),
    ...profiles.filter((profile) => profile.chamber === 'U.S. House' && profile.state === jurisdiction.stateCode && Number(profile.district) === Number(congressionalDistrict)),
    ...profiles.filter((profile) => profile.chamber === 'Florida Senate' && jurisdiction.stateCode === 'FL' && Number(profile.district) === Number(jurisdiction.stateSenateDistrict)),
    ...profiles.filter((profile) => profile.chamber === 'Florida House' && jurisdiction.stateCode === 'FL' && Number(profile.district) === Number(jurisdiction.stateHouseDistrict))
  ] : [];
  const uniqueMatched = [...new Map(matched.map((profile) => [profile.id, profile])).values()];
  const hasFloridaHouse = uniqueMatched.some((profile) => profile.chamber === 'Florida House');

  return (
    <section className="view-page representatives-page" aria-label="My representatives">
      <PageHeader title="My Representatives" subtitle="Match your address to the elected officials who represent your districts." />
      <section className="representative-lookup-panel">
        <div>
          <strong>{hasLocation ? jurisdiction.label : 'Choose your location'}</strong>
          <span>{hasLocation
            ? `U.S. House ${formatDistrict(jurisdiction.congressionalDistrict)} · State Senate ${formatDistrict(jurisdiction.stateSenateDistrict)} · State House ${formatDistrict(jurisdiction.stateHouseDistrict)}`
            : locationMessage}</span>
        </div>
        <form className="address-lookup-form" onSubmit={onAddressSubmit}>
          <label htmlFor="representative-address">Home address</label>
          <div>
            <input
              id="representative-address"
              type="text"
              autoComplete="street-address"
              value={addressDraft}
              onChange={(event) => onAddressChange(event.target.value)}
              placeholder="123 Main St, City, State 12345"
            />
            <button className="location-button" disabled={locationStatus === 'loading'}>
              {locationStatus === 'loading' ? 'Matching' : 'Find my reps'}
            </button>
          </div>
          <small>Your address is sent to the official U.S. Census Geocoder and is not saved by this app.</small>
        </form>
        <button className="location-button secondary-location-button" onClick={onUseLocation} disabled={locationStatus === 'loading'}>
          <LocateFixed size={17} /> Use device location
        </button>
        {locationStatus === 'error' && <p className="lookup-error">{locationMessage}</p>}
      </section>

      {hasLocation && (
        <>
          <div className="representatives-section-heading">
            <div>
              <strong>Your matched officials</strong>
              <span>Open any profile to see imported voting history and sourced records.</span>
            </div>
            <button className="small-pill" onClick={onOpenDirectory}>All officials</button>
          </div>
          <div className="matched-representatives-grid">
            {uniqueMatched.map((profile) => (
              <RepresentativeHistory key={profile.id} profile={profile} onOpenProfile={onOpenProfile} />
            ))}
          </div>
          {jurisdiction.stateCode === 'FL' && !hasFloridaHouse && (
            <div className="coverage-pending-card">
              <strong>Florida House District {jurisdiction.stateHouseDistrict}: directory connection pending</strong>
              <span>The official Florida House directory is currently rejecting automated requests. The app will not guess or show a stale representative.</span>
              <a href="https://www.flhouse.gov/representatives" target="_blank" rel="noreferrer"><ExternalLink size={15} /> Check the official directory</a>
            </div>
          )}
          <div className="coverage-pending-card">
            <strong>County and city offices are next</strong>
            <span>Current matching covers Congress and imported state-legislative directories. County commission, school board, and city offices will be added from local official sources.</span>
          </div>
        </>
      )}
    </section>
  );
}

function formatDistrict(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0 ? `District ${Number(value)}` : 'At Large';
}

function MorePage({ sourceRegistry, federalData, federalOfficialData, officialData, directoryData, publicData, jurisdiction, backendLabel, cloudConfigured, authSession, authEmail, authStatus, onAuthEmailChange, onSignIn, onSignOut, onResetData, onAction, onNavigate }) {
  const activitySections = [
    ['Officials directory', 'Search every imported politician and open their voting profile.', BadgeCheck, 'officials'],
    ['Saved', 'Bills and official sources you bookmarked for later.', Bookmark, 'saved'],
    ['Following', 'Sources, levels, and topics shaping your personalized feed.', Users, 'follow'],
    ['Discussions', 'Conversations connected to bills and watched topics.', MessageSquare, 'chat']
  ];
  const settingsSections = [
    ['Appearance', 'Theme, accessibility, and compact-feed controls.', Sun],
    ['Location', `${jurisdiction.label}; manage nationwide, state, county, and city coverage.`, MapPin],
    ['Notifications', 'Bill status changes, official votes, replies, and source updates.', Bell],
    ['Privacy', 'Saved items, public votes, profile visibility, and comment identity.', ShieldCheck],
    ['Source policy', 'Official government sources first; every summary links back to source material.', FileText],
    ['Legal disclaimer', 'Plain-English summaries explain source material and are not legal advice.', BadgeCheck],
    ['Feedback', 'Report a stale source, bad summary, missing jurisdiction, or moderation issue.', MessageSquare],
    ['Data freshness', 'Importer status, validation checks, and last-seen official records.', SlidersHorizontal]
  ];

  return (
    <section className="view-page" aria-label="Settings">
      <PageHeader title="Settings" subtitle="Your activity, preferences, source policy, privacy, and support." />
      <div className="settings-group-label">Account and sync</div>
      <section className="account-sync-card">
        <div className="account-sync-heading">
          <div className="notification-icon"><CircleUserRound size={19} /></div>
          <div>
            <strong>{authSession?.user?.email || backendLabel}</strong>
            <span>{authStatus}</span>
          </div>
        </div>
        {authSession ? (
          <>
            <p>Your votes, saved items, follows, reminders, districts, and theme sync to this account.</p>
            <button className="small-pill" onClick={onSignOut}>Sign out</button>
          </>
        ) : cloudConfigured ? (
          <form className="account-signin-form" onSubmit={onSignIn}>
            <label htmlFor="account-email">Email address</label>
            <div>
              <input id="account-email" type="email" autoComplete="email" value={authEmail} onChange={(event) => onAuthEmailChange(event.target.value)} placeholder="you@example.com" />
              <button className="location-button">Email sign-in link</button>
            </div>
            <small>No password required. Your existing activity on this device is copied into your account after sign-in.</small>
          </form>
        ) : (
          <p>Cloud account support is built but the Supabase project has not been provisioned. Guest activity continues to stay on this device.</p>
        )}
      </section>
      <div className="settings-group-label">Your activity</div>
      <div className="settings-list">
        {activitySections.map(([title, detail, Icon, section]) => (
          <button className="settings-row" key={title} onClick={() => onNavigate(section)}>
            <Icon size={20} />
            <span><strong>{title}</strong><small>{detail}</small></span>
            <ChevronRight size={18} />
          </button>
        ))}
      </div>
      <div className="settings-group-label">Preferences and support</div>
      <div className="settings-list">
        {settingsSections.map(([title, detail, Icon]) => (
          <button className="settings-row" key={title} onClick={() => onAction(`${title} opened`)}>
            <Icon size={20} />
            <span><strong>{title}</strong><small>{detail}</small></span>
            <ChevronRight size={18} />
          </button>
        ))}
        <button className="settings-row" onClick={onResetData}>
          <X size={20} />
          <span><strong>Reset demo data</strong><small>Clear local votes, saves, follows, reminders, posts, and comments on this device.</small></span>
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="data-spike-panel">
        <strong>Current coverage snapshot</strong>
        <span>{publicData.counts.civicItems.toLocaleString()} civic items, {publicData.counts.usHouse.toLocaleString()} U.S. House members, {publicData.counts.usSenate.toLocaleString()} U.S. senators, {publicData.counts.floridaSenate.toLocaleString()} Florida senators, and {publicData.counts.floridaHouse.toLocaleString()} Florida House members are available, alongside {publicData.counts.rollCalls.toLocaleString()} validated roll calls and {publicData.counts.officialVotes.toLocaleString()} member votes.</span>
        <span>{publicData.mode === 'live' ? `Live from Supabase · updated ${formatCloudDate(publicData.lastUpdated)}` : 'Using the bundled official-source fallback.'}</span>
        <a href={federalData.source} target="_blank" rel="noreferrer">
          <ExternalLink size={15} />
          Congress.gov API source
        </a>
        <a href={officialData.sources.senateMembers} target="_blank" rel="noreferrer">
          <ExternalLink size={15} />
          Florida Senate source
        </a>
      </div>
      <div className="source-registry-panel">
        <div>
          <strong>Trusted source coverage</strong>
          <span>Federal, state, and local official-source registries remain visible until live ingestion is complete.</span>
        </div>
        <div className="source-registry-grid">
          {sourceRegistry.map((group) => (
            <div className="source-registry-group" key={group.level}>
              <strong>{group.level}</strong>
              {group.sources.slice(0, 3).map((source) => (
                <a href={source.url} target="_blank" rel="noreferrer" key={`${group.level}-${source.name}`}>
                  <ExternalLink size={14} />
                  {source.name}
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>
      <nav className="settings-footer" aria-label="Support links">
        <button onClick={() => onAction('Source policy opened')}>Official sources</button>
        <button onClick={() => onAction('Privacy opened')}>Privacy</button>
        <button onClick={() => onAction('Legal disclaimer opened')}>Terms</button>
        <button onClick={() => onAction('Feedback opened')}>Feedback</button>
      </nav>
    </section>
  );
}

function PageHeader({ title, subtitle }) {
  return (
    <header className="timeline-header page-header">
      <div>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
    </header>
  );
}

function EmptyState({ title, body, action, onAction }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{body}</span>
      {action && <button className="location-button" onClick={onAction}>{action}</button>}
    </div>
  );
}

function HashIcon() {
  return <span className="hash-icon">#</span>;
}

function OverviewPage({ bill, officialProfiles, jurisdiction, comments, commentDraft, commentCount, sourceReports, sourceReportDraft, onBack, onCommentChange, onCommentSubmit, onSourceReportChange, onSourceReportSubmit, onOpenProfile }) {
  return (
    <article className="overview-page">
      <button className="overview-back" onClick={onBack}>Back to feed</button>
      <img src={bill.image} alt="" className="overview-image" />
      <div className="meta-row">
        <span>{bill.chamber}</span>
        <span>{bill.jurisdiction}</span>
        <span>{bill.status}</span>
      </div>
      <div className="source-check-row overview-source-row">
        <span><ShieldCheck size={14} /> {bill.sourceStatus}</span>
        <span><CalendarDays size={14} /> {bill.deadline}</span>
        <span>{bill.lastUpdated}</span>
      </div>
      <FederalContext bill={bill} officialProfiles={officialProfiles} onOpenProfile={onOpenProfile} />
      <h1>{bill.title}</h1>
      <section className="ai-overview-box">
        <div className="section-title">
          {bill.summaryLabel === 'Official description' ? <FileText size={18} /> : <Sparkles size={18} />}
          <strong>{bill.summaryLabel || 'Plain-English summary'}</strong>
        </div>
        <p>{bill.detail}</p>
        {!!(bill.pros.length || bill.cons.length) && (
          <div className="split-section">
            <InfoList title="Likely benefits" items={bill.pros} tone="yes" />
            <InfoList title="Likely concerns" items={bill.cons} tone="no" />
          </div>
        )}
      </section>
      <div className="source-box">
        <a href={bill.sourceUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={16} />
          Official source
        </a>
        <a href={bill.officialTextUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={16} />
          Text / validation
        </a>
      </div>
      <RepresentativeVotes bill={bill} profiles={officialProfiles} jurisdiction={jurisdiction} onOpenProfile={onOpenProfile} />
      <SourceMetadata bill={bill} />
      <section className="report-panel">
        <div className="section-title">
          <ShieldCheck size={18} />
          <strong>Report a problem</strong>
        </div>
        <p>Flag a stale source, broken official link, bad summary, duplicate item, or missing jurisdiction.</p>
        <div className="comment-form">
          <textarea
            value={sourceReportDraft}
            placeholder="Describe the issue"
            onChange={(event) => onSourceReportChange(event.target.value)}
          />
          <button className="location-button" onClick={onSourceReportSubmit}>Submit report</button>
        </div>
        {!!sourceReports.length && (
          <div className="report-list">
            {sourceReports.map((report) => (
              <div className="report-row" key={report.id}>
                <strong>{report.status}</strong>
                <span>{report.created}</span>
                <p>{report.text}</p>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="comments-panel">
        <div className="section-title">
          <MessageSquare size={18} />
          <strong>{commentCount} comments</strong>
        </div>
        <div className="comment-list">
          <div className="comment-row">
            <strong>Moderator note</strong>
            <p>Comments should discuss the proposal and cite official material when possible.</p>
          </div>
          {comments.map((comment) => (
            <div className="comment-row" key={comment.id}>
              <strong>{comment.author}</strong>
              <p>{comment.text}</p>
            </div>
          ))}
        </div>
        <div className="comment-form">
          <textarea
            value={commentDraft}
            placeholder="Add a comment"
            onChange={(event) => onCommentChange(event.target.value)}
          />
          <button className="location-button" onClick={onCommentSubmit}>Post comment</button>
        </div>
      </section>
    </article>
  );
}

function RepresentativeVotes({ bill, profiles, jurisdiction, onOpenProfile }) {
  const recordedVotes = profiles
    .filter((profile) => profile.votes?.[bill.id])
    .map((profile) => ({ ...profile, vote: profile.votes[bill.id] }));
  const sponsors = (bill.sponsors || []).map((sponsor) => {
    const profile = profiles.find((item) => item.bioguideId === sponsor.bioguideId || item.name === sponsor.name);
    return {
      id: sponsor.bioguideId || sponsor.name,
      profileId: profile?.id || null,
      name: sponsor.name,
      office: profile?.office || [sponsor.party, sponsor.state].filter(Boolean).join(' · '),
      sourceUrl: profile?.sourceUrl || sponsor.url,
      vote: profile?.votes?.[bill.id] || null
    };
  });
  const noFloorVote = !recordedVotes.length;
  const localProfiles = profiles.filter((profile) => matchesJurisdiction(profile, bill, jurisdiction));
  const locationLabel = jurisdiction.state === 'All states'
    ? 'Use your location to match federal, state, and local representatives.'
    : `Matched to ${jurisdiction.label}. District-level matching is still being added.`;

  return (
    <section className="representative-votes-panel">
      <div className="section-title">
        <Users size={18} />
        <strong>How your representatives voted</strong>
      </div>
      <p className="representative-location-note">{locationLabel}</p>
      {noFloorVote ? (
        <div className="representative-empty">
          <strong>No recorded floor vote yet</strong>
          <span>This proposal has not reached a roll-call vote, or individual votes have not yet been published by the official source.</span>
        </div>
      ) : (
        <div className="representative-list">
          {recordedVotes.map((profile) => (
            <RepresentativeVoteRow key={profile.id} official={profile} onOpenProfile={onOpenProfile} />
          ))}
        </div>
      )}
      {!!sponsors.length && (
        <div className="representative-sponsors">
          <span>Bill sponsor{sponsors.length > 1 ? 's' : ''}</span>
          {sponsors.map((sponsor) => (
            <RepresentativeVoteRow key={sponsor.id} official={sponsor} sponsor onOpenProfile={onOpenProfile} />
          ))}
        </div>
      )}
      {!!localProfiles.length && (
        <div className="local-representatives">
          <span>Your matched representative{localProfiles.length > 1 ? 's' : ''}</span>
          {localProfiles.map((profile) => (
            <RepresentativeHistory key={profile.id} profile={profile} onOpenProfile={onOpenProfile} />
          ))}
        </div>
      )}
    </section>
  );
}

function matchesJurisdiction(profile, bill, jurisdiction) {
  if (!jurisdiction.stateCode) return false;
  if (profile.status === 'Historical official record') return false;

  if (bill.level === 'Federal') {
    return profile.jurisdiction === 'Federal' && profile.state === jurisdiction.stateCode && (
      profile.district === null || profile.district === undefined || profile.district === jurisdiction.congressionalDistrict
    );
  }

  if (bill.level === 'State') {
    if (profile.jurisdiction !== jurisdiction.state) return false;
    const isHouseBill = bill.sourceName === 'Florida House' || /(^|\/)H(?:B|JR|CR|M)\s*\d/i.test(bill.chamber || '');
    if (isHouseBill) {
      return profile.chamber === 'Florida House' && Number(profile.district) === Number(jurisdiction.stateHouseDistrict);
    }
    return profile.chamber === 'Florida Senate' && Number(profile.district) === Number(jurisdiction.stateSenateDistrict);
  }

  return profile.jurisdiction === bill.jurisdiction;
}

function RepresentativeHistory({ profile, onOpenProfile }) {
  const recentVotes = profile.archive.slice(0, 3);
  const prediction = predictRepresentativeVote(recentVotes);

  return (
    <article className="representative-history-card">
      <RepresentativeVoteRow official={profile} onOpenProfile={onOpenProfile} />
      <div className="recent-votes">
        <strong>Last three recorded votes</strong>
        {recentVotes.length ? recentVotes.map((record) => (
          <a href={record.sourceUrl} target="_blank" rel="noreferrer" key={`${profile.id}-${record.id || `${record.year}-${record.title}`}`}>
            <span>{record.title}</span>
            <span className={record.vote === 'yes' ? 'history-vote yes' : 'history-vote no'}>{record.vote.toUpperCase()}</span>
          </a>
        )) : <span className="history-unavailable">No member-level vote history imported yet.</span>}
      </div>
      <div className={prediction.vote ? `ai-vote-estimate ${prediction.vote}` : 'ai-vote-estimate pending'}>
        <span><Sparkles size={14} /> AI estimate</span>
        <strong>{prediction.label}</strong>
        <p>{prediction.detail}</p>
        <small>Estimate only—not an official position or recorded vote.</small>
      </div>
    </article>
  );
}

function predictRepresentativeVote(recentVotes) {
  if (recentVotes.length < 3) {
    return {
      vote: null,
      label: 'Not enough history',
      detail: 'Three sourced member votes are required before the app will estimate a likely vote.'
    };
  }

  const yesVotes = recentVotes.filter((record) => record.vote === 'yes').length;
  const vote = yesVotes >= 2 ? 'yes' : 'no';
  const majority = vote === 'yes' ? yesVotes : recentVotes.length - yesVotes;
  return {
    vote,
    label: `Likely ${vote === 'yes' ? 'Yes' : 'No'}`,
    detail: `${majority} of the representative’s last 3 sourced votes were ${vote.toUpperCase()}. This is a simple recent-vote signal and does not yet account for topic similarity, amendments, or public statements.`
  };
}

function RepresentativeVoteRow({ official, sponsor = false, onOpenProfile }) {
  const vote = official.vote?.toLowerCase();
  const voteLabel = vote === 'yes' ? 'Voted Yes' : vote === 'no' ? 'Voted No' : sponsor ? 'Sponsor · Vote pending' : 'Not recorded';
  const profileId = sponsor ? official.profileId : official.id;
  const hasProfile = Boolean(onOpenProfile && profileId);

  return (
    <div className="representative-row">
      <button
        className="representative-identity"
        onClick={() => hasProfile && onOpenProfile(profileId)}
        disabled={!hasProfile}
        aria-label={hasProfile ? `View voting profile for ${formatOfficialName(official.name)}` : undefined}
      >
        <div className="representative-avatar"><Users size={17} /></div>
        <div className="representative-copy">
          <strong>{formatOfficialName(official.name)}</strong>
          <span>{official.office}</span>
        </div>
      </button>
      <div className="representative-row-action">
        <span className={vote === 'yes' ? 'vote-status yes' : vote === 'no' ? 'vote-status no' : 'vote-status pending'}>{voteLabel}</span>
        {official.sourceUrl && (
          <a href={official.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Official profile for ${official.name}`}>
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  );
}

function formatOfficialName(name) {
  const senateName = name?.match(/^Sen\.\s+([^,]+),\s+([^\[]+)/);
  if (senateName) return `${senateName[2].trim()} ${senateName[1].trim()}`;
  const directoryName = name?.match(/^([^,]+),\s+(.+)$/);
  return directoryName ? `${directoryName[2].trim()} ${directoryName[1].trim()}` : name;
}

function SourceMetadata({ bill }) {
  const imported = bill.imported;
  const metadataRows = imported
    ? [
        ['Source system', imported.source],
        ['Congress', imported.congress],
        ['Identifier', [imported.type, imported.number].filter(Boolean).join(' ')],
        ['Introduced', imported.introducedDate],
        ['Latest action', imported.latestActionDate],
        ['Updated', imported.updateDate],
        ['Detail import', imported.detailLoaded ? 'Sponsor, committee, and action context loaded' : 'Basic bill record loaded']
      ].filter(([, value]) => value !== undefined && value !== null && value !== '')
    : [
        ['Source system', bill.sourceName],
        ['Coverage stage', 'Prototype seed record'],
        ['Validation', 'Official portal linked; item-specific import pending']
      ];

  return (
    <section className="source-metadata-panel">
      <div className="section-title">
        <ShieldCheck size={18} />
        <strong>Source freshness</strong>
      </div>
      <p>{bill.sourceStatus}. {bill.lastUpdated}. {bill.deadline}.</p>
      <div className="metadata-grid">
        {metadataRows.map(([label, value]) => (
          <div className="metadata-row" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      {imported?.apiUrl && (
        <a className="source-link" href={imported.apiUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={15} />
          API record
        </a>
      )}
    </section>
  );
}

function PoliticianProfilePage({ profile, votes, onBack, onClaim }) {
  return (
    <article className="overview-page profile-detail-page">
      <button className="overview-back" onClick={onBack}>Back</button>
      <PoliticianProfilesPage profiles={[profile]} votes={votes} onClaim={onClaim} singleProfile />
    </article>
  );
}

function PoliticianProfilesPage({ profiles, votes, onClaim, onOpenProfile, singleProfile = false }) {
  const [profileQuery, setProfileQuery] = useState('');
  const [expandedProfiles, setExpandedProfiles] = useState(() => new Set(singleProfile && profiles[0] ? [profiles[0].id] : []));
  const visibleProfiles = profiles
    .filter((profile) => (
      `${profile.name} ${profile.office} ${profile.chamber || ''} ${profile.state || ''} ${profile.party || ''}`.toLowerCase().includes(profileQuery.trim().toLowerCase())
    ))
    .sort((left, right) => (
      right.archive.length - left.archive.length || left.name.localeCompare(right.name)
    ));
  const renderedProfiles = singleProfile ? visibleProfiles : visibleProfiles.slice(0, 60);

  return (
    <section className="profiles-page" aria-label="Nationwide official profiles">
      {!singleProfile && (
        <>
          <div className="profiles-header">
            <div>
              <h1>Official Profiles</h1>
              <p>Public voting records, sourced roll calls, and clearly labeled recent-vote signals for each imported politician.</p>
            </div>
            <span>{profiles.length} profiles</span>
          </div>
          <label className="profile-search">
            <Search size={17} />
            <input
              type="search"
              value={profileQuery}
              onChange={(event) => setProfileQuery(event.target.value)}
              placeholder="Search by politician, office, or party"
              aria-label="Search official profiles"
            />
          </label>
        </>
      )}
      <div className="profiles-grid">
        {renderedProfiles.map((profile) => {
          const comparison = compareVotes(profile, votes);
          const history = summarizeVoteHistory(profile.archive);
          const prediction = predictRepresentativeVote(profile.archive.slice(0, 3));
          const coverageStart = formatArchiveDate(profile.archiveWindow?.startDate);
          const coverageEnd = formatArchiveDate(profile.archiveWindow?.endDate);
          const archiveExpanded = expandedProfiles.has(profile.id);
          const visibleArchive = archiveExpanded ? profile.archive : profile.archive.slice(0, 5);
          return (
            <article className="profile-card" key={profile.id}>
              <div className="profile-card-head">
                <div className="profile-avatar">
                  <Users size={22} />
                </div>
                <div>
                  <h2>{formatOfficialName(profile.name)}</h2>
                  <p>{profile.office} · {profile.party || profile.jurisdiction}</p>
                </div>
              </div>
              <div className="profile-status-row">
                <span><BadgeCheck size={15} /> {profile.status}</span>
                <a href={profile.sourceUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={15} />
                  {profile.sourceName}
                </a>
              </div>
              <div className="alignment-box">
                <strong>{comparison.label}</strong>
                <span>{comparison.detail}</span>
              </div>
              <div className="profile-metrics" aria-label={`${profile.name} voting record summary`}>
                <div>
                  <strong>{history.total}</strong>
                  <span>Recorded votes</span>
                </div>
                <div>
                  <strong>{history.yes}</strong>
                  <span>Yes</span>
                </div>
                <div>
                  <strong>{history.no}</strong>
                  <span>No</span>
                </div>
                <div>
                  <strong>{history.total ? `${history.yesRate}%` : '—'}</strong>
                  <span>Yes rate</span>
                </div>
              </div>
              <div className="archive-summary">
                <strong>{profile.archiveWindow?.label || 'Official voting archive'}</strong>
                <span>{coverageStart}–{coverageEnd}. {profile.archiveWindow?.note}</span>
              </div>
              <div className={prediction.vote ? `ai-vote-estimate profile-estimate ${prediction.vote}` : 'ai-vote-estimate profile-estimate pending'}>
                <span><Sparkles size={14} /> AI voting outlook</span>
                <strong>{prediction.label}</strong>
                <p>{prediction.detail}</p>
                <small>AI overview only—not an official position or a bill-specific forecast.</small>
              </div>
              {!!profile.sponsoredItems?.length && (
                <div className="sponsor-summary">
                  <strong>{profile.sponsoredItems.length} sponsored item</strong>
                  {profile.sponsoredItems.map((billId) => {
                    const bill = bills.find((item) => item.id === billId);
                    return <span key={billId}>{bill?.chamber || billId}: {bill?.title || 'Imported federal item'}</span>;
                  })}
                </div>
              )}
              <div className="vote-record">
                {!!Object.keys(profile.votes).length && <div className="vote-record-label">Current comparison items</div>}
                {Object.entries(profile.votes).map(([billId, officialVote]) => {
                  const bill = bills.find((item) => item.id === billId);
                  const userVote = votes[billId];
                  return (
                    <div className="vote-record-row" key={billId}>
                      <div>
                        <strong>{bill?.title || billId}</strong>
                        <span>{bill?.jurisdiction}</span>
                      </div>
                      <div className="vote-pair">
                        <span className={officialVote === 'yes' ? 'friend-yes' : 'friend-no'}>Official {officialVote.toUpperCase()}</span>
                        <span>{userVote ? `You ${userVote.toUpperCase()}` : 'You not voted'}</span>
                      </div>
                    </div>
                  );
                })}
                <div className="vote-record-label">Past-year official vote record</div>
                {!profile.archive.length && (
                  <div className="vote-record-row archive-row">
                    <div>
                      <strong>Historical votes not imported yet</strong>
                      <span>No sourced member-level votes are available for this profile in the current coverage window.</span>
                    </div>
                  </div>
                )}
                {visibleArchive.map((record) => (
                  <a className="vote-record-row archive-row" href={record.sourceUrl} target="_blank" rel="noreferrer" key={`${profile.id}-${record.id || `${record.year}-${record.title}`}`}>
                    <div>
                      <strong>{record.title}</strong>
                      <span>{record.year} · {record.topic}</span>
                    </div>
                    <div className="vote-pair">
                      <span className={record.vote === 'yes' ? 'friend-yes' : 'friend-no'}>{record.vote.toUpperCase()}</span>
                      <span>Official record <ExternalLink size={12} /></span>
                    </div>
                  </a>
                ))}
                {profile.archive.length > 5 && (
                  <button
                    className="archive-toggle"
                    onClick={() => setExpandedProfiles((current) => {
                      const next = new Set(current);
                      if (next.has(profile.id)) next.delete(profile.id);
                      else next.add(profile.id);
                      return next;
                    })}
                  >
                    {archiveExpanded ? 'Show recent votes only' : `View all ${profile.archive.length} votes`}
                  </button>
                )}
              </div>
              {!singleProfile && onOpenProfile && (
                <button className="view-profile-button" onClick={() => onOpenProfile(profile.id)}>
                  View voting profile <ChevronRight size={17} />
                </button>
              )}
              <button className="claim-button" onClick={() => onClaim(profile)}>
                Claim profile
              </button>
            </article>
          );
        })}
      </div>
      {!singleProfile && visibleProfiles.length > renderedProfiles.length && (
        <div className="profiles-limit-note">Showing {renderedProfiles.length} of {visibleProfiles.length} profiles. Search by name, office, state, or party to narrow the list.</div>
      )}
    </section>
  );
}

function summarizeVoteHistory(records) {
  const yes = records.filter((record) => record.vote === 'yes').length;
  const no = records.filter((record) => record.vote === 'no').length;
  const total = yes + no;
  return {
    yes,
    no,
    total,
    yesRate: total ? Math.round((yes / total) * 100) : 0
  };
}

function formatArchiveDate(value) {
  if (!value || value === 'Present') return value || 'Not available';
  const date = new Date(`${value}T00:00:00`);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : value;
}

function compareVotes(profile, votes) {
  const officialVotes = Object.entries(profile.votes);
  const comparableVotes = officialVotes.filter(([billId]) => votes[billId]);
  if (!comparableVotes.length) {
    return {
      label: 'No comparison yet',
      detail: 'Cast votes in the feed to compare your record with this profile.'
    };
  }

  const matches = comparableVotes.filter(([billId, officialVote]) => votes[billId] === officialVote).length;
  return {
    label: `${matches}/${comparableVotes.length} aligned`,
    detail: `${Math.round((matches / comparableVotes.length) * 100)}% match on shared votes.`
  };
}

function InfoList({ title, items, tone }) {
  return (
    <section className={`info-list ${tone}`}>
      <h3>{title}</h3>
      {items.map((item) => (
        <p key={item}>{item}</p>
      ))}
    </section>
  );
}

export default App;
