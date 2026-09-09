#!/usr/bin/env python3
"""Add member-level votes from official Florida Senate roll-call PDFs."""

from __future__ import annotations

import io
import json
import re
from pathlib import Path
from urllib.request import Request, urlopen

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "florida-official-data.json"


def download(url: str) -> bytes:
    request = Request(url, headers={"User-Agent": "Mozilla/5.0 CivicLawFeed/0.1"})
    with urlopen(request, timeout=30) as response:
        return response.read()


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
    for roll_call in data["rollCalls"]:
        roll_call["memberVotes"] = extract_member_votes(download(roll_call["sourceUrl"]))

    DATA_PATH.write_text(json.dumps(data, indent=2) + "\n")
    print(f"Enriched {len(data['rollCalls'])} official roll calls")


if __name__ == "__main__":
    main()
