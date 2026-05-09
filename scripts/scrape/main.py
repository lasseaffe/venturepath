"""
VenturePath inspire data scraper.
Orchestrates Wikipedia + Overpass fetches and writes public/data/inspire_all.json.

Usage:
    py -m scripts.scrape.main
"""

import json
import os
import time
from datetime import datetime, timezone

from scripts.scrape.sources import DESTINATIONS
from scripts.scrape.wikipedia_client import fetch_wikipedia
from scripts.scrape.overpass_client import fetch_pois

# Output written directly into the Vite public folder so the frontend can fetch it.
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUTPUT_PATH = os.path.join(REPO_ROOT, "public", "data", "inspire_all.json")

# Backup path (keep previous run for rollback)
BACKUP_DIR = os.path.join(REPO_ROOT, "scripts", "scrape", "_backups")


def save_backup(data: dict) -> None:
    os.makedirs(BACKUP_DIR, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S")
    path = os.path.join(BACKUP_DIR, f"inspire_all-{ts}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[main] Backup saved → {path}")


def scrape_destination(dest: dict) -> dict | None:
    """Build a single city object: Wikipedia metadata + Overpass POIs."""
    print(f"\n[main] ── {dest['name']} ({dest['country']}) ──")

    wiki = fetch_wikipedia(dest["wikipedia_title"])
    description = wiki["description"] or f"A remarkable destination in {dest['country']}."
    image_url = wiki["image_url"]

    pois = fetch_pois(dest)
    print(f"[main] {len(pois)} POIs fetched for {dest['name']}")

    # Require at least 1 POI to include the city — avoids publishing empty entries.
    if not pois:
        print(f"[main] WARNING: no POIs for {dest['name']} — skipping")
        return None

    return {
        "id":          dest["id"],
        "name":        dest["name"],
        "country":     dest["country"],
        "continent":   dest["continent"],
        "tags":        dest["tags"],
        "description": description,
        "image_url":   image_url,
        "pois":        pois,
    }


def run() -> None:
    print(f"[main] Starting VenturePath inspire scrape — {len(DESTINATIONS)} destinations")
    run_start = time.time()

    cities = []
    skipped = 0

    for dest in DESTINATIONS:
        city = scrape_destination(dest)
        if city:
            cities.append(city)
        else:
            skipped += 1

    output = {
        "version":   1,
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "cities":    cities,
    }

    # Backup first in case something went wrong
    if os.path.exists(OUTPUT_PATH):
        with open(OUTPUT_PATH, "r", encoding="utf-8") as f:
            try:
                existing = json.load(f)
                save_backup(existing)
            except json.JSONDecodeError:
                pass

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    elapsed = time.time() - run_start
    print(f"\n[main] Done in {elapsed:.1f}s")
    print(f"[main] {len(cities)} cities written, {skipped} skipped")
    print(f"[main] Output → {OUTPUT_PATH}")


if __name__ == "__main__":
    run()
