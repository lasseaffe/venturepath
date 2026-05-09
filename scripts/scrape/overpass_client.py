"""
Fetches POIs for a destination bounding box using the Overpass API (OpenStreetMap).
Returns up to 2 POIs per category: landmark, food, activity, hidden_gem, transport_hub.
"""

import time
import requests

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
HEADERS = {
    "User-Agent": "VenturePathBot/1.0 (travel planner; educational use)"
}

# Overpass QL query templates per category.
# {bbox} = "south,west,north,east"
CATEGORY_QUERIES = {
    "landmark": """
[out:json][timeout:25];
(
  node["tourism"="attraction"]["name"]({bbox});
  node["historic"~"castle|monument|ruins|memorial"]["name"]({bbox});
  way["tourism"="attraction"]["name"]({bbox});
)->._; out body 5;
""",
    "food": """
[out:json][timeout:25];
(
  node["amenity"="restaurant"]["name"]["cuisine"]({bbox});
  node["amenity"="cafe"]["name"]({bbox});
)->._; out body 8;
""",
    "activity": """
[out:json][timeout:25];
(
  node["leisure"~"park|nature_reserve|garden"]["name"]({bbox});
  node["tourism"~"viewpoint|museum"]["name"]({bbox});
  way["tourism"="viewpoint"]["name"]({bbox});
)->._; out body 6;
""",
    "hidden_gem": """
[out:json][timeout:25];
(
  node["historic"~"ruins|archaeological_site|building"]["name"]({bbox});
  node["tourism"="artwork"]["name"]({bbox});
  node["amenity"~"bar|pub"]["name"]["craft"]({bbox});
)->._; out body 6;
""",
    "transport_hub": """
[out:json][timeout:25];
(
  node["public_transport"="station"]["name"]({bbox});
  node["railway"~"station|halt"]["name"]({bbox});
  node["amenity"="bus_station"]["name"]({bbox});
)->._; out body 4;
""",
}

CATEGORY_ICONS = {
    "landmark":      "🏛",
    "food":          "🍽",
    "activity":      "🏔",
    "hidden_gem":    "💎",
    "transport_hub": "🚉",
}

DEFAULT_DURATION = {
    "landmark":      90,
    "food":          75,
    "activity":      120,
    "hidden_gem":    60,
    "transport_hub": 20,
}

MAX_PER_CATEGORY = 2


def _bbox_str(bbox: list) -> str:
    """Convert [south, west, north, east] to 'south,west,north,east'."""
    return ",".join(str(x) for x in bbox)


def _query_overpass(ql: str, delay: float = 1.0) -> list:
    """Run an Overpass QL query, return list of OSM elements."""
    try:
        resp = requests.post(OVERPASS_URL, data={"data": ql}, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        elements = resp.json().get("elements", [])
        time.sleep(delay)
        return elements
    except requests.RequestException as e:
        print(f"[overpass] Query error: {e}")
        return []


def _element_to_poi(element: dict, category: str, city_name: str) -> dict | None:
    """Convert an OSM element to a POI dict. Returns None if unusable."""
    tags = element.get("tags", {})
    name = tags.get("name")
    if not name or len(name) < 3:
        return None

    description_parts = []
    if tags.get("cuisine"):
        description_parts.append(f"Cuisine: {tags['cuisine']}")
    if tags.get("description"):
        description_parts.append(tags["description"])
    if tags.get("wikipedia"):
        description_parts.append(f"[OSM data — {city_name}]")
    if not description_parts:
        description_parts.append(f"A notable {category.replace('_', ' ')} in {city_name}.")

    return {
        "id": f"{category}-{name.lower().replace(' ', '-')[:30]}",
        "name": name,
        "category": category,
        "icon": CATEGORY_ICONS[category],
        "description": " ".join(description_parts[:2]),
        "duration_min": DEFAULT_DURATION[category],
        "time_suggestion": None,
        "notes": tags.get("opening_hours") or tags.get("website") or None,
    }


def fetch_pois(destination: dict) -> list:
    """
    Fetch POIs for a destination across all 5 categories.
    Returns a flat list of POI dicts (max 2 per category = 10 total).
    """
    bbox = _bbox_str(destination["overpass_bbox"])
    city_name = destination["name"]
    pois = []

    for category, query_template in CATEGORY_QUERIES.items():
        ql = query_template.replace("{bbox}", bbox)
        elements = _query_overpass(ql)

        seen_names = set()
        count = 0
        for el in elements:
            if count >= MAX_PER_CATEGORY:
                break
            poi = _element_to_poi(el, category, city_name)
            if poi and poi["name"] not in seen_names:
                seen_names.add(poi["name"])
                pois.append(poi)
                count += 1

        if count == 0:
            print(f"[overpass] No {category} POIs found for {city_name} — skipping category")

    return pois
