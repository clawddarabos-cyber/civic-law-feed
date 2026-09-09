#!/usr/bin/env python3
"""Append member-level Florida Senate floor votes from official daily journals."""

from __future__ import annotations

import hashlib
import io
import json
import re
import time
from datetime import datetime
from pathlib import Path
from urllib.request import Request, urlopen

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "florida-official-data.json"
CACHE_PATH = ROOT / ".cache" / "florida-journals"
JOURNALS_URL = "https://www.flsenate.gov/Session/Journals/DailyJournals/2026"
BASE_URL = "https://www.flsenate.gov"
FORMER_MEMBERS_IN_WINDOW = ["Avila"]


def download(url: str, suffix: str) -> bytes:
    cache_file = CACHE_PATH / f"{hashlib.sha256(url.encode()).hexdigest()}{suffix}"
    if cache_file.exists():
        return cache_file.read_bytes()

    request = Request(url, headers={"User-Agent": "Mozilla/5.0 CivicLawFeed/0.1"})
    with urlopen(request, timeout=60) as response:
        body = response.read()
    CACHE_PATH.mkdir(parents=True, exist_ok=True)
    cache_file.write_bytes(body)
    time.sleep(0.5)
    return body


def journal_links(html: str, start_date: datetime, end_date: datetime) -> list[tuple[str, str]]:
    matches = re.findall(
        r'<a href="([^"]+journal-[^"]+\.pdf)"[^>]*>([^<]+)</a>',
        html,
        flags=re.IGNORECASE,
    )
    results = []
    for href, label in matches:
        date = datetime.strptime(label.strip(), "%B %d, %Y")
        if start_date <= date <= end_date:
            results.append((BASE_URL + href, date.strftime("%-m/%-d/%Y")))
    return results


def matched_names(block: str, member_names: list[str], expected: int) -> list[str]:
    if expected == 0:
        return []
    candidates = [("Mr. President", "Albritton"), *[(name, name) for name in member_names]]
    spans: list[tuple[int, int]] = []
    found: list[tuple[int, str]] = []
    for needle, normalized in sorted(candidates, key=lambda item: len(item[0]), reverse=True):
        pattern = r"Mr\.?\s*President" if needle == "Mr. President" else re.escape(needle).replace(r"\ ", r"\s*")
        for match in re.finditer(rf"(?<![A-Za-z]){pattern}(?![A-Za-z])", block, re.IGNORECASE):
            if any(match.start() < end and match.end() > start for start, end in spans):
                continue
            spans.append(match.span())
            found.append((match.start(), normalized))
    return [name for _, name in sorted(found)[:expected]]


def normalize_bill_number(raw: str) -> str:
    compact = re.sub(r"\s+", " ", raw.strip().upper())
    match = re.search(r"(SB|HB)\s*(\d+)", compact)
    return f"{match.group(1)} {match.group(2)}" if match else compact


def parse_floor_votes(
    pdf_bytes: bytes,
    journal_url: str,
    date: str,
    member_names: list[str],
    bill_titles: dict[str, str],
) -> list[dict]:
    text = "\n".join(page.extract_text() or "" for page in PdfReader(io.BytesIO(pdf_bytes)).pages)
    marker = re.compile(
        r"The vote(?:\s+on\s+passage)?\s+was:\s*Yeas[—-](\d+|None)\s*(.*?)\s*Nays[—-](\d+|None)\s*",
        flags=re.IGNORECASE | re.DOTALL,
    )
    matches = list(marker.finditer(text))
    records = []

    for index, match in enumerate(matches):
        next_start = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        published_yes = 0 if match.group(1).lower() == "none" else int(match.group(1))
        published_no = 0 if match.group(3).lower() == "none" else int(match.group(3))
        yes_names = matched_names(match.group(2), member_names, published_yes)
        after_nays = text[match.end():next_start]
        no_names = matched_names(after_nays[:2500], member_names, published_no)

        context = " ".join(text[max(0, match.start() - 2400):match.start()].split())
        bill_matches = re.findall(
            r"(?:(?:CS(?:/CS)*\s+for\s+)?(?:CS(?:/CS)*/)?(?:SB|HB)\s*\d+)",
            context,
            flags=re.IGNORECASE,
        )
        bill_number = normalize_bill_number(bill_matches[-1]) if bill_matches else "Floor measure"
        member_votes = [
            *({"name": name, "vote": "yes"} for name in yes_names),
            *({"name": name, "vote": "no"} for name in no_names),
        ]
        record_id = hashlib.sha256(f"{journal_url}:{index}:{bill_number}".encode()).hexdigest()[:16]
        records.append({
            "id": f"fl-floor-{record_id}",
            "billId": None,
            "billNumber": bill_number,
            "billTitle": bill_titles.get(bill_number, "Floor vote recorded in the Senate Journal"),
            "chamber": "Floor",
            "date": date,
            "yeas": published_yes,
            "nays": published_no,
            "sourceUrl": journal_url,
            "memberVotes": member_votes,
            "validation": {
                "publishedYeas": published_yes,
                "publishedNays": published_no,
                "parsedYeas": len(yes_names),
                "parsedNays": len(no_names),
                "matchesPublishedTotals": len(yes_names) == published_yes and len(no_names) == published_no,
            },
        })
    return records


def main() -> None:
    data = json.loads(DATA_PATH.read_text())
    start_date = datetime.strptime(data["window"]["startDate"], "%Y-%m-%d")
    end_date = datetime.strptime(data["window"]["endDate"], "%Y-%m-%d")
    member_names = sorted({
        *(official["name"].split(",")[0].strip() for official in data["officials"]),
        *FORMER_MEMBERS_IN_WINDOW,
    })
    bill_titles = {bill["number"].upper(): bill["title"] for bill in data["bills"]}
    index_html = download(JOURNALS_URL, ".html").decode("utf-8", errors="replace")
    links = journal_links(index_html, start_date, end_date)
    floor_votes = []
    for url, date in links:
        floor_votes.extend(parse_floor_votes(download(url, ".pdf"), url, date, member_names, bill_titles))

    mismatches = [record["id"] for record in floor_votes if not record["validation"]["matchesPublishedTotals"]]
    if mismatches:
        raise SystemExit(f"Floor roll-call total mismatches: {', '.join(mismatches)}")

    data["rollCalls"] = [record for record in data["rollCalls"] if record["chamber"] != "Floor"] + floor_votes
    data["window"]["note"] = (
        "Florida Senate committee roll-call PDFs and daily-journal floor votes published during the stated "
        "12-month window. Profiles show only sourced member-level votes."
    )
    DATA_PATH.write_text(json.dumps(data, indent=2) + "\n")
    member_votes = sum(len(record["memberVotes"]) for record in floor_votes)
    print(f"Imported {len(floor_votes)} validated floor roll calls with {member_votes} member votes from {len(links)} journals")


if __name__ == "__main__":
    main()
