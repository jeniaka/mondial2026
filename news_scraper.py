"""
news_scraper.py — Israeli sports news scrapers.
- requests + bs4 (lightweight, Render-free-tier-friendly)
- Module-level cache with 10-minute TTL per source
- Falls back to last cached result on scrape failure
- ONE is JS-rendered (no scrapable HTML) → replaced with Ynet Sport.
  We still expose source="one" as an alias to Ynet for backwards-compat
  with the spec, but the source label users see is "Ynet".
"""

import logging
import time
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

log = logging.getLogger(__name__)

_CACHE: dict = {}
CACHE_TTL_SECONDS = 600  # 10 minutes

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
REQUEST_TIMEOUT = 12

_BLOCKED_IMG_HINTS = ("blank.gif", "1x1.gif", "spacer.gif", "data:image",
                       "/logo", "/icon", "placeholder")


def _fetch_html(url: str) -> str:
    headers = {
        "User-Agent": USER_AGENT,
        "Accept-Language": "he-IL,he;q=0.9,en;q=0.8",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    resp = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    resp.encoding = resp.apparent_encoding or "utf-8"
    return resp.text


def _good_image(src: str) -> bool:
    if not src:
        return False
    low = src.lower()
    return not any(b in low for b in _BLOCKED_IMG_HINTS)


def _img_src(img) -> str:
    if not img:
        return ""
    src = (img.get("src") or img.get("data-src") or
           img.get("data-original") or img.get("data-lazy-src") or "")
    if src.startswith("//"):
        src = "https:" + src
    return src.strip()


def scrape_sport5() -> list:
    """Sport5 home page. Article anchors look like /articles.aspx?FolderID=X&docID=Y.
    Same article appears multiple times (image card + headline card) — dedupe by URL
    and merge the best image + longest text from all instances."""
    base = "https://www.sport5.co.il/"
    soup = BeautifulSoup(_fetch_html(base), "html.parser")
    grouped: dict = {}

    for a in soup.select('a[href*="articles.aspx"]'):
        href = (a.get("href") or "").strip()
        if not href:
            continue
        full_url = urljoin(base, href)

        # image: prefer inside anchor; fallback walk up parents
        img = a.find("img")
        if not img:
            p = a.parent
            for _ in range(4):
                if not p: break
                img = p.find("img")
                if img: break
                p = p.parent
        img_url = _img_src(img) if img else ""
        if not _good_image(img_url):
            img_url = ""

        text = " ".join((a.get_text(" ", strip=True) or "").split())
        alt = (img.get("alt") if img else "") or a.get("aria-label") or a.get("title") or ""
        alt = " ".join(alt.split())

        entry = grouped.setdefault(full_url, {"title": "", "image": "", "url": full_url, "snippet": "", "source": "Sport5"})
        # Pick the longest title between all anchor variants for this URL
        candidate = text if len(text) > len(alt) else alt
        if len(candidate) > len(entry["title"]):
            entry["title"] = candidate
        if img_url and not entry["image"]:
            entry["image"] = img_url

    # Text-only UI: image not required, just a real title
    articles = [e for e in grouped.values() if len(e["title"]) >= 8][:30]
    # Drop image field to shrink the payload for the text-only list
    for e in articles:
        e["image"] = ""
    return articles


def scrape_maariv_sport() -> list:
    """Maariv Sport (sport1.maariv.co.il). Article URLs match /<section>/article/<id>/."""
    base = "https://www.maariv.co.il/sport"
    soup = BeautifulSoup(_fetch_html(base), "html.parser")
    seen: set = set()
    articles: list = []

    for a in soup.find_all("a", href=True):
        href = (a.get("href") or "").strip()
        full_url = urljoin(base, href)
        low = full_url.lower()
        # Maariv sport articles live on the sport1 subdomain
        if "maariv.co.il" not in low:
            continue
        if "/article/" not in low:
            continue
        if full_url in seen:
            continue

        text = " ".join((a.get_text(" ", strip=True) or "").split())
        alt = a.get("aria-label") or a.get("title") or ""
        alt = " ".join(alt.split())
        title = text if len(text) > len(alt) else alt
        if len(title) < 8:
            continue

        seen.add(full_url)
        articles.append({
            "title":   title,
            "url":     full_url,
            "image":   "",          # text-only UI: skip image entirely
            "snippet": "",
            "source":  "Maariv",
        })
        if len(articles) >= 30:
            break
    return articles


SCRAPERS = {
    "sport5": scrape_sport5,
    "maariv": scrape_maariv_sport,
    # Backwards-compat alias: the original spec asked for "one" but ONE is
    # fully JS-rendered (no scrapable HTML). We use Maariv Sport for that
    # slot, with an honest "Maariv" label in the frontend.
    "one":    scrape_maariv_sport,
}

SOURCE_LABELS = {
    "sport5": "Sport5",
    "maariv": "Maariv",
    "one":    "Maariv",
}


def get_news(source_key: str) -> dict:
    """Returns {ok, articles, cached, fetched_at, stale?, error?}."""
    source_key = (source_key or "").lower().strip()
    if source_key not in SCRAPERS:
        return {"ok": False, "error": "unknown_source", "articles": []}

    now = time.time()
    cached = _CACHE.get(source_key)
    if cached and (now - cached["fetched_at"] < CACHE_TTL_SECONDS):
        return {"ok": True, "source": source_key, "articles": cached["articles"],
                "cached": True, "fetched_at": cached["fetched_at"]}

    try:
        articles = SCRAPERS[source_key]()
        if not articles:
            log.warning("news_scraper[%s]: returned 0 articles", source_key)
            if cached:
                return {"ok": True, "source": source_key, "articles": cached["articles"],
                        "cached": True, "fetched_at": cached["fetched_at"], "stale": True}
            return {"ok": False, "error": "no_articles", "source": source_key, "articles": []}

        _CACHE[source_key] = {"fetched_at": now, "articles": articles}
        log.info("news_scraper[%s]: fetched %d articles", source_key, len(articles))
        return {"ok": True, "source": source_key, "articles": articles,
                "cached": False, "fetched_at": now}
    except Exception as e:
        log.exception("news_scraper[%s] failed: %s", source_key, e)
        if cached:
            return {"ok": True, "source": source_key, "articles": cached["articles"],
                    "cached": True, "fetched_at": cached["fetched_at"], "stale": True}
        return {"ok": False, "error": str(e)[:200], "source": source_key, "articles": []}
