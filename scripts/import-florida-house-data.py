#!/usr/bin/env python3
"""Import Florida House members, bills, and validated member-level votes.

The Florida House site rejects some generic HTTP clients. This importer uses the
same public HTML pages a browser receives, adds a harmless query parameter where
needed, caches responses, and validates every parsed roll call against the
published Yes/No totals before writing data.
"""

from __future__ import annotations

import concurrent.futures
import hashlib
import html
import json
import re
import time
import unicodedata
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urljoin, urlparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".cache" / "florida-house"
OUTPUT = ROOT / "data" / "florida-house-official-data.json"
BASE = "https://flhouse.gov"
ROSTER_URL = f"{BASE}/Sections/Representatives/representatives.aspx?LegislativeTermId=91"
SESSION_IDS = {
    "2025C": 111,
    "2026": 113,
    "2026D": 116,
    "2026E": 119,
    "2026F": 122,
}
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0 Safari/537.36",
    "Referer": "https://www.flhouse.gov/",
    "Accept": "text/html,application/xhtml+xml",
}


def clean(value: str) -> str:
    value = re.sub(r"<[^>]+>", " ", value or "")
    return re.sub(r"\s+", " ", html.unescape(value)).strip()


def slug(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")


def cache_path(url: str) -> Path:
    return CACHE / f"{hashlib.sha256(url.encode()).hexdigest()}.html"


def fetch(url: str, *, retries: int = 4) -> str:
    CACHE.mkdir(parents=True, exist_ok=True)
    path = cache_path(url)
    if path.exists() and path.stat().st_size > 500:
        return path.read_text(encoding="utf-8", errors="replace")
    for attempt in range(retries):
        try:
            with urlopen(Request(url, headers=HEADERS), timeout=45) as response:
                body = response.read().decode("utf-8", errors="replace")
            if "Request Rejected" in body or len(body) < 500:
                raise RuntimeError("official site rejected the request")
            path.write_text(body, encoding="utf-8")
            return body
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"Unable to fetch {url}")


def tag_value(page: str, element_id: str) -> str:
    match = re.search(
        rf'<[^>]+id=["\']{re.escape(element_id)}["\'][^>]*>([\s\S]*?)</[^>]+>',
        page,
        re.I,
    )
    return clean(match.group(1)) if match else ""


def parse_members(page: str) -> list[dict]:
    partial_marker = page.lower().find("who served a partial term")
    pattern = re.compile(
        r'<a href="(/Sections/Representatives/details\.aspx\?MemberId=(\d+)&(?:amp;)?LegislativeTermId=\d+)"'
        r'[\s\S]*?<h5>([\s\S]*?)</h5>\s*<p>([^<]+)&mdash;\s*<span[^>]*>District:\s*(\d+)</span>',
        re.I,
    )
    members = []
    for match in pattern.finditer(page):
        profile_path, member_id, name_html, party_html, district = match.groups()
        historical = partial_marker >= 0 and match.start() > partial_marker
        members.append({
            "id": f"fl-house-member-{member_id}",
            "memberId": member_id,
            "name": clean(name_html).lstrip("* "),
            "chamber": "Florida House",
            "district": int(district),
            "party": clean(party_html),
            "profileUrl": urljoin(BASE, html.unescape(profile_path)),
            "claimStatus": "inactive" if historical else "unclaimed",
            "historical": historical,
        })
    return members


def bill_list_url(session_id: int, paging: str | None = None) -> str:
    params = {"chamber": "H", "sessionId": str(session_id)}
    if paging:
        params["PagingInfo"] = paging
    return f"{BASE}/Sections/Bills/bills.aspx?{urlencode(params)}"


def parse_bill_links(page: str) -> list[str]:
    paths = re.findall(r'href="(/Sections/Bills/billsdetail\.aspx\?BillId=\d+)', page, re.I)
    return list(dict.fromkeys(urljoin(BASE, html.unescape(path)) for path in paths))


def discover_bills(session_id: int) -> list[str]:
    first_url = bill_list_url(session_id)
    first_page = fetch(first_url)
    ranges = list(dict.fromkeys(re.findall(r'<option value="([0-9]+:[0-9]+)"', first_page, re.I)))
    pages = [first_page]
    if ranges:
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
            pages = list(pool.map(lambda value: fetch(bill_list_url(session_id, value)), ranges))
    return list(dict.fromkeys(link for page in pages for link in parse_bill_links(page)))


