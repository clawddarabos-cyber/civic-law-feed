import React, { useEffect, useMemo, useState } from 'react';
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
  MoreHorizontal,
  PenLine,
  Repeat2,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  ThumbsDown,
  ThumbsUp,
  Users,
  X
} from 'lucide-react';
import floridaOfficialData from '../data/florida-official-data.json';

const bills = [
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
  party: official.party,
  status: official.claimStatus === 'unclaimed' ? 'Unclaimed profile' : 'Claimed profile',
  sourceName: 'Florida Senate profile',
  sourceUrl: official.profileUrl,
  votes: {},
  archiveSince: String(floridaOfficialData.window.mvpStartYear),
  archive: []
}));

const defaultJurisdiction = {
  label: 'Nationwide demo',
  state: 'All states',
  county: 'All counties',
  levels: ['Federal', 'State', 'County']
};

function App() {
  const [activeSection, setActiveSection] = useState('feed');
  const [activeTab, setActiveTab] = useState('forYou');
  const [activeFilter, setActiveFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(bills[0].id);
  const [votes, setVotes] = useState({});
  const [saved, setSaved] = useState(() => new Set(['hb-771']));
  const [followed, setFollowed] = useState(() => new Set(['Federal', 'Congress.gov']));
  const [reminders, setReminders] = useState(() => new Set(['sb-144']));
  const [reposted, setReposted] = useState(() => new Set());
  const [userPosts, setUserPosts] = useState([]);
  const [composerDraft, setComposerDraft] = useState('');
  const [chatDraft, setChatDraft] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [jurisdiction, setJurisdiction] = useState(defaultJurisdiction);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [locationMessage, setLocationMessage] = useState('Showing federal, state, and local civic items from official government sources.');
  const [activeOverviewId, setActiveOverviewId] = useState(() => getOverviewIdFromHash());
  const [localComments, setLocalComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [notice, setNotice] = useState('');

  useEffect(() => {
    function syncHashRoute() {
      setActiveOverviewId(getOverviewIdFromHash());
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
  }, [activeFilter, jurisdiction.levels, query]);

  const followingBills = useMemo(() => {
    return visibleBills.filter((bill) => (
      followed.has(bill.id) ||
      followed.has(bill.level) ||
      followed.has(bill.sourceName) ||
      saved.has(bill.id)
    ));
  }, [followed, saved, visibleBills]);

  const timelineBills = activeTab === 'following' ? followingBills : visibleBills;
  const hasFeedFilters = query.trim() || activeFilter !== 'All';
  const timelineEmptyTitle = hasFeedFilters ? 'No matching civic items' : 'No posts in this feed yet';
  const timelineEmptyBody = hasFeedFilters
    ? 'Try a broader search or switch the level filter back to All.'
    : 'Follow a source, level, or saved bill to populate this timeline.';
  const selected = bills.find((bill) => bill.id === selectedId) || visibleBills[0] || bills[0];
  const activeOverview = bills.find((bill) => bill.id === activeOverviewId);

  function voteOnBill(id, vote) {
    setVotes((current) => ({ ...current, [id]: current[id] === vote ? undefined : vote }));
  }

  function toggleSaved(id) {
    setSaved((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
        showNotice('Removed from saved');
      } else {
        next.add(id);
        showNotice('Saved');
      }
      return next;
    });
  }

  function toggleFollow(key, label = key) {
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
    closeOverview();
    setActiveSection(section);
    if (section === 'explore') setSearchOpen(true);
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
          const response = await fetch(`https://geocoding.geo.census.gov/geocoder/geographies/coordinates?${params}`);
          const data = await response.json();
          const geographies = data?.result?.geographies || {};
          const state = geographies.States?.[0]?.NAME || 'Florida';
          const countyName = geographies.Counties?.[0]?.NAME || 'St. Johns County';
          const county = countyName.endsWith('County') ? countyName : `${countyName} County`;
          setJurisdiction({
            label: `${county}, ${state}`,
            state,
            county,
            levels: ['Federal', 'State', 'County']
          });
          setActiveFilter('All');
          setLocationStatus('ready');
          setLocationMessage(`Showing federal, ${state}, and ${county} items with official government source links.`);
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
    setActiveOverviewId(id);
    window.location.hash = `overview/${id}`;
  }

  function closeOverview() {
    setActiveOverviewId(null);
    if (window.location.hash.startsWith('#overview/')) {
      window.history.pushState('', document.title, window.location.pathname + window.location.search);
    }
  }

  function addComment(id) {
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
          <button className={activeSection === 'follow' ? 'nav-item active' : 'nav-item'} aria-label="Follow" onClick={() => openSection('follow')}><Users size={24} /><span>Follow</span></button>
          <button className={activeSection === 'chat' ? 'nav-item active' : 'nav-item'} aria-label="Chat" onClick={() => openSection('chat')}><MessageSquare size={24} /><span>Chat</span></button>
          <button
            className={activeSection === 'officials' ? 'nav-item active' : 'nav-item'}
            aria-label="Officials"
            onClick={() => openSection('officials')}
          >
            <BadgeCheck size={24} /><span>Officials</span>
          </button>
          <button className={activeSection === 'saved' ? 'nav-item active' : 'nav-item'} aria-label="Saved" onClick={() => openSection('saved')}><Bookmark size={24} /><span>Saved</span></button>
          <button className={activeSection === 'more' ? 'nav-item active' : 'nav-item'} aria-label="More" onClick={() => openSection('more')}><MoreHorizontal size={24} /><span>More</span></button>
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
            comments={localComments[activeOverview.id] || []}
            commentDraft={commentDrafts[activeOverview.id] || ''}
            commentCount={getCommentCount(activeOverview, localComments)}
            onBack={closeOverview}
            onCommentChange={(value) => setCommentDrafts((current) => ({ ...current, [activeOverview.id]: value }))}
            onCommentSubmit={() => addComment(activeOverview.id)}
          />
        ) : activeSection === 'officials' ? (
          <PoliticianProfilesPage
            profiles={floridaOfficialProfiles}
            votes={votes}
            onClaim={(profile) => showNotice(`Claim started: ${profile.office}`)}
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
            officialData={floridaOfficialData}
            jurisdiction={jurisdiction}
            onAction={showNotice}
          />
        ) : (
          <>
            <header className="timeline-header">
              <div>
                <strong>Home</strong>
                <span>{jurisdiction.label}</span>
              </div>
              <button
                className={locationOpen ? 'round-action active' : 'round-action'}
                aria-label="Location and profile"
                aria-expanded={locationOpen}
                onClick={() => setLocationOpen((open) => !open)}
              >
                <MapPin size={19} />
              </button>
            </header>
            <div className="timeline-tabs" role="tablist" aria-label="Timeline mode">
              <button className={activeTab === 'forYou' ? 'active' : ''} onClick={() => setActiveTab('forYou')}>For you</button>
              <button className={activeTab === 'following' ? 'active' : ''} onClick={() => setActiveTab('following')}>Following</button>
            </div>
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
        />
      )}
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
}

function getOverviewIdFromHash() {
  const match = window.location.hash.match(/^#overview\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getCommentCount(bill, localComments) {
  return bill.comments + (localComments[bill.id]?.length || 0);
}

function BillCard({ bill, commentCount, userVote, saved, reminderSet, followed, reposted, selected, onSelect, onOpenOverview, onVote, onSave, onReminder, onFollow, onRepost, onShare, onActivity }) {
  const total = bill.yes + bill.no + (userVote === 'yes' ? 1 : 0) + (userVote === 'no' ? 1 : 0);
  const yesPercent = Math.round(((bill.yes + (userVote === 'yes' ? 1 : 0)) / total) * 100);
  const overviewHref = `#overview/${bill.id}`;

  function handleOverviewClick(event) {
    event.preventDefault();
    onOpenOverview();
  }

  return (
    <article className={selected ? 'bill-card selected' : 'bill-card'}>
      <button className="card-hit-area" onClick={onSelect} aria-label={`Open ${bill.title}`} />
      <div className="avatar">{bill.level.slice(0, 2).toUpperCase()}</div>
      <div className="bill-content">
        <div className="post-author-row">
          <strong>{bill.sourceName}</strong>
          <BadgeCheck size={16} />
          <span>@{bill.level.toLowerCase()}source · {bill.status}</span>
          <button className="inline-icon" onClick={onFollow} aria-label={followed ? `Unfollow ${bill.sourceName}` : `Follow ${bill.sourceName}`}>
            {followed ? <Check size={18} /> : <AtSign size={18} />}
          </button>
        </div>
        <div className="meta-row">
          <span>{bill.chamber}</span>
          <span>{bill.jurisdiction}</span>
        </div>
        <a className="post-title-link" href={overviewHref} onClick={handleOverviewClick}>
          <h2>{bill.title}</h2>
        </a>
        <a className="summary-link" href={overviewHref} onClick={handleOverviewClick}>
          {bill.summary}
        </a>
        <a className="bill-image-link" href={overviewHref} onClick={handleOverviewClick} aria-label={`Open Plain-English summary for ${bill.title}`}>
          <img src={bill.image} alt="" className="bill-image" />
        </a>
        <div className="status-row">
          <span>{bill.status}</span>
          <span>{yesPercent}% Yes</span>
          <span>{commentCount} comments</span>
        </div>
        <div className="source-check-row">
          <span><ShieldCheck size={14} /> {bill.sourceStatus}</span>
          <span><CalendarDays size={14} /> {bill.deadline}</span>
          <span>{bill.lastUpdated}</span>
        </div>
        <div className="next-action-box">
          <strong>Next step</strong>
          <span>{bill.nextAction}</span>
        </div>
        <div className="link-row">
          <a
            className="overview-link"
            href={overviewHref}
            onClick={handleOverviewClick}
          >
            <FileText size={15} />
            Plain-English summary
          </a>
          <a className="source-link" href={bill.sourceUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={15} />
            {bill.sourceName}
          </a>
          <button className={reminderSet ? 'small-pill active' : 'small-pill'} onClick={onReminder}>
            <CalendarDays size={15} />
            {reminderSet ? 'Reminder set' : 'Remind me'}
          </button>
        </div>
        <div className="action-row">
          <VoteButton active={userVote === 'yes'} icon={<ThumbsUp size={18} />} label={formatCount(bill.yes + (userVote === 'yes' ? 1 : 0))} onClick={() => onVote('yes')} />
          <VoteButton active={userVote === 'no'} icon={<ThumbsDown size={18} />} label={formatCount(bill.no + (userVote === 'no' ? 1 : 0))} onClick={() => onVote('no')} />
          <button className={reposted ? 'icon-action reposted' : 'icon-action'} onClick={onRepost} aria-label={reposted ? 'Remove repost' : 'Repost civic item'}>
            <Repeat2 size={18} />
          </button>
          <button className="icon-action" onClick={onActivity} aria-label="View activity">
            <BarChart3 size={18} />
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

function RightRail({ bill, commentCount, userVote, saved, reminderSet, onVote, onSave, onReminder, query, onQueryChange, onOpenExplore }) {
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
        <div className="split-section">
          <InfoList title="Arguments for" items={bill.pros} tone="yes" />
          <InfoList title="Arguments against" items={bill.cons} tone="no" />
        </div>
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
          Demo post. Backend moderation and account identity come next.
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
        {visibleBills.map((bill) => (
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
      </section>
    </section>
  );
}

function NotificationsPage({ bills, saved, followed, onSave, onFollow, onOpenOverview }) {
  const notifications = bills.map((bill, index) => ({
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
        {followedBills.map((bill) => (
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

function MorePage({ sourceRegistry, officialData, jurisdiction, onAction }) {
  const settingsSections = [
    ['Settings', 'Theme, accessibility, account, and compact-feed controls.', Settings],
    ['Location', `${jurisdiction.label}; manage nationwide, state, county, and city coverage.`, MapPin],
    ['Notifications', 'Bill status changes, official votes, replies, and source updates.', Bell],
    ['Privacy', 'Saved items, public votes, profile visibility, and comment identity.', ShieldCheck],
    ['Source policy', 'Official government sources first; every summary links back to source material.', FileText],
    ['Legal disclaimer', 'Plain-English summaries explain source material and are not legal advice.', BadgeCheck],
    ['Feedback', 'Report a stale source, bad summary, missing jurisdiction, or moderation issue.', MessageSquare],
    ['Data freshness', 'Importer status, validation checks, and last-seen official records.', SlidersHorizontal]
  ];

  return (
    <section className="view-page" aria-label="More">
      <PageHeader title="More" subtitle="Settings, source policy, privacy, and product support." />
      <div className="settings-list">
        {settingsSections.map(([title, detail, Icon]) => (
          <button className="settings-row" key={title} onClick={() => onAction(`${title} opened`)}>
            <Icon size={20} />
            <span><strong>{title}</strong><small>{detail}</small></span>
            <ChevronRight size={18} />
          </button>
        ))}
      </div>
      <div className="data-spike-panel">
        <strong>Current coverage snapshot</strong>
        <span>{officialData.officials.length} Florida Senate officials, {officialData.bills.length} Senate bills, and {officialData.rollCalls.length} roll-call records are seeded from official Florida Senate pages while nationwide connectors are added.</span>
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

function OverviewPage({ bill, comments, commentDraft, commentCount, onBack, onCommentChange, onCommentSubmit }) {
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
      <h1>{bill.title}</h1>
      <section className="ai-overview-box">
        <div className="section-title">
          <FileText size={18} />
          <strong>Plain-English summary</strong>
        </div>
        <p>{bill.detail}</p>
        <div className="split-section">
          <InfoList title="Likely benefits" items={bill.pros} tone="yes" />
          <InfoList title="Likely concerns" items={bill.cons} tone="no" />
        </div>
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

function PoliticianProfilesPage({ profiles, votes, onClaim }) {
  return (
    <section className="profiles-page" aria-label="Nationwide official profiles">
      <div className="profiles-header">
        <div>
          <h1>Nationwide Official Profiles</h1>
          <p>Auto-created public profiles compare official votes with your votes on federal, state, and local items.</p>
        </div>
        <span>Official profiles</span>
      </div>
      <div className="profiles-grid">
        {profiles.map((profile) => {
          const comparison = compareVotes(profile, votes);
          return (
            <article className="profile-card" key={profile.id}>
              <div className="profile-card-head">
                <div className="profile-avatar">
                  <Users size={22} />
                </div>
                <div>
                  <h2>{profile.name}</h2>
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
              <div className="archive-summary">
                <strong>{profile.archive.length + Object.keys(profile.votes).length} recorded votes</strong>
                <span>Prototype archive since {profile.archiveSince}; store all available records, show recent first.</span>
              </div>
              <div className="vote-record">
                <div className="vote-record-label">Current comparison items</div>
                {!Object.keys(profile.votes).length && (
                  <div className="vote-record-row">
                    <div>
                      <strong>Roll-call import pending</strong>
                      <span>Profile generated from official member data; vote records will attach here next.</span>
                    </div>
                  </div>
                )}
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
                <div className="vote-record-label">Historical archive</div>
                {!profile.archive.length && (
                  <div className="vote-record-row archive-row">
                    <div>
                      <strong>Historical votes not imported yet</strong>
                      <span>Archive window starts at {profile.archiveSince}; roll-call extraction is the next data step.</span>
                    </div>
                  </div>
                )}
                {profile.archive.map((record) => (
                  <div className="vote-record-row archive-row" key={`${profile.id}-${record.year}-${record.title}`}>
                    <div>
                      <strong>{record.title}</strong>
                      <span>{record.year} · {record.topic}</span>
                    </div>
                    <div className="vote-pair">
                      <span className={record.vote === 'yes' ? 'friend-yes' : 'friend-no'}>{record.vote.toUpperCase()}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="claim-button" onClick={() => onClaim(profile)}>
                Claim profile
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
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
