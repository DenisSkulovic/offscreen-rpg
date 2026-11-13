"""Check local Markdown links and heading anchors. No third-party dependencies.

Coverage (W22):
- Root/docs/agent Markdown plus nested README.md under apps/, packages/, tools/
- Local file/directory targets and GitHub-compatible heading fragments
- Malformed link labels with an unmatched backtick before ']'
- One level of nested parentheses in local paths (Next.js route groups)
"""

from __future__ import annotations

from collections import defaultdict
from pathlib import Path
import re
import sys
import tempfile
import time
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]

SKIP_DIR_NAMES = {
    "node_modules",
    "dist",
    ".next",
    ".turbo",
    "coverage",
    "storybook-static",
    ".git",
    "__pycache__",
}

# Allow one nesting level so paths like app/(authenticated)/play work.
LINK_RE = re.compile(r"\[([^\]]*)\]\(((?:[^()]|\([^()]*\))+)\)")
HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$", re.MULTILINE)
INLINE_CODE_RE = re.compile(r"`([^`]+)`")
INLINE_LINK_RE = re.compile(r"\[([^\]]+)\]\([^)]+\)")
EMPHASIS_RE = re.compile(r"[*_~]+")


def iter_markdown_files(root: Path) -> list[Path]:
    files: list[Path] = list(root.glob("*.md"))
    for folder in ("docs", ".agents", ".claude", ".cursor", ".github"):
        base = root / folder
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if not path.is_file():
                continue
            if any(part in SKIP_DIR_NAMES for part in path.parts):
                continue
            if path.suffix in {".md", ".mdc"}:
                files.append(path)
    for folder in ("packages", "apps", "tools"):
        base = root / folder
        if not base.exists():
            continue
        for path in base.rglob("README.md"):
            if any(part in SKIP_DIR_NAMES for part in path.parts):
                continue
            files.append(path)
    return sorted({path.resolve() for path in files})


def strip_heading_markup(text: str) -> str:
    text = INLINE_CODE_RE.sub(r"\1", text)
    text = INLINE_LINK_RE.sub(r"\1", text)
    text = EMPHASIS_RE.sub("", text)
    return text.strip()


def github_heading_slug(text: str) -> str:
    """GitHub-compatible ATX heading slug subset (H1–H6).

    Letters/digits/spaces/hyphens are kept after lowercasing and stripping
    common Markdown emphasis/code/link markup. Other punctuation is removed
    (so `Foo — Bar` yields `foo--bar`). Consecutive hyphens are preserved to
    match GitHub. Unsupported exotic heading forms are not invented.
    """
    cleaned = strip_heading_markup(text).lower()
    kept: list[str] = []
    for ch in cleaned:
        if ch.isalnum() or ch in {" ", "-"}:
            kept.append(ch)
    # Replace each space with '-' (do not collapse); GitHub keeps `--` when
    # punctuation between spaces is removed (e.g. em dash headings).
    slug = "".join(kept).replace(" ", "-").strip("-")
    return slug


def heading_anchors(markdown: str) -> set[str]:
    counts: dict[str, int] = defaultdict(int)
    anchors: set[str] = set()
    for match in HEADING_RE.finditer(markdown):
        base = github_heading_slug(match.group(2))
        if not base:
            continue
        seen = counts[base]
        counts[base] = seen + 1
        anchors.add(base if seen == 0 else f"{base}-{seen}")
    return anchors


def decode_local_href(href: str) -> tuple[str, str | None]:
    path_part, _, fragment = unquote(href).partition("#")
    return path_part, (fragment or None)


def is_external(href: str) -> bool:
    return bool(re.match(r"[a-zA-Z][a-zA-Z0-9+.-]*:", href))


