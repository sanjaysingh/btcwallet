#!/usr/bin/env python3
"""Stamp a version query string onto local CSS/JS URLs in index.html.

GitHub Pages caches non-HTML assets for up to four hours. Without a new URL,
browsers keep serving the previous app.js after a deploy (for example, the
Signet RPC preset never appearing until a hard refresh). The Pages workflow
runs this before upload so each deploy fetches fresh local assets.
"""
import argparse
from pathlib import Path

# Match the committed index.html tags exactly. CDN URLs are left alone.
LOCAL_ASSETS = (
    'href="styles.css"',
    'src="passkey.js"',
    'src="app.js"',
)


def stamp(index_path: Path, version: str) -> None:
    text = index_path.read_text()
    for marker in LOCAL_ASSETS:
        if marker not in text:
            raise SystemExit(f"Expected {marker} in {index_path}")
        attr, _, url = marker.partition("=")
        stamped = f'{attr}={url[:-1]}?v={version}"'
        text = text.replace(marker, stamped, 1)
    index_path.write_text(text)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--index", default="index.html", type=Path)
    parser.add_argument("--version", required=True)
    args = parser.parse_args()
    if not args.version.strip():
        raise SystemExit("version must be non-empty")
    stamp(args.index, args.version.strip())
    print(f"Stamped asset version {args.version.strip()} into {args.index}")


if __name__ == "__main__":
    main()
