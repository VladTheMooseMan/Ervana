"""Pre-train an autocomplete model from the extracted rulebook and dump a
compact JSON snapshot the app can bundle. Keeps only the highest-value
unigrams, bigrams, and phrases so we don't ship 300k+ chars of text."""
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

SRC = Path("src/data/rulebook.txt")
DST = Path("src/data/rulebookModel.json")

WORD_RE = re.compile(r"[A-Za-z][A-Za-z'\u2019-]*")
SENT_SPLIT = re.compile(r"[.!?\n]+")

# Rulebook words tend to have some junk from PDF extraction. Drop
# extremely short and extremely long tokens. Also drop tokens that are
# ALLCAPS with digits (page refs) and any word appearing only once —
# common noise.
def clean_words(words: list[str]) -> list[str]:
    return [w for w in words if 2 <= len(w) <= 22]


def main() -> None:
    text = SRC.read_text(encoding="utf-8", errors="ignore")

    unigrams: Counter[str] = Counter()
    bigrams: dict[str, Counter[str]] = defaultdict(Counter)
    phrases: Counter[str] = Counter()

    for sent in SENT_SPLIT.split(text):
        words = clean_words(WORD_RE.findall(sent))
        if not words:
            continue
        for i, w in enumerate(words):
            unigrams[w] += 1
            if i + 1 < len(words):
                bigrams[w][words[i + 1]] += 1
            # phrases length 2..6
            for length in range(2, 7):
                if i + length <= len(words):
                    phrase = " ".join(words[i:i + length]).lower()
                    phrases[phrase] += 1

    # Trim aggressively.
    top_unigrams = {w: c for w, c in unigrams.most_common(3000) if c >= 3}
    top_bigrams: dict[str, dict[str, int]] = {}
    for w, tbl in bigrams.items():
        if w.lower() not in {k.lower() for k in top_unigrams}:
            continue
        top_next = {n: c for n, c in tbl.most_common(6) if c >= 2}
        if top_next:
            top_bigrams[w] = top_next
    top_phrases = {p: c for p, c in phrases.most_common(4000) if c >= 3}

    out = {
        "unigrams": top_unigrams,
        "bigrams": top_bigrams,
        "phrases": top_phrases,
    }
    DST.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    print(
        f"wrote {DST}: "
        f"{len(top_unigrams)} unigrams, "
        f"{sum(len(v) for v in top_bigrams.values())} bigram edges, "
        f"{len(top_phrases)} phrases"
    )


if __name__ == "__main__":
    main()
