"""
check_i18n.py — Audits static/ for hardcoded i18n violations.

1. Finds Hebrew characters outside lang/he.json
2. Finds English UI strings in JS template literals that aren't CSS classes,
   HTML tags, or known constants
"""
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(__file__), "..", "static")
LANG_HE = os.path.join(ROOT, "lang", "he.json")

# Hebrew Unicode block U+0590..U+05FF plus U+FB1D..U+FB4F (additional Hebrew)
HEBREW_RE = re.compile(r"[֐-׿יִ-ﭏ]")

# Template-literal UI string heuristic: `...` or '...' or "..." with 3+ consecutive ASCII letters
# Excludes: CSS class names (no spaces), HTML tags, known constants, import paths, URLs
ENGLISH_UI_RE = re.compile(
    r"""(?:
        `[^`]*?([A-Za-z]{3,}\s+[A-Za-z]{3,}[^`]*?)`   # template literal with 2+ words
        |
        ['"]([A-Za-z]{3,}\s[A-Za-z]{3,}[^'"]{0,60})['"]  # quoted string 2+ words
    )""",
    re.VERBOSE,
)

# Patterns that are clearly NOT UI strings (allowed to have English)
ALLOWED_PATTERNS = [
    re.compile(p) for p in [
        r"^/",                          # paths
        r"^https?://",                  # URLs
        r"^\w+[-./]\w+",               # CSS classes or file paths
        r"^[A-Z_]+$",                  # constants
        r"^[a-z]+[A-Z]",              # camelCase identifiers
        r"^data-",                      # HTML attributes
        r"^aria-",                      # aria attributes
        r"^\d",                         # numbers
        r"^#",                          # hex colors or IDs
        r"^application/",              # MIME types
        r"^text/",
        r"^utf-",
        r"^Bearer ",
        r"^Content-",
        r"^X-",
        r"^SameSite",
        r"^HttpOnly",
        r"^max-age",
    ]
]

JS_EXTENSIONS = {".js"}
SKIP_DIRS = {"node_modules", ".git", "__pycache__"}
SKIP_FILES = {"he.json", "en.json", "service-worker.js"}


def is_allowed(s: str) -> bool:
    s = s.strip()
    if not s:
        return True
    for pat in ALLOWED_PATTERNS:
        if pat.search(s):
            return True
    return False


def check_hebrew_in_js():
    """Find Hebrew characters in JS files (outside lang/he.json)."""
    # These are intentional: the language switcher must show Hebrew names
    # in both modes so users can identify the target language.
    INTENTIONAL_PATTERNS = [
        re.compile(r"switch_to_he|language_he|profile\.switch|profile\.language"),
        re.compile(r"'HE'|'EN'"),  # language abbreviations
    ]
    findings = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fname in filenames:
            if fname in SKIP_FILES:
                continue
            ext = os.path.splitext(fname)[1].lower()
            if ext not in JS_EXTENSIONS:
                continue
            fpath = os.path.join(dirpath, fname)
            with open(fpath, encoding="utf-8", errors="replace") as f:
                for lineno, line in enumerate(f, 1):
                    if not HEBREW_RE.search(line):
                        continue
                    stripped = line.strip()
                    # Skip pure JS comments
                    if stripped.startswith("//") or stripped.startswith("*") or stripped.startswith("/*"):
                        continue
                    # Skip known intentional language-switcher patterns
                    if any(p.search(stripped) for p in INTENTIONAL_PATTERNS):
                        continue
                    findings.append((fpath, lineno, stripped))
    return findings


def check_english_ui_in_js():
    """Heuristic: find English UI strings in JS template literals."""
    findings = []
    # Simple approach: look for template literals containing 2+ English words
    # that look like user-visible text (has spaces, not all-caps, not a path)
    ui_string_re = re.compile(
        r'`[^`]*?([A-Z][a-z]{2,}\s+[A-Za-z]{2,}[^`]{0,80})`'
        r'|'
        r"'([A-Z][a-z]{2,}\s+[A-Za-z]{2,}[^']{0,60})'"
        r'|'
        r'"([A-Z][a-z]{2,}\s+[A-Za-z]{2,}[^"]{0,60})"'
    )
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fname in filenames:
            if fname in SKIP_FILES:
                continue
            ext = os.path.splitext(fname)[1].lower()
            if ext not in JS_EXTENSIONS:
                continue
            fpath = os.path.join(dirpath, fname)
            with open(fpath, encoding="utf-8", errors="replace") as f:
                content = f.read()
            for m in ui_string_re.finditer(content):
                candidate = (m.group(1) or m.group(2) or m.group(3) or "").strip()
                if not candidate or is_allowed(candidate):
                    continue
                # Find line number
                lineno = content[:m.start()].count("\n") + 1
                # Skip if line is a comment
                line_text = content.splitlines()[lineno - 1].strip() if lineno <= len(content.splitlines()) else ""
                if line_text.startswith("//") or line_text.startswith("*") or line_text.startswith("/*"):
                    continue
                findings.append((fpath, lineno, candidate))
    return findings


def main():
    print("=== Mondial 2026 i18n Audit ===\n")

    hebrew_hits = check_hebrew_in_js()
    if hebrew_hits:
        print(f"[FAIL] Hebrew characters found in {len(hebrew_hits)} JS line(s):")
        for fpath, lineno, line in hebrew_hits:
            rel = os.path.relpath(fpath, ROOT)
            print(f"  {rel}:{lineno}  {line[:100]}")
    else:
        print("[PASS] No hardcoded Hebrew characters in JS files.")

    print()
    english_hits = check_english_ui_in_js()
    if english_hits:
        print(f"[WARN] Potential English UI strings in {len(english_hits)} location(s):")
        seen = set()
        for fpath, lineno, candidate in english_hits:
            if candidate in seen:
                continue
            seen.add(candidate)
            rel = os.path.relpath(fpath, ROOT)
            print(f"  {rel}:{lineno}  \"{candidate}\"")
    else:
        print("[PASS] No obvious hardcoded English UI strings found.")

    print()
    if hebrew_hits:
        print("ACTION REQUIRED: Fix Hebrew leakage in JS files.")
        sys.exit(1)
    else:
        print("i18n check passed.")


if __name__ == "__main__":
    main()
