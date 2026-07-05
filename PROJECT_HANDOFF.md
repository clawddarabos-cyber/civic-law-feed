# Civic Law Feed Project Handoff

Last updated: 2026-07-05

## Current Status

This is a clickable React/Vite prototype for a civic social feed where people can browse active bills/laws, vote Yes or No, save items, search/filter topics, and inspect a detail panel with arguments and social context.

The project was created as a fast prototype, then published publicly so it could be viewed at:

- Live site: https://civics.johndarabos.com/
- GitHub repo: https://github.com/clawddarabos-cyber/civic-law-feed
- Local path: `/Users/adam/.openclaw/workspace/civic-law-feed`

The live site is deployed through GitHub Pages with a Cloudflare DNS record pointing `civics.johndarabos.com` to `clawddarabos-cyber.github.io`. On 2026-07-05, the Cloudflare record was switched to proxied so the public site serves valid browser SSL through Cloudflare while GitHub Pages still reports no custom-domain certificate of its own.

## Why It Exists

The original product direction was a Facebook-style civic feed:

- Users see active bills/laws in a familiar social feed.
- Each bill has a plain-English summary, jurisdiction, status, image, and category.
- Users can vote Yes or No.
- Users can save/bookmark items.
- Users can open a richer detail view with pros/cons, longer explanation, friend votes, and comment counts.

On 2026-07-05, John said: "Ok. Let's pivot. Save everything about this project to a file for working on later."

This file is the restart point.

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

- `src/App.jsx` contains the prototype data, state, feed UI, card components, voting, save/bookmark behavior, filtering, and detail panel.
- `src/main.jsx` mounts the React app and imports global CSS.
- `src/styles.css` contains the full responsive visual design.
- `index.html` is the Vite entry.
- `package.json` contains scripts and dependencies.

## Current Git State

Remote:

```text
origin https://github.com/clawddarabos-cyber/civic-law-feed.git
```

Recent commits:

```text
251335b Fix deployed React runtime import
27daa76 Initial civic law feed prototype
```

The key production bug that was fixed: the deployed bundle initially crashed with `React is not defined`. The fix was adding the explicit React import in `src/App.jsx`.

Current build verification on 2026-07-05:

```text
npm run build
```

Passed successfully.

## Deployment Notes

Deployment used GitHub Pages and Cloudflare DNS:

- Public repo: `clawddarabos-cyber/civic-law-feed`
- Custom domain: `civics.johndarabos.com`
- DNS: `civics.johndarabos.com` points to `clawddarabos-cyber.github.io`
- HTTP verified returning `200 OK` from GitHub Pages on 2026-07-05.
- HTTPS verified through Cloudflare proxy on 2026-07-05.

If work resumes, first check:

```bash
curl -I http://civics.johndarabos.com/
curl -I https://civics.johndarabos.com/
```

GitHub Pages may still report `https_enforced: false` because it has not issued its own certificate. The browser-facing HTTPS path currently works via Cloudflare proxy.

## Product Surface Implemented

Current prototype includes:

- Left navigation rail with Feed, Friends, Saved, Alerts.
- Trust panel saying summaries are drafts until reviewed against official bill text.
- Top bar for "Today's Votes."
- Search box across title, summary, and jurisdiction.
- Category filters: All, Environment, Economy, Education, Transportation.
- Bill cards with image, metadata, summary, status, Yes percentage, voting buttons, save button, and share button.
- Right-side detail panel with longer explanation, pros, cons, friend votes, and comment count.
- Responsive layout in CSS.

Seed bill data:

- Clean Water Infrastructure Renewal Act
- Small Business Property Tax Relief
- Student Data Privacy Standards
- Public Transit Reliability Funding

## Known Limitations

- All data is static mock data inside `src/App.jsx`.
- Votes and saved state are local React state only; they reset on refresh.
- No authentication.
- No backend.
- No real bill APIs.
- No comments implementation beyond placeholder/comment count.
- Share button is visual only.
- Friend votes are fake seed data.
- Summary trust/review workflow is not implemented.
- No official source links or bill text parsing.
- GitHub Pages native HTTPS enforcement is still off; Cloudflare is handling public SSL for the custom domain.

## Good Next Directions

Possible pivots:

- Turn this into a real civic bill tracker using federal/state bill APIs.
- Keep it as a product demo and improve design/interactions.
- Use it as a seed for a broader civic social network.
- Convert it into a backend-backed app with accounts, real votes, saved bills, comments, and notifications.
- Shift from "voting on bills" to "understanding legislation with AI summaries and source citations."

If continuing from the current prototype, the next pragmatic step is to add official bill source links and replace the mock `bills` array with a small structured data layer. After that, add persistence for votes/saves.

## Resume Checklist

1. Open `/Users/adam/.openclaw/workspace/civic-law-feed`.
2. Run `git status --short`.
3. Run `npm install` if dependencies are missing.
4. Run `npm run build`.
5. Check `http://civics.johndarabos.com/`.
6. Check whether HTTPS now works.
7. Decide whether to continue this concept or use the prototype only as reference for the new pivot.