def under_root(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


def check_file(path: Path, root: Path) -> list[str]:
    errors: list[str] = []
    text = path.read_text(encoding="utf-8")
    relative = path.relative_to(root)
    anchors_cache: dict[Path, set[str]] = {}

    for match in LINK_RE.finditer(text):
        label, href = match.group(1), match.group(2).strip()
        line = text.count("\n", 0, match.start()) + 1
        if label.count("`") % 2 == 1:
            errors.append(
                f"{relative}:{line}: malformed link label with unmatched backtick before ']'"
            )
            continue
        if is_external(href) or href.startswith("//"):
            continue
        if href.startswith("#"):
            target_path = path
            fragment = unquote(href[1:])
            path_part = ""
        else:
            path_part, fragment = decode_local_href(href)
            target_path = (path.parent / path_part).resolve() if path_part else path
        if path_part:
            if not under_root(target_path, root) or not target_path.exists():
                errors.append(f"{relative}:{line}: broken local link {href}")
                continue
        if fragment is None:
            continue
        if target_path.is_dir():
            errors.append(
                f"{relative}:{line}: heading fragment on directory link {href}"
            )
            continue
        if target_path.suffix.lower() not in {".md", ".mdc"}:
            continue
        if target_path not in anchors_cache:
            anchors_cache[target_path] = heading_anchors(
                target_path.read_text(encoding="utf-8")
            )
        if fragment not in anchors_cache[target_path]:
            errors.append(f"{relative}:{line}: missing heading fragment {href}")
    return errors


def check(root: Path = ROOT) -> int:
    started = time.perf_counter()
    files = iter_markdown_files(root)
    errors: list[str] = []
    for path in files:
        errors.extend(check_file(path, root))
    elapsed_ms = (time.perf_counter() - started) * 1000
    for error in errors:
        print(error)
    print(
        f"Checked {len(files)} Markdown files; {len(errors)} problems; "
        f"{elapsed_ms:.0f} ms."
    )
    return 1 if errors else 0


def _write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def self_test() -> int:
    failures: list[str] = []

    def expect_problem(label: str, root: Path, needle: str) -> None:
        errors: list[str] = []
        for path in iter_markdown_files(root):
            errors.extend(check_file(path, root))
        joined = "\n".join(errors)
        if needle not in joined:
            failures.append(
                f"{label}: expected problem containing {needle!r}, got:\n{joined}"
            )

    def expect_clean(label: str, root: Path) -> None:
        errors: list[str] = []
        for path in iter_markdown_files(root):
            errors.extend(check_file(path, root))
        if errors:
            failures.append(
                f"{label}: expected clean tree, got:\n" + "\n".join(errors)
            )

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)

        good = root / "good"
        _write(
            good / "apps" / "web" / "src" / "features" / "play" / "view.tsx",
            "export {}\n",
        )
        _write(
            good / "docs" / "target.md",
            "# Target\n\n## Owner map\n\nBody.\n\n## Owner map\n\nDuplicate.\n"
            "\n## Memory reinspection — 2026-10-23\n",
        )
        _write(
            good / "apps" / "web" / "src" / "features" / "play" / "README.md",
            "# Play\n\nSee [view](view.tsx) and "
            "[owner](../../../../../docs/target.md#owner-map).\n"
            "Duplicate [second](../../../../../docs/target.md#owner-map-1).\n"
            "Em dash [mem](../../../../../docs/target.md#memory-reinspection--2026-10-23).\n"
            "Route group [page](../../../app/(authenticated)/play/page.tsx).\n",
        )
        _write(
            good / "apps" / "web" / "app" / "(authenticated)" / "play" / "page.tsx",
            "export {}\n",
        )
        expect_clean("valid nested README + heading + route group", good)

        bad_path = root / "bad_path"
        _write(
            bad_path / "apps" / "web" / "src" / "features" / "play" / "view.tsx",
            "export {}\n",
        )
        _write(
            bad_path / "apps" / "web" / "src" / "features" / "play" / "README.md",
            "# Play\n\nBroken [view](../../../../../view.tsx).\n",
        )
        expect_problem(
            "over-traversing nested path",
            bad_path,
            "broken local link ../../../../../view.tsx",
        )

        bad_heading = root / "bad_heading"
        _write(bad_heading / "docs" / "target.md", "# Target\n\n## Real heading\n")
        _write(
            bad_heading / "apps" / "web" / "README.md",
            "# Web\n\nMissing [anchor](../../docs/target.md#no-such-heading).\n",
        )
        expect_problem(
            "missing heading fragment",
            bad_heading,
            "missing heading fragment",
        )

        bad_tick = root / "bad_tick"
        _write(bad_tick / "docs" / "target.md", "# Target\n")
        _write(
            bad_tick / "apps" / "web" / "README.md",
            "# Web\n\n[label with ` unmatched](../../docs/target.md).\n",
        )
        expect_problem(
            "unmatched backtick in label",
            bad_tick,
            "unmatched backtick",
        )

        encoded = root / "encoded"
        _write(encoded / "docs" / "a b.md", "# Title\n")
        _write(
            encoded / "apps" / "web" / "README.md",
            "# Web\n\n[space](../../docs/a%20b.md).\n",
        )
        expect_clean("encoded local path", encoded)

    if failures:
        print("SELF-TEST FAILURES:")
        for item in failures:
            print(item)
        return 1
    print(
        "Self-test passed: nested path, heading, duplicate heading, em-dash "
        "anchor, route-group path, backtick, encoded path."
    )
    return 0


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] in {"--self-test", "self-test"}:
        sys.exit(self_test())
    sys.exit(check())
