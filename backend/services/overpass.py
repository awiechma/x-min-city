import asyncio
import httpx
import pandas as pd
import math
import json

from core.config import OVERPASS_URL, CATS


def _selector_for(osm_key: str, values: list[str], bbox: list[float]) -> str:
    """
    Builds an Overpass selector block (node/way/relation) for a single OSM tag key.

    - If a single value is provided: uses equality match.
    - If multiple values are provided: uses a regex match to reduce query size.

    bbox is expected as [south, west, north, east] in WGS84.
    """
    s, w, n, e = bbox

    if len(values) == 1:
        v = values[0]
        return (
            f'node["{osm_key}"="{v}"]({s},{w},{n},{e});\n'
            f'way["{osm_key}"="{v}"]({s},{w},{n},{e});\n'
            f'relation["{osm_key}"="{v}"]({s},{w},{n},{e});'
        )

    pattern = "|".join(sorted(values))
    return (
        f'node["{osm_key}"~"^({pattern})$"]({s},{w},{n},{e});\n'
        f'way["{osm_key}"~"^({pattern})$"]({s},{w},{n},{e});\n'
        f'relation["{osm_key}"~"^({pattern})$"]({s},{w},{n},{e});'
    )


def build_overpass_query(bbox: list[float], categories: list[str]) -> str:
    """
    Builds a complete Overpass QL query for the given bbox and categories.

    Categories are looked up in CATS and expanded into one or more tag selectors
    (union across all category rules).
    """
    parts: list[str] = []
    for cat in categories:
        rules = CATS.get(cat)
        if not rules:
            continue
        for osm_key, values in rules.items():
            parts.append(_selector_for(osm_key, values, bbox))

    union = "\n  ".join(parts)

    return f"""[out:json][timeout:60];
(
  {union}
);
out center;"""


def match_category(tags: dict) -> str | None:
    """
    Maps an OSM element's tags to a configured umbrella category (CATS).

    Returns the first matching category key or None if no rule matches.
    """
    for cat, rules in CATS.items():
        for osm_key, values in rules.items():
            if tags.get(osm_key) in values:
                return cat
    return None


async def fetch_pois_for_category(cat: str, bbox: list[float]) -> pd.DataFrame:
    """
    Fetches POIs for a single category from Overpass and returns a normalized DataFrame.

    - Queries nodes, ways, and relations within the bbox.
    - Uses `out center;` to derive coordinates for non-node geometries.
    - Applies defensive validation (finite lat/lon) to handle malformed elements.
    - Retries on network / API failures with backoff to reduce overload and avoid throttling.

    Output columns:
    - id, lat, lon, category, name
    """
    short_retries = 3
    short_wait = 10
    long_wait = 30
    attempt = 1

    async with httpx.AsyncClient(timeout=120, headers={"User-Agent": "xmin/0.1"}) as client:
        while True:
            q = build_overpass_query(bbox, [cat])
            print(f"Overpass-Request '{cat}' (Versuch {attempt})")

            try:
                r = await client.post(OVERPASS_URL, data={"data": q})
                if r.status_code != 200:
                    raise RuntimeError(f"Status {r.status_code}")
                data = r.json()

            except Exception as e:
                wait = short_wait if attempt <= short_retries else long_wait
                print(f"Fehler bei '{cat}': {e} → warte {wait}s")
                await asyncio.sleep(wait)
                attempt += 1
                continue

            rows = []
            bad_count = 0

            for el in data.get("elements", []):
                tags = el.get("tags") or {}
                umbrella = match_category(tags)
                if umbrella != cat:
                    continue

                # Resolve coordinates:
                # - nodes provide lat/lon directly
                # - ways/relations use the center returned by `out center;`
                lat = el.get("lat")
                lon = el.get("lon")
                if lat is None or lon is None:
                    center = el.get("center") or {}
                    if lat is None:
                        lat = center.get("lat")
                    if lon is None:
                        lon = center.get("lon")

                # Validate coordinates (must be finite floats)
                try:
                    lat_f = float(lat)
                    lon_f = float(lon)
                    if not (math.isfinite(lat_f) and math.isfinite(lon_f)):
                        raise ValueError("Non-finite coordinates")
                except Exception:
                    bad_count += 1
                    print("\n[OVERPASS INVALID ELEMENT]")
                    print(f"category={cat}")
                    print(f"type={el.get('type')} id={el.get('id')}")
                    print(f"raw_lat={lat!r} raw_lon={lon!r}")
                    print(f"center={el.get('center')!r}")
                    print("tags=" + json.dumps(tags, ensure_ascii=False)[:800])
                    print("[/OVERPASS INVALID ELEMENT]\n")
                    continue

                rows.append(
                    {
                        "id": el.get("id"),
                        "lat": lat_f,
                        "lon": lon_f,
                        "category": umbrella,
                        "name": tags.get("name"),
                    }
                )

            df = pd.DataFrame(rows)
            return df
