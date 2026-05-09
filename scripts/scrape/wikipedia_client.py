"""
Fetches destination description + hero image from the Wikipedia REST API.
Uses the /page/summary/ endpoint — no API key required, rate-limit friendly.
"""

import time
import requests

WIKI_API = "https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
HEADERS = {
    "User-Agent": "VenturePathBot/1.0 (travel planner scraper; contact: traveller@example.com)"
}


def fetch_wikipedia(wikipedia_title: str, delay: float = 0.5) -> dict:
    """
    Returns {"description": str, "image_url": str | None}.
    Falls back to empty strings on any error so the scraper keeps running.
    """
    url = WIKI_API.format(title=wikipedia_title.replace(" ", "_"))
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        if resp.status_code == 404:
            print(f"[wiki] 404 for '{wikipedia_title}' — skipping")
            return {"description": "", "image_url": None}
        resp.raise_for_status()
        data = resp.json()
        description = data.get("extract", "").split(". ")[0:3]  # first ~3 sentences
        description = ". ".join(description).strip()
        if description and not description.endswith("."):
            description += "."
        image_url = None
        if "originalimage" in data:
            image_url = data["originalimage"].get("source")
        elif "thumbnail" in data:
            image_url = data["thumbnail"].get("source")
        time.sleep(delay)
        return {"description": description, "image_url": image_url}
    except requests.RequestException as e:
        print(f"[wiki] Error fetching '{wikipedia_title}': {e}")
        return {"description": "", "image_url": None}
