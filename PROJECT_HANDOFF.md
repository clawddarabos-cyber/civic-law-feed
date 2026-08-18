# Civic Law Feed Project Handoff

Last updated: 2026-08-17

## Current Status

This is a public React/Vite prototype for a nationwide, location-aware civic briefing feed. Users can browse civic items, vote Yes/No, save and share posts, open Plain-English summary pages, add local comments, allow location lookup, and compare their votes against starter official profiles.

- Live site: https://civics.johndarabos.com/
- GitHub repo: https://github.com/clawddarabos-cyber/civic-law-feed
- Local path: `/Users/adam/.openclaw/workspace/civic-law-feed`

The live site is deployed through GitHub Pages. `civics.johndarabos.com` is proxied through Cloudflare, so browser-facing HTTPS works through Cloudflare even though GitHub Pages may still report native HTTPS enforcement as off for the custom domain.

## Product Direction

The product direction is a nationwide civic briefing and source-backed sentiment tool:

- Users see federal, state, county, and eventually municipal laws/items based on location.
- Each post has a plain-English summary, official source/validation links, votes, saves, shares, and comments.
- Clicking a title, image, description, or Plain-English summary link opens a dedicated post page.
- Users can compare their votes against politicians' recorded votes.
- Politicians get auto-created public profiles and can claim them, like a Google Business Profile for elected officials.
- MVP is nationwide from day one. Florida remains the first seeded state import, not the product boundary.
- Federal coverage is required from the start.
- Use official government sources only for claims and source links.
- Label generated explanations as "Plain-English summary"; do not call them "AI overview" in product copy unless reviewed/approved later.
- Include official profiles in MVP.
- Disclaimer tone should be light: source-backed civic info, not legal advice.

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

- `src/App.jsx` contains the prototype data, imported federal records, routing state, feed UI, Plain-English summary pages, local comments, voting, save/share/reminder behavior, location lookup, source coverage registry, and official profile comparison.
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
- Nationwide demo default jurisdiction.
- Jurisdiction filters: All, Federal, State, County.
- Feed cards with images, summaries, source links, Yes/No voting, comment counts, save, and share.
- Card image/title/description open the dedicated post page.
- Plain-English summary route at `#/overview/:id`.
- Post page with Plain-English summary, pros/cons, official source links, comments, and a local comment form.
- Save button toggles bookmark state and shows toast feedback.
- Share button uses native Web Share when available or copies the post URL to clipboard.
- Officials section framed as nationwide official profiles, currently seeded by one federal sponsor record and Florida Senate official data.
- Official profile cards include source links, recorded votes, comparison against the user's votes, and a Claim Profile CTA.
- Florida data importer script that pulls official Florida Senate members and a first page of 2026 Senate bills into `data/florida-official-data.json`.

## Data Sources and Caveats

The app now renders a small static import of current federal bills from the official Congress.gov API ahead of the prototype records in `src/App.jsx`. One federal official profile is seeded from imported sponsor context. State/local feed items and official profile records are still mostly prototype or seed data.

Current official source targets and coverage plan:

- Federal: https://www.congress.gov/
- Congress.gov API docs: https://www.loc.gov/apis/additional-apis/congress-dot-gov-api/
- GovInfo: https://www.govinfo.gov/
- Federal Register: https://www.federalregister.gov/
- Regulations.gov: https://www.regulations.gov/
- eCFR: https://www.ecfr.gov/
- USA.gov state government directory: https://www.usa.gov/state-governments
- USA.gov local government directory: https://www.usa.gov/local-governments
- Florida House bills: https://www.flhouse.gov/sections/bills/bills.aspx
- Florida Senate bills: https://www.flsenate.gov/session/bills
- Florida House members: https://www.flhouse.gov/Sections/Representatives/representatives.aspx
- Florida Senate members: https://www.flsenate.gov/Senators
- St. Johns County BCC agendas: https://stjohnsclerk.com/board-records/agendas/
- St. Johns County BCC calendar: https://www.sjcfl.us/bcc-calendar/
- St. Johns County commissioners: https://www.sjcfl.us/commissioners/
- Census geocoder: https://geocoding.geo.census.gov/geocoder/

Important: most politician profiles are still placeholder-style records generated from imported official member data. The next serious milestone is a nationwide connector registry, starting with federal roll-call/member ingestion and then repeatable state/local connectors.

Current data spike:

- `npm run import:florida`
- `npm run import:federal`
- `npm run import:federal-officials`
- Script: `scripts/import-florida-official-data.mjs`
- Script: `scripts/import-federal-civic-items.mjs`
- Script: `scripts/import-federal-official-data.mjs`
- Output: `data/florida-official-data.json`
- Output: `data/federal-civic-items.json`
- Output: `data/federal-official-data.json`
- Last federal import pulled 6 current 119th Congress bills from Congress.gov v3. The importer now supports sponsor, committee, action, and summary detail imports. It uses `CONGRESS_GOV_API_KEY` when present and falls back to `DEMO_KEY`, but the public demo key rate-limits quickly, so regular detail imports need a real key.
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

1. Build the federal ingestion connector first: Congress.gov bills, members, committees, actions, and roll calls where available.
2. Define a repeatable state/local source connector schema for legislature, executive rulemaking, county/city agendas, clerks, minutes, and official directories.
3. Keep Florida as the first state import and add Florida House member/roll-call ingestion.
4. Replace prototype feed cards with official-source records for federal, state, and local items.
5. Make official profiles item-specific, source-backed, and nationwide.
6. Add authentication and persistence for user votes, saved posts, comments, and claim requests.
7. Add district matching after geolocation so users see their federal, state, county, and municipal officials.

## Resume Checklist

1. Open `/Users/adam/.openclaw/workspace/civic-law-feed`.
2. Run `git status --short`.
3. Run `npm install` if dependencies are missing.
4. Run `npm run build`.
5. Check `https://civics.johndarabos.com/`.
6. Continue with nationwide ingestion: federal first, Florida as the first state connector, then local agenda connectors.
