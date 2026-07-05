import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Bookmark,
  Check,
  CircleUserRound,
  ExternalLink,
  FileText,
  Filter,
  Home,
  LocateFixed,
  MapPin,
  MessageSquare,
  Search,
  Share2,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  Users,
  X
} from 'lucide-react';

const bills = [
  {
    id: 'hb-418',
    title: 'Clean Water Infrastructure Renewal Act',
    chamber: 'House Bill 418',
    jurisdiction: 'Florida',
    level: 'Florida',
    status: 'Voting closes in 2 days',
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
    level: 'St. Johns County',
    status: 'Committee vote tomorrow',
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
    level: 'St. Johns County',
    status: 'Public comment open',
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

const filters = ['All', 'Federal', 'Florida', 'St. Johns County'];

const defaultJurisdiction = {
  label: 'Saint Johns, Florida',
  state: 'Florida',
  county: 'St. Johns County',
  levels: ['Federal', 'Florida', 'St. Johns County']
};

function App() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(bills[0].id);
  const [votes, setVotes] = useState({});
  const [saved, setSaved] = useState(() => new Set(['hb-771']));
  const [searchOpen, setSearchOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [jurisdiction, setJurisdiction] = useState(defaultJurisdiction);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [locationMessage, setLocationMessage] = useState('Location is set to the Saint Johns demo jurisdiction.');
  const [activeOverviewId, setActiveOverviewId] = useState(() => getOverviewIdFromHash());
  const [localComments, setLocalComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});

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

  const selected = bills.find((bill) => bill.id === selectedId) || visibleBills[0] || bills[0];
  const activeOverview = bills.find((bill) => bill.id === activeOverviewId);

  function voteOnBill(id, vote) {
    setVotes((current) => ({ ...current, [id]: current[id] === vote ? undefined : vote }));
  }

  function toggleSaved(id) {
    setSaved((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationMessage('This browser does not support location sharing. Saint Johns remains selected.');
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
            levels: ['Federal', state, county]
          });
          setActiveFilter('All');
          setLocationStatus('ready');
          setLocationMessage(`Showing federal, ${state}, and ${county} items with official source links.`);
        } catch {
          setLocationStatus('error');
          setLocationMessage('Location was allowed, but jurisdiction lookup failed. Saint Johns remains selected.');
        }
      },
      () => {
        setLocationStatus('error');
        setLocationMessage('Location was not allowed. Saint Johns remains selected as the demo jurisdiction.');
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
          <div className="brand-mark"><ShieldCheck size={22} /></div>
          <div>
            <strong>Civic Feed</strong>
            <span>Public beta</span>
          </div>
        </div>
        <nav className="nav-stack">
          <button className="nav-item active" aria-label="Feed"><Home size={19} /><span>Feed</span></button>
          <button className="nav-item" aria-label="Friends"><Users size={19} /><span>Friends</span></button>
          <button className="nav-item" aria-label="Saved"><Bookmark size={19} /><span>Saved</span></button>
          <button className="nav-item" aria-label="Alerts"><Bell size={19} /><span>Alerts</span></button>
        </nav>
        <div className="top-actions">
          <button
            className={searchOpen ? 'profile-button active' : 'profile-button'}
            aria-label={searchOpen ? 'Close search and filters' : 'Open search and filters'}
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((open) => !open)}
          >
            {searchOpen ? <X size={22} /> : <Search size={22} />}
          </button>
          <button
            className={locationOpen ? 'profile-button active' : 'profile-button'}
            aria-label="Location and profile"
            aria-expanded={locationOpen}
            onClick={() => setLocationOpen((open) => !open)}
          >
            <CircleUserRound size={24} />
          </button>
        </div>
        <div className="trust-panel">
          <ShieldCheck size={18} />
          <p>Summaries are labeled drafts until reviewed against the official bill text.</p>
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
        ) : (
          <>
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

            <section className="feed-list" aria-label="Bill feed">
          {visibleBills.map((bill) => (
            <BillCard
              key={bill.id}
              bill={bill}
              commentCount={getCommentCount(bill, localComments)}
              userVote={votes[bill.id]}
              saved={saved.has(bill.id)}
              selected={bill.id === selected.id}
              onSelect={() => setSelectedId(bill.id)}
              onOpenOverview={() => openOverview(bill.id)}
              onVote={(vote) => voteOnBill(bill.id, vote)}
              onSave={() => toggleSaved(bill.id)}
            />
          ))}
            </section>
          </>
        )}
      </main>

      {!activeOverview && (
        <BillDetail
          bill={selected}
          commentCount={getCommentCount(selected, localComments)}
          userVote={votes[selected.id]}
          saved={saved.has(selected.id)}
          onVote={(vote) => voteOnBill(selected.id, vote)}
          onSave={() => toggleSaved(selected.id)}
        />
      )}
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

