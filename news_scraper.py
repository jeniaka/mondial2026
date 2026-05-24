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

# Title substrings that mark a non-article (legal, footer, nav). Matches
# whole-word-ish — case-insensitive substring on the title.
_TITLE_BLACKLIST = (
    # Hebrew
    "מדיניות פרטיות", "תנאי שימוש", "תנאי שירות", "צור קשר", "אודות",
    "הצהרת נגישות", "עוגיות", "מפת האתר", "הרשמה לעיתון", "ניוזלטר",
    "הצטרפות לאתר", "RSS", "פרסם אצלנו", "תקנון", "מועדון חברים",
    # English
    "privacy policy", "terms of use", "terms of service", "contact us",
    "about us", "cookie", "sitemap", "newsletter", "accessibility",
)


def _is_blacklisted_title(title: str) -> bool:
    low = title.lower()
    return any(b.lower() in low for b in _TITLE_BLACKLIST)


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
        full_url = urljoin(base, href).split("#", 1)[0]
        # Real articles always have both FolderID and docID
        if "folderid=" not in full_url.lower() or "docid=" not in full_url.lower():
            continue

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

    # Text-only UI: image not required, just a real title; reject footer/legal
    articles = [
        e for e in grouped.values()
        if len(e["title"]) >= 8 and not _is_blacklisted_title(e["title"])
    ][:30]
    for e in articles:
        e["image"] = ""
    return articles


def scrape_ynet_sport() -> list:
    """Ynet Sport home page. Real article URLs look like
    https://www.ynet.co.il/sport/<section>/article/<id>. Legal/footer
    links (privacy, terms, etc.) live at /article/<id> without /sport/
    — those are filtered out here."""
    base = "https://www.ynet.co.il/sport"
    soup = BeautifulSoup(_fetch_html(base), "html.parser")
    seen: set = set()
    articles: list = []

    for a in soup.find_all("a", href=True):
        href = (a.get("href") or "").strip()
        full_url = urljoin(base, href).split("#", 1)[0]  # drop #fragment
        low = full_url.lower()
        if "ynet.co.il" not in low:
            continue
        # Tight: must be /sport/.../article/<id> — this rejects legal pages
        if "/sport/" not in low or "/article/" not in low:
            continue
        # Path after /sport/ must include another segment before /article/
        if low.endswith("/article/") or "/sport/article/" in low and low.count("/") < 6:
            # /sport/article/<id> is OK (general sport section), allow
            pass
        if full_url in seen:
            continue

        alt  = a.get("aria-label") or a.get("title") or ""
        text = a.get_text(" ", strip=True) or ""
        title = " ".join((alt if len(alt) > len(text) else text).split())
        if len(title) < 8 or _is_blacklisted_title(title):
            continue

        seen.add(full_url)
        articles.append({
            "title":   title,
            "url":     full_url,
            "image":   "",
            "snippet": "",
            "source":  "Ynet",
        })
        if len(articles) >= 30:
            break
    return articles


SCRAPERS = {
    "sport5": scrape_sport5,
    "ynet":   scrape_ynet_sport,
}

SOURCE_LABELS = {
    "sport5": "Sport5",
    "ynet":   "Ynet",
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
