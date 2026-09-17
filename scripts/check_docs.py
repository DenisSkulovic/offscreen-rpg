"""Dependency-free checks for local Markdown links and document identity."""
from pathlib import Path
import re
import sys
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]


def anchors(text):
    result, seen = set(), {}
    for title in re.findall(r"^#{1,6}\s+(.+)$", text, re.M):
        slug = re.sub(r"[^\w\- ]", "", title.lower()).replace(" ", "-")
        count = seen.get(slug, 0)
        seen[slug] = count + 1
        result.add(slug + (f"-{count}" if count else ""))
    return result


def check():
    files = sorted(p for p in ROOT.rglob("*.md") if ".git" not in p.parts)
    texts = {p: p.read_text(encoding="utf-8-sig") for p in files}
    errors, ids = [], {}
    for path, text in texts.items():
        if "templates" in path.relative_to(ROOT).parts:
            continue
        front = text.split("---", 2)[1] if text.startswith("---") else ""
        match = re.search(r"^id: (DOC-[A-Z0-9-]+)$", front, re.M)
        if match:
            identity = match[1]
            if identity in ids:
                errors.append(f"{path.relative_to(ROOT)}: duplicate {identity}")
            ids[identity] = path
        elif path.is_relative_to(ROOT / "docs" / "product"):
            errors.append(f"{path.relative_to(ROOT)}: missing document ID")

    for path, text in texts.items():
        label = path.relative_to(ROOT)
        front = text.split("---", 2)[1] if text.startswith("---") else ""
        for identity in re.findall(r"^\s+target: (DOC-[A-Z0-9-]+)$", front, re.M):
            if identity not in ids:
                errors.append(f"{label}: unknown relation {identity}")
        # Templates contain placeholders, not live document links.
        if "templates" in path.relative_to(ROOT).parts:
            continue
        for href in re.findall(r"\[[^\]]*\]\(([^)]+)\)", text):
            if re.match(r"[a-zA-Z][a-zA-Z0-9+.-]*:", href):
                continue
            destination, _, fragment = unquote(href).partition("#")
            target = (path.parent / destination).resolve() if destination else path
            if not target.is_relative_to(ROOT):
                errors.append(f"{label}: link escapes repository: {href}")
            elif not target.exists():
                errors.append(f"{label}: missing link: {href}")
            elif fragment and target.suffix == ".md":
                if fragment not in anchors(target.read_text(encoding="utf-8-sig")):
                    errors.append(f"{label}: missing anchor: {href}")

    index = texts.get(ROOT / "docs" / "DOCUMENTATION_TREE.md", "")
    for path in (ROOT / "docs" / "product").rglob("*.md"):
        if path.relative_to(ROOT / "docs").as_posix() not in index:
            errors.append(f"{path.relative_to(ROOT)}: absent from document index")
    for error in errors:
        print(f"ERROR: {error}")
    print(f"Checked {len(files)} Markdown files and {len(ids)} document IDs; {len(errors)} errors.")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(check())
