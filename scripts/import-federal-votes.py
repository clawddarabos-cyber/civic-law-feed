#!/usr/bin/env python3
"""Import and validate one year of official U.S. House and Senate roll calls."""

from __future__ import annotations

import concurrent.futures
import datetime as dt
import json
import os
import re
import threading
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path


CONGRESS = int(os.environ.get("CONGRESS_NUMBER", "119"))
TODAY = dt.date.fromisoformat(os.environ.get("FEDERAL_VOTE_END_DATE", dt.date.today().isoformat()))
CUTOFF = TODAY - dt.timedelta(days=365)
YEARS = range(CUTOFF.year, TODAY.year + 1)
CACHE_DIR = Path(".cache/federal-votes")
OUTPUT_PATH = Path("data/federal-votes.json")
WORKERS = int(os.environ.get("FEDERAL_VOTE_WORKERS", "12"))
MIN_REQUEST_INTERVAL = float(os.environ.get("FEDERAL_VOTE_REQUEST_INTERVAL", "0.35"))
CHAMBERS = {value.strip().lower() for value in os.environ.get("FEDERAL_VOTE_CHAMBERS", "house,senate").split(",")}
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Civics/1.0"
REQUEST_LOCK = threading.Lock()
LAST_REQUEST_AT = 0.0


def fetch(url: str, cache_key: str) -> bytes:
    global LAST_REQUEST_AT
    path = CACHE_DIR / cache_key
    if path.exists():
        return path.read_bytes()
    path.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(5):
        try:
            with REQUEST_LOCK:
                delay = MIN_REQUEST_INTERVAL - (time.monotonic() - LAST_REQUEST_AT)
                if delay > 0:
                    time.sleep(delay)
                LAST_REQUEST_AT = time.monotonic()
            with urllib.request.urlopen(request, timeout=45) as response:
                content = response.read()
            path.write_bytes(content)
            return content
        except urllib.error.HTTPError as error:
            if error.code == 404:
                raise
            if error.code != 403 or attempt == 4:
                raise
            time.sleep(30 * (attempt + 1))
        except (urllib.error.URLError, TimeoutError):
            if attempt == 4:
                raise
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"Unable to fetch {url}")


def text(parent: ET.Element, path: str, default: str = "") -> str:
    value = parent.findtext(path)
    return " ".join((value or default).split())


def integer(parent: ET.Element, path: str) -> int:
    raw = text(parent, path, "0")
    return int(raw) if raw.isdigit() else 0


def normalize_vote(value: str) -> str | None:
    normalized = value.strip().lower()
    if normalized in {"yea", "aye", "yes", "guilty"}:
        return "yes"
    if normalized in {"nay", "no", "not guilty"}:
        return "no"
    return None


def federal_item_id(issue: str) -> str | None:
    normalized = re.sub(r"[.\s]+", " ", issue.upper()).strip()
    patterns = [
        (r"^H R (\d+)$", "hr"),
        (r"^H RES (\d+)$", "hres"),
        (r"^H J RES (\d+)$", "hjres"),
        (r"^H CON RES (\d+)$", "hconres"),
        (r"^S (\d+)$", "s"),
        (r"^S RES (\d+)$", "sres"),
        (r"^S J RES (\d+)$", "sjres"),
        (r"^S CON RES (\d+)$", "sconres"),
    ]
    for pattern, kind in patterns:
        match = re.match(pattern, normalized)
        if match:
            return f"congress-{CONGRESS}-{kind}-{match.group(1)}"
    return None


def house_max_roll(year: int) -> int:
    html = fetch(f"https://clerk.house.gov/evs/{year}/index.asp", f"house/{year}/index.html").decode("latin-1")
    numbers = [int(value) for value in re.findall(r"rollnumber=(\d+)", html, re.I)]
    if not numbers:
        for group in re.findall(r"ROLL_(\d+)\.asp", html, re.I):
            page = fetch(f"https://clerk.house.gov/evs/{year}/ROLL_{group}.asp", f"house/{year}/index-{group}.html").decode("latin-1")
            numbers.extend(int(value) for value in re.findall(r"rollnumber=(\d+)", page, re.I))
    if not numbers:
        raise RuntimeError(f"No House roll calls found for {year}")
    return max(numbers)