def parse_bill(page: str, url: str, session: str) -> tuple[dict, list[dict]]:
    bill_id = parse_qs(urlparse(url).query)["BillId"][0]
    display = tag_value(page, "bill-display-name").replace("-", "").strip()
    subject = tag_value(page, "header-bill-subject")
    summary = tag_value(page, "lblShortTitle") or subject
    last_action = tag_value(page, "lblLastAction")
    sponsors = re.sub(r"^by\s+", "", tag_value(page, "lblSponsors"), flags=re.I)
    item_id = f"fl-house-{session.lower()}-{slug(display or bill_id)}"
    bill = {
        "id": item_id,
        "billId": bill_id,
        "number": display,
        "title": subject,
        "summary": summary,
        "lastAction": last_action,
        "filedBy": sponsors,
        "chamber": "Florida House",
        "session": session,
        "sourceUrl": url,
    }
    votes = []
    for row in re.findall(r'<tr[^>]*>([\s\S]*?)</tr>', page, re.I):
        link = re.search(r'href="([^"]*floorvote\.aspx\?[^"]+)"', row, re.I)
        if not link:
            continue
        cells = [clean(cell) for cell in re.findall(r'<td[^>]*>([\s\S]*?)</td>', row, re.I)]
        if len(cells) < 7 or cells[0].lower() != "house":
            continue
        vote_url = urljoin(BASE, html.unescape(link.group(1)).rstrip("&"))
        vote_id = parse_qs(urlparse(vote_url).query).get("VoteId", [""])[0]
        votes.append({
            "id": f"fl-house-floor-{vote_id}",
            "voteId": vote_id,
            "billId": item_id,
            "billNumber": display,
            "billTitle": subject,
            "chamber": "Florida House Floor",
            "date": cells[1].split()[0],
            "yeas": int(cells[2]),
            "nays": int(cells[3]),
            "action": cells[5] or cells[4] or "Floor vote",
            "sourceUrl": vote_url,
        })
    for link in re.findall(r'href="([^"]*Committees/billvote\.aspx\?[^"]+)"', page, re.I):
        vote_url = urljoin(BASE, html.unescape(link).rstrip("&"))
        vote_id = parse_qs(urlparse(vote_url).query).get("VoteId", [""])[0]
        votes.append({
            "id": f"fl-house-committee-{vote_id}",
            "voteId": vote_id,
            "billId": item_id,
            "billNumber": display,
            "billTitle": subject,
            "chamber": "Florida House Committee",
            "sourceUrl": vote_url,
        })
    return bill, votes


def parse_vote(page: str, vote: dict) -> dict:
    date_text = tag_value(page, "ctl00_MainContent_lblDate")
    if vote["chamber"].endswith("Committee"):
        vote["date"] = date_text.split()[0]
        vote["action"] = tag_value(page, "ctl00_MainContent_lblAction") or "Committee vote"
        committee = tag_value(page, "ctl00_MainContent_lblCommittee")
        if committee:
            vote["chamber"] = f"Florida House Committee · {committee}"
    vote["yeas"] = int(tag_value(page, "ctl00_MainContent_lblYeas") or vote.get("yeas", 0))
    vote["nays"] = int(tag_value(page, "ctl00_MainContent_lblNays") or vote.get("nays", 0))
    member_votes = []
    for css_class, block in re.findall(
        r'<div role="row" class="([^"]*(?:yes-vote|no-vote)[^"]*)">([\s\S]*?)</div>', page, re.I
    ):
        cells = re.findall(r'<span role="gridcell"[^>]*>([\s\S]*?)</span>', block, re.I)
        if len(cells) < 2:
            continue
        member_votes.append({
            "name": clean(cells[-1]),
            "vote": "yes" if "yes-vote" in css_class else "no",
        })
    parsed_yes = sum(member["vote"] == "yes" for member in member_votes)
    parsed_no = sum(member["vote"] == "no" for member in member_votes)
    vote["memberVotes"] = member_votes
    vote["validation"] = {
        "publishedYeas": vote["yeas"],
        "publishedNays": vote["nays"],
        "parsedYeas": parsed_yes,
        "parsedNays": parsed_no,
        "matchesPublishedTotals": parsed_yes == vote["yeas"] and parsed_no == vote["nays"],
    }
    return vote