function BillCard({ bill, commentCount, userVote, saved, selected, onSelect, onOpenOverview, onVote, onSave }) {
  const total = bill.yes + bill.no + (userVote === 'yes' ? 1 : 0) + (userVote === 'no' ? 1 : 0);
  const yesPercent = Math.round(((bill.yes + (userVote === 'yes' ? 1 : 0)) / total) * 100);

  return (
    <article className={selected ? 'bill-card selected' : 'bill-card'}>
      <button className="card-hit-area" onClick={onSelect} aria-label={`Open ${bill.title}`} />
      <img src={bill.image} alt="" className="bill-image" />
      <div className="bill-content">
        <div className="meta-row">
          <span>{bill.chamber}</span>
          <span>{bill.jurisdiction}</span>
        </div>
        <h2>{bill.title}</h2>
        <p>{bill.summary}</p>
        <div className="status-row">
          <span>{bill.status}</span>
          <span>{yesPercent}% Yes</span>
          <span>{commentCount} comments</span>
        </div>
        <div className="link-row">
          <a
            className="overview-link"
            href={`#overview/${bill.id}`}
            onClick={(event) => {
              event.preventDefault();
              onOpenOverview();
            }}
          >
            <FileText size={15} />
            AI overview
          </a>
          <a className="source-link" href={bill.sourceUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={15} />
            {bill.sourceName}
          </a>
        </div>
        <div className="action-row">
          <VoteButton active={userVote === 'yes'} icon={<ThumbsUp size={17} />} label="Yes" onClick={() => onVote('yes')} />
          <VoteButton active={userVote === 'no'} icon={<ThumbsDown size={17} />} label="No" onClick={() => onVote('no')} />
          <button className={saved ? 'icon-action saved' : 'icon-action'} onClick={onSave} aria-label="Save bill">
            <Bookmark size={17} />
          </button>
          <button className="icon-action" aria-label="Share bill"><Share2 size={17} /></button>
        </div>
      </div>
    </article>
  );
}

function VoteButton({ active, icon, label, onClick }) {
  return (
    <button className={active ? 'vote-button active' : 'vote-button'} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}

function BillDetail({ bill, commentCount, userVote, saved, onVote, onSave }) {
  return (
    <aside className="detail-panel" aria-label="Bill details">
      <div className="detail-hero">
        <img src={bill.image} alt="" />
        <div className="detail-actions">
          <button className={saved ? 'round-action active' : 'round-action'} onClick={onSave} aria-label="Save">
            <Bookmark size={18} />
          </button>
          <button className="round-action" aria-label="Close detail"><X size={18} /></button>
        </div>
      </div>
      <div className="detail-body">
        <div className="meta-row">
          <span>{bill.chamber}</span>
          <span>{bill.category}</span>
          <span>{bill.jurisdiction}</span>
        </div>
        <h2>{bill.title}</h2>
        <p className="detail-copy">{bill.detail}</p>
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
      </div>
    </aside>
  );
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
      <h1>{bill.title}</h1>
      <section className="ai-overview-box">
        <div className="section-title">
          <FileText size={18} />
          <strong>AI overview</strong>
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