def house_vote_numbers(year: int) -> list[int]:
    maximum = house_max_roll(year)
    numbers = []
    for group in range((maximum // 100) * 100, -1, -100):
        url = f"https://clerk.house.gov/evs/{year}/ROLL_{group:03d}.asp"
        html = fetch(url, f"house/{year}/index-{group:03d}.html").decode("latin-1")
        for row in re.findall(r"<TR>([\s\S]*?)</TR>", html, re.I):
            number_match = re.search(r"rollnumber=(\d+)", row, re.I)
            date_match = re.search(r">(\d{1,2}-[A-Za-z]{3})<", row)
            if not number_match or not date_match:
                continue
            vote_date = dt.datetime.strptime(f"{date_match.group(1)}-{year}", "%d-%b-%Y").date()
            if CUTOFF <= vote_date <= TODAY:
                numbers.append(int(number_match.group(1)))
    return sorted(set(numbers))


def parse_house_vote(year: int, number: int) -> dict | None:
    xml_url = f"https://clerk.house.gov/evs/{year}/roll{number:03d}.xml"
    try:
        root = ET.fromstring(fetch(xml_url, f"house/{year}/roll{number:03d}.xml"))
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return None
        raise
    date = dt.datetime.strptime(text(root, "./vote-metadata/action-date"), "%d-%b-%Y").date()
    if date < CUTOFF or date > TODAY:
        return None
    metadata = root.find("./vote-metadata")
    issue = text(metadata, "legis-num") or f"House Roll Call {number}"
    title = text(metadata, "vote-desc") or text(metadata, "vote-question") or issue
    yeas = integer(metadata, "./vote-totals/totals-by-vote/yea-total")
    nays = integer(metadata, "./vote-totals/totals-by-vote/nay-total")
    votes = []
    for recorded in root.findall("./vote-data/recorded-vote"):
        legislator = recorded.find("legislator")
        vote = normalize_vote(text(recorded, "vote"))
        bioguide_id = legislator.attrib.get("name-id", "") if legislator is not None else ""
        if vote and bioguide_id:
            votes.append({
                "officialId": f"congress-member-{bioguide_id}",
                "name": (legislator.text or legislator.attrib.get("sort-field", "")).strip(),
                "party": legislator.attrib.get("party"),
                "state": legislator.attrib.get("state"),
                "vote": vote,
            })
    parsed_yeas = sum(vote["vote"] == "yes" for vote in votes)
    parsed_nays = sum(vote["vote"] == "no" for vote in votes)
    return {
        "id": f"us-house-{CONGRESS}-{year}-{number}",
        "billId": federal_item_id(issue),
        "billNumber": issue,
        "billTitle": title,
        "chamber": "U.S. House",
        "date": date.isoformat(),
        "yeas": yeas,
        "nays": nays,
        "question": text(metadata, "vote-question"),
        "result": text(metadata, "vote-result"),
        "sourceUrl": f"https://clerk.house.gov/Votes/{year}{number}",
        "memberVotes": votes,
        "validation": {
            "publishedYeas": yeas,
            "publishedNays": nays,
            "parsedYeas": parsed_yeas,
            "parsedNays": parsed_nays,
            "matchesPublishedTotals": parsed_yeas == yeas and parsed_nays == nays,
        },
    }


def senate_session_for_year(year: int) -> int:
    return year - 2024


def senate_vote_numbers(year: int) -> list[int]:
    session = senate_session_for_year(year)
    url = f"https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_{CONGRESS}_{session}.xml"
    root = ET.fromstring(fetch(url, f"senate/{year}/index.xml"))
    numbers = []
    for vote in root.findall("./votes/vote"):
        vote_date = dt.datetime.strptime(f'{text(vote, "vote_date")}-{year}', "%d-%b-%Y").date()
        if CUTOFF <= vote_date <= TODAY:
            numbers.append(int(text(vote, "vote_number")))
    return numbers


def senate_directory() -> dict[str, dict]:
    url = "https://www.senate.gov/legislative/LIS_MEMBER/cvc_member_data.xml"
    root = ET.fromstring(fetch(url, "senate/member-directory.xml"))
    result = {}
    for senator in root.findall("./senator"):
        lis_id = senator.attrib.get("lis_member_id", "")
        bioguide_id = text(senator, "bioguideId")
        if lis_id and bioguide_id:
            result[lis_id] = {
                "officialId": f"congress-member-{bioguide_id}",
                "name": " ".join(filter(None, [text(senator, "./name/first"), text(senator, "./name/last"), text(senator, "./name/suffix")])),
                "party": text(senator, "party"),
                "state": text(senator, "state"),
            }
    return result


def parse_senate_vote(year: int, number: int, directory: dict[str, dict]) -> tuple[dict | None, list[dict]]:
    session = senate_session_for_year(year)
    base = f"vote_{CONGRESS}_{session}_{number:05d}"
    xml_url = f"https://www.senate.gov/legislative/LIS/roll_call_votes/vote{CONGRESS}{session}/{base}.xml"
    root = ET.fromstring(fetch(xml_url, f"senate/{year}/{base}.xml"))
    date = dt.datetime.strptime(text(root, "vote_date"), "%B %d, %Y, %I:%M %p").date()
    if date < CUTOFF or date > TODAY:
        return None, []
    issue = text(root, "./document/document_name") or text(root, "vote_question_text") or f"Senate Roll Call {number}"
    title = text(root, "vote_title") or text(root, "./document/document_title") or issue
    yeas = integer(root, "./count/yeas")
    nays = integer(root, "./count/nays")
    historical = []
    votes = []
    for member in root.findall("./members/member"):
        vote = normalize_vote(text(member, "vote_cast"))
        if not vote:
            continue
        lis_id = text(member, "lis_member_id")
        mapped = directory.get(lis_id)
        name = " ".join(filter(None, [text(member, "first_name"), text(member, "last_name")]))
        if mapped:
            official_id = mapped["officialId"]
        else:
            official_id = f"us-senate-historical-{lis_id.lower()}"
            historical.append({
                "id": official_id,
                "lisMemberId": lis_id,
                "name": name,
                "office": "U.S. Senate (historical member)",
                "jurisdiction": "Federal",
                "party": text(member, "party"),
                "state": text(member, "state"),
                "sourceUrl": f"https://www.senate.gov/legislative/LIS/roll_call_votes/vote{CONGRESS}{session}/{base}.htm",
            })
        votes.append({
            "officialId": official_id,
            "name": name,
            "party": text(member, "party"),
            "state": text(member, "state"),
            "vote": vote,
        })
    parsed_yeas = sum(vote["vote"] == "yes" for vote in votes)
    parsed_nays = sum(vote["vote"] == "no" for vote in votes)
    source_url = f"https://www.senate.gov/legislative/LIS/roll_call_votes/vote{CONGRESS}{session}/{base}.htm"
    return {
        "id": f"us-senate-{CONGRESS}-{year}-{number}",
        "billId": federal_item_id(issue),
        "billNumber": issue,
        "billTitle": title,
        "chamber": "U.S. Senate",
        "date": date.isoformat(),
        "yeas": yeas,
        "nays": nays,
        "question": text(root, "question"),
        "result": text(root, "vote_result"),
        "sourceUrl": source_url,
        "memberVotes": votes,
        "validation": {
            "publishedYeas": yeas,
            "publishedNays": nays,
            "parsedYeas": parsed_yeas,
            "parsedNays": parsed_nays,
            "matchesPublishedTotals": parsed_yeas == yeas and parsed_nays == nays,
        },
    }, historical


def main() -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    directory = senate_directory()
    house_jobs = [(year, number) for year in YEARS for number in house_vote_numbers(year)] if "house" in CHAMBERS else []
    senate_jobs = [(year, number) for year in YEARS for number in senate_vote_numbers(year)] if "senate" in CHAMBERS else []

    house_votes = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as pool:
        for vote in pool.map(lambda args: parse_house_vote(*args), house_jobs):
            if vote:
                house_votes.append(vote)

    senate_votes = []
    historical_by_id = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as pool:
        for vote, historical in pool.map(lambda args: parse_senate_vote(*args, directory), senate_jobs):
            if vote:
                senate_votes.append(vote)
            for official in historical:
                historical_by_id[official["id"]] = official

    roll_calls = sorted(house_votes + senate_votes, key=lambda vote: (vote["date"], vote["id"]), reverse=True)
    directory_path = Path("data/representative-directory.json")
    known_official_ids = set()
    if directory_path.exists():
        directory_data = json.loads(directory_path.read_text(encoding="utf-8"))
        known_official_ids = {official["id"] for official in directory_data.get("officials", [])}
    for roll_call in roll_calls:
        for member_vote in roll_call["memberVotes"]:
            official_id = member_vote["officialId"]
            if official_id in known_official_ids or official_id in historical_by_id:
                continue
            historical_by_id[official_id] = {
                "id": official_id,
                "name": member_vote["name"],
                "office": f'{roll_call["chamber"]} (historical member)',
                "jurisdiction": "Federal",
                "party": member_vote.get("party"),
                "state": member_vote.get("state"),
                "sourceUrl": roll_call["sourceUrl"],
            }
    mismatches = [vote["id"] for vote in roll_calls if not vote["validation"]["matchesPublishedTotals"]]
    if mismatches:
        raise RuntimeError(f"Published totals mismatch for {len(mismatches)} roll calls: {', '.join(mismatches[:10])}")

    output = {
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "congress": CONGRESS,
        "coverage": {"startDate": CUTOFF.isoformat(), "endDate": TODAY.isoformat()},
        "sources": {
            "usHouse": "https://clerk.house.gov/Votes",
            "usSenate": f"https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_{CONGRESS}_1.htm",
        },
        "counts": {
            "usHouseRollCalls": len(house_votes),
            "usSenateRollCalls": len(senate_votes),
            "rollCalls": len(roll_calls),
            "memberVotes": sum(len(vote["memberVotes"]) for vote in roll_calls),
            "historicalOfficials": len(historical_by_id),
            "validationMismatches": 0,
        },
        "historicalOfficials": sorted(historical_by_id.values(), key=lambda official: official["name"]),
        "rollCalls": roll_calls,
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(output["counts"], indent=2))


if __name__ == "__main__":
    main()
