"""
i18n.py — Server-side translation lookup (rare; client handles most i18n).
Used for server-generated notifications and emails.
"""
import json
import logging
import os

log = logging.getLogger(__name__)

_strings: dict = {}


def _load(lang: str) -> dict:
    path = os.path.join(os.path.dirname(__file__), "static", "lang", f"{lang}.json")
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        log.error("i18n: failed to load %s: %s", path, exc)
        return {}


def get_strings(lang: str) -> dict:
    """Returns the full string dict for the given language (cached)."""
    if lang not in _strings:
        _strings[lang] = _load(lang)
    return _strings[lang]


def t(key: str, lang: str = "he", **params) -> str:
    """
    Look up a dot-separated key in the language strings.
    e.g. t("notifications.match_started", lang="he")
    Returns the raw key if not found.
    """
    strings = get_strings(lang)
    parts = key.split(".")
    v = strings
    for p in parts:
        if not isinstance(v, dict):
            return key
        v = v.get(p, key)
    if not isinstance(v, str):
        return key
    for k, val in params.items():
        v = v.replace(f"{{{k}}}", str(val))
    return v
