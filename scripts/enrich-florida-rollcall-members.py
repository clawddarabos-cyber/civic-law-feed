#!/usr/bin/env python3
"""Add member-level votes from official Florida Senate roll-call PDFs."""

from __future__ import annotations

import io
import hashlib
import json
import re
import time
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "florida-official-data.json"
CACHE_PATH = ROOT / ".cache" / "florida-rollcalls"


def download(url: str) -> bytes:
    cache_file = CACHE_PATH / f"{hashlib.sha256(url.encode()).hexdigest()}.pdf"
    if cache_file.exists():
        return cache_file.read_bytes()

    request = Request(url, headers={"User-Agent": "Mozilla/5.0 CivicLawFeed/0.1"})
    try:
        with urlopen(request, timeout=30) as response:
            body = response.read()
    except HTTPError as error:
        if error.code == 429:
            retry_after = error.headers.get("Retry-After", "unknown")
            raise RuntimeError(f"Florida Senate rate limit active; retry after {retry_after} seconds") from error
        raise

    CACHE_PATH.mkdir(parents=True, exist_ok=True)
    cache_file.write_bytes(body)
    time.sleep(0.35)
    return body


def extract_member_votes(pdf_bytes: bytes) -> list[dict[str, str]]:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    text = "\n".join(page.extract_text(extraction_mode="layout") or "" for page in reader.pages)
    votes = []

    for line in text.splitlines():
        match = re.match(r"^(\s*)(X|VA)\s+(.+?)\s*$", line)
        if not match:
            continue
        name = match.group(3).strip()
        if "TOTALS" in name or "CODES" in name:
            continue
        votes.append({
            "name": re.sub(r",\s*(CHAIR|VICE CHAIR)$", "", name, flags=re.IGNORECASE),
            "vote": "yes" if match.group(2) == "VA" or len(match.group(1)) < 15 else "no",
        })

    return votes


def main() -> None:
    data = json.loads(DATA_PATH.read_text())
    mismatches = []
    for roll_call in data["rollCalls"]:
        if not roll_call.get("memberVotes"):
            roll_call["memberVotes"] = extract_member_votes(download(roll_call["sourceUrl"]))

        parsed_yes = sum(vote["vote"] == "yes" for vote in roll_call["memberVotes"])
        parsed_no = sum(vote["vote"] == "no" for vote in roll_call["memberVotes"])
        roll_call["validation"] = {
            "publishedYeas": roll_call["yeas"],
            "publishedNays": roll_call["nays"],
            "parsedYeas": parsed_yes,
            "parsedNays": parsed_no,
            "matchesPublishedTotals": parsed_yes == roll_call["yeas"] and parsed_no == roll_call["nays"],
        }
        if not roll_call["validation"]["matchesPublishedTotals"]:
            mismatches.append(roll_call["id"])

    DATA_PATH.write_text(json.dumps(data, indent=2) + "\n")
    member_votes = sum(len(roll_call["memberVotes"]) for roll_call in data["rollCalls"])
    print(f"Enriched {len(data['rollCalls'])} official roll calls with {member_votes} member votes")
    print(f"Validated published totals: {len(data['rollCalls']) - len(mismatches)} passed, {len(mismatches)} failed")
    if mismatches:
        raise SystemExit(f"Roll-call total mismatches: {', '.join(mismatches)}")


if __name__ == "__main__":
    main()