def member_aliases(member: dict) -> list[str]:
    surname, _, given = member["name"].partition(",")
    vote_surname = re.sub(r"\s+(?:Jr\.?|Sr\.?|II|III|IV)$", "", surname, flags=re.I)
    aliases = [vote_surname]
    if given.strip():
        aliases.append(f"{vote_surname}, {given.strip()[0]}.")
    return [slug(alias) for alias in aliases]


def resolve_members(votes: list[dict], members: list[dict]) -> int:
    aliases: dict[str, list[dict]] = {}
    for member in members:
        for alias in member_aliases(member):
            aliases.setdefault(alias, []).append(member)
    unresolved = set()
    for vote in votes:
        for member_vote in vote["memberVotes"]:
            candidates = aliases.get(slug(member_vote["name"]), [])
            if len(candidates) == 1:
                member_vote["officialId"] = candidates[0]["id"]
            else:
                unresolved.add(member_vote["name"])
    if unresolved:
        raise RuntimeError(f"Unresolved or ambiguous member names: {', '.join(sorted(unresolved))}")
    return sum(len(vote["memberVotes"]) for vote in votes)


def parse_date(value: str) -> datetime | None:
    for fmt in ("%m/%d/%Y", "%m/%d/%y"):
        try:
            return datetime.strptime(value, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    return None


def main() -> None:
    generated_at = datetime.now(timezone.utc)
    window_start = generated_at - timedelta(days=365)
    roster_page = fetch(ROSTER_URL)
    members = parse_members(roster_page)
    current_members = [member for member in members if not member["historical"]]
    if len(current_members) < 110:
        raise RuntimeError(f"Expected at least 110 current House members; parsed {len(current_members)}")

    bill_jobs = []
    for session, session_id in SESSION_IDS.items():
        bill_jobs.extend((session, link) for link in discover_bills(session_id))
    bill_jobs = list(dict.fromkeys(bill_jobs))
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        pages = list(pool.map(lambda job: fetch(job[1]), bill_jobs))

    bills = []
    vote_map = {}
    for (session, url), page in zip(bill_jobs, pages):
        bill, votes = parse_bill(page, url, session)
        bills.append(bill)
        for vote in votes:
            vote_map[vote["id"]] = vote

    vote_stubs = list(vote_map.values())
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        vote_pages = list(pool.map(lambda vote: fetch(vote["sourceUrl"]), vote_stubs))
    votes = [parse_vote(page, vote) for vote, page in zip(vote_stubs, vote_pages)]
    votes = [
        vote for vote in votes
        if (vote_date := parse_date(vote.get("date", ""))) and window_start <= vote_date <= generated_at
    ]
    mismatches = [vote["id"] for vote in votes if not vote["validation"]["matchesPublishedTotals"]]
    if mismatches:
        raise RuntimeError(f"Published total mismatches: {', '.join(mismatches[:20])}")
    member_vote_count = resolve_members(votes, members)

    data = {
        "generatedAt": generated_at.isoformat().replace("+00:00", "Z"),
        "window": {
            "startDate": window_start.date().isoformat(),
            "endDate": generated_at.date().isoformat(),
            "label": "Past 12 months",
            "note": "Florida House floor and committee roll calls published during the stated 12-month window. Profiles show only validated, sourced Yes/No votes.",
        },
        "sources": {
            "members": ROSTER_URL,
            "bills": {session: bill_list_url(session_id) for session, session_id in SESSION_IDS.items()},
        },
        "counts": {
            "currentOfficials": len(current_members),
            "historicalOfficials": len(members) - len(current_members),
            "bills": len(bills),
            "rollCalls": len(votes),
            "memberVotes": member_vote_count,
        },
        "officials": members,
        "bills": bills,
        "rollCalls": votes,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(data["counts"], indent=2))


if __name__ == "__main__":
    main()
