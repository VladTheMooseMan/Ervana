"""Extract KrAdvGuide.pdf into a plain-text corpus for the autocomplete engine."""
import pypdf
import re
import sys
from pathlib import Path

SRC = Path("src/imports/KrAdvGuide.pdf")
DST = Path("src/data/rulebook.txt")

def main() -> None:
    if not SRC.exists():
        print(f"missing {SRC}", file=sys.stderr)
        sys.exit(1)
    DST.parent.mkdir(parents=True, exist_ok=True)
    reader = pypdf.PdfReader(str(SRC))
    parts: list[str] = []
    for i, page in enumerate(reader.pages):
        try:
            text = page.extract_text() or ""
        except Exception as e:
            print(f"page {i} extract failed: {e}", file=sys.stderr)
            continue
        parts.append(text)
    raw = "\n".join(parts)
    # Normalize whitespace: collapse runs of spaces, keep line breaks.
    raw = re.sub(r"[ \t]+", " ", raw)
    raw = re.sub(r"\n{3,}", "\n\n", raw)
    DST.write_text(raw, encoding="utf-8")
    print(f"wrote {DST} ({len(raw)} chars, {len(reader.pages)} pages)")

if __name__ == "__main__":
    main()
