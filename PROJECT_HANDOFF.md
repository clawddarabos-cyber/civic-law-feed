# Civic Law Feed Project Handoff

Last updated: 2026-07-05

## Current Status

This is a public React/Vite prototype for a location-aware civic social feed. Users can browse civic items, vote Yes/No, save and share posts, open AI overview pages, add local comments, allow location lookup, and compare their votes against starter Florida official profiles.

- Live site: https://civics.johndarabos.com/
- GitHub repo: https://github.com/clawddarabos-cyber/civic-law-feed
- Local path: `/Users/adam/.openclaw/workspace/civic-law-feed`

The live site is deployed through GitHub Pages. `civics.johndarabos.com` is proxied through Cloudflare, so browser-facing HTTPS works through Cloudflare even though GitHub Pages may still report native HTTPS enforcement as off for the custom domain.

## Product Direction

The product direction is a civic network:

- Users see federal, state, and county-level laws/items based on location.
- Each post has a plain-English summary, official source/validation links, votes, saves, shares, and comments.
- Clicking a title, image, description, or AI overview link opens a dedicated post page.
- Users can compare their votes against politicians' recorded votes.
- Politicians get auto-created public profiles and can claim them, like a Google Business Profile for elected officials.

## Tech Stack

- Vite 7
- React 19
- React DOM 19
- lucide-react icons
- Static deploy target

Useful commands:

```bash
npm install
npm run dev
npm run build
npm run preview
```

The local dev server uses Vite with `--host 0.0.0.0`.

## Files

- `src/App.jsx` contains the prototype data, routing state, feed UI, AI overview pages, local comments, voting, save/share behavior, location lookup, and official profile comparison.
- `src/main.jsx` mounts the React app and imports global CSS.
- `src/styles.css` contains the responsive visual design.
- `index.html` is the Vite entry.
- `package.json` contains scripts and dependencies.

## Implemented Surface

Current prototype includes:

- Single top nav bar on mobile with Feed, Officials, Saved, Alerts, search, and profile/location icons.
- Search icon opens the tucked search/filter panel.
- Profile icon opens a location panel.
- Browser geolocation permission flow.
- U.S. Census Geocoder lookup from coordinates to state/county.
- Saint Johns, Florida default jurisdiction.
- Jurisdiction filters: All, Federal, Florida, St. Johns County.
- Feed cards with images, summaries, source links, Yes/No voting, comment counts, save, and share.
- Card image/title/description open the dedicated post page.
- AI overview route at `#/overview/:id`.
- Post page with AI-style overview, pros/cons, official source links, comments, and a local comment form.
- Save button toggles bookmark state and shows toast feedback.
- Share button uses native Web Share when available or copies the post URL to clipboard.
- Officials section with starter Florida official profiles.
- Official profile cards include source links, recorded votes, comparison against the user's votes, and a Claim Profile CTA.
- Florida data importer script that pulls official Florida Senate members and a first page of 2026 Senate bills into `data/florida-official-data.json`.

## Data Sources and Caveats

The app still uses prototype data in `src/App.jsx`. Official links are attached, but items and official profile records are not live-ingested yet.

Current official source targets:

- Federal: https://www.congress.gov/
- Congress.gov API docs: https://www.loc.gov/apis/additional-apis/congress-dot-gov-api/
- Florida House bills: https://www.flhouse.gov/sections/bills/bills.aspx
- Florida Senate bills: https://www.flsenate.gov/session/bills
- Florida House members: https://www.flhouse.gov/Sections/Representatives/representatives.aspx
- Florida Senate members: https://www.flsenate.gov/Senators
- St. Johns County BCC agendas: https://stjohnsclerk.com/board-records/agendas/
- St. Johns County BCC calendar: https://www.sjcfl.us/bcc-calendar/
- St. Johns County commissioners: https://www.sjcfl.us/commissioners/
- Census geocoder: https://geocoding.geo.census.gov/geocoder/

Important: the politician profiles are placeholder profile records. The next serious milestone is ingesting real Florida House/Senate member and roll-call data, then creating profiles from that.

Current data spike:

- `npm run import:florida`
- Script: `scripts/import-florida-official-data.mjs`
- Output: `data/florida-official-data.json`
- Last run imported 40 Florida Senate officials, 40 Florida Senate bills, and 28 vote-history records from official Senate pages.
- Vote-history records currently include roll-call summary counts and source PDF links. Per-senator PDF parsing is not implemented yet.
- Florida House source is still tracked as an official source target, but member parsing has not been implemented yet.

## Recent Commits

```text
fc147a4 Add official vote archive depth
6aac7ff Add Florida official profiles
ef3c218 Wire save and share actions
429ca31 Link post content to overview pages
8d977f7 Add AI overview post comments
5c5238c Add location-aware civic sources
eb73943 Move civic actions into top nav
db56ae8 Simplify civic feed header search
5ee3ea5 Update civic SSL handoff
```

Deployment branch latest after the most recent work:

```text
687adb8 Deploy Florida official profiles
```

## Verification

Latest verification on 2026-07-05:

```bash
npm run build
curl -I https://civics.johndarabos.com/
```

The build passed and the live HTTPS page returned `200 OK`.

## Deployment Notes

Deployment is manual:

1. Run `npm run build`.
2. Add a temporary worktree for `origin/gh-pages`.
3. `rsync` `dist/` into the worktree, preserving `CNAME`.
4. Commit and push `HEAD:gh-pages`.
5. Wait briefly for GitHub Pages/Cloudflare cache to update.

Cloudflare/GitHub caching can show the previous asset bundle for 30-60 seconds after deployment. Recheck the HTML asset names before assuming deploy failed.

## Known Limitations

- Bills/laws are still static prototype records.
- Official source links point to official portals, not item-specific source documents yet.
- Votes, saves, comments, and claim actions are local React state only.
- No authentication.
- No backend.
- No persistent database.
- No real comments/moderation system.
- No real official-profile claiming workflow.
- No live roll-call ingestion.
- No user identity or district-based representative matching beyond Census state/county lookup.

## Best Next Steps

1. Build a real data ingestion layer for Florida first.
2. Replace prototype profile cards with generated records from `data/florida-official-data.json`.
3. Add Florida House member ingestion.
4. Ingest roll-call votes and map them to bill/item records.
5. Make official profiles item-specific and source-backed.
6. Add authentication and persistence for user votes, saved posts, comments, and claim requests.
7. Replace static prototype cards with official-source records for Florida and St. Johns County.

## Resume Checklist

1. Open `/Users/adam/.openclaw/workspace/civic-law-feed`.
2. Run `git status --short`.
3. Run `npm install` if dependencies are missing.
4. Run `npm run build`.
5. Check `https://civics.johndarabos.com/`.
6. Decide whether to continue with real Florida data ingestion or pivot to another feature.
