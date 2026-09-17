"""Check local Markdown links. No dependencies."""
from pathlib import Path
import re
import sys
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]


def check():
    files = list(ROOT.glob("*.md"))
    for folder in ("docs", ".agents", ".claude", ".cursor", ".github"):
        files.extend((ROOT / folder).rglob("*.md"))
        files.extend((ROOT / folder).rglob("*.mdc"))
    errors = []
    for path in files:
        for href in re.findall(r"\[[^\]]*\]\(([^)]+)\)", path.read_text(encoding="utf-8")):
            if re.match(r"[a-zA-Z][a-zA-Z0-9+.-]*:", href):
                continue
            target = (path.parent / unquote(href).partition("#")[0]).resolve()
            if not target.is_relative_to(ROOT) or not target.exists():
                errors.append(f"{path.relative_to(ROOT)}: broken local link {href}")
    for error in errors:
        print(error)
    print(f"Checked {len(files)} Markdown files; {len(errors)} broken links.")
    return bool(errors)


if __name__ == "__main__":
    sys.exit(check())
