// ============================================================================
// skillAutocomplete.ts — Lightweight autocomplete engine for skill rules text.
// ============================================================================
// Purpose:
//   Train a tiny in-memory language model on the user's existing skills'
//   rules text (and names) and offer smart word/phrase completions while
//   they type a new skill.
//
// ┌───────────────────────────────────────────────────────────────┐
// │ ASCII FLOW                                                    │
// │   skills[] ── train ─▶ Model { unigrams, bigrams, phrases }   │
// │   textarea state ── analyze ─▶ { prefix, prevWord } ─▶ suggest │
// │   suggestions[] ─▶ dropdown UI ─▶ insert on Tab/Enter/click   │
// └───────────────────────────────────────────────────────────────┘
//
// The model is deliberately simple and dependency-free:
//   * unigrams  — frequency of every word in the corpus
//   * bigrams   — { prevWord: { nextWord: count } }
//   * phrases   — a set of contiguous multi-word fragments (2–6 words) that
//                 occurred verbatim in the corpus (so common patterns like
//                 "gain a Boon of" get recycled intact)
// ============================================================================

import type { Skill } from "./types";

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────
export interface AutocompleteModel {
  unigrams: Map<string, number>;
  bigrams: Map<string, Map<string, number>>;
  phrases: Map<string, number>; // key = lowercase phrase, value = count
}

export interface Suggestion {
  /** Full text that will replace the current prefix in the textarea. */
  text: string;
  /** Human-readable label shown in the dropdown. */
  label: string;
  /** Ranking score, higher = better. */
  score: number;
  /** Suggestion category — used for styling and de-dupe grouping. */
  kind: "word" | "phrase" | "skillName";
}

// ────────────────────────────────────────────────────────────────
// Tokenizer
// ────────────────────────────────────────────────────────────────
// We keep punctuation as separate tokens so we can rebuild sentences,
// but for the model we care about the *word* tokens only.
const WORD_RE = /[A-Za-z][A-Za-z'’-]*/g;

function tokenizeWords(text: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  WORD_RE.lastIndex = 0;
  while ((m = WORD_RE.exec(text)) !== null) out.push(m[0]);
  return out;
}

// ────────────────────────────────────────────────────────────────
// Training
// ────────────────────────────────────────────────────────────────

/** Serializable snapshot format used by the pre-baked rulebook model. */
export interface SerializedModel {
  unigrams: Record<string, number>;
  bigrams: Record<string, Record<string, number>>;
  phrases: Record<string, number>;
}

/** Load a SerializedModel (from JSON) into runtime Map form. */
export function loadModel(s: SerializedModel): AutocompleteModel {
  const unigrams = new Map<string, number>();
  for (const [k, v] of Object.entries(s.unigrams)) unigrams.set(k, v);

  const bigrams = new Map<string, Map<string, number>>();
  for (const [prev, tbl] of Object.entries(s.bigrams)) {
    const m = new Map<string, number>();
    for (const [next, count] of Object.entries(tbl)) m.set(next, count);
    bigrams.set(prev, m);
  }

  const phrases = new Map<string, number>();
  for (const [k, v] of Object.entries(s.phrases)) phrases.set(k, v);

  return { unigrams, bigrams, phrases };
}

/** Merge `extra` into `base` in place (returns base). Weights everything
 * from `extra` by `weight` so a large external corpus doesn't drown out
 * the user's own writing.
 */
export function mergeModel(
  base: AutocompleteModel,
  extra: AutocompleteModel,
  weight = 0.35,
): AutocompleteModel {
  for (const [k, v] of extra.unigrams) {
    base.unigrams.set(k, (base.unigrams.get(k) ?? 0) + v * weight);
  }
  for (const [prev, tbl] of extra.bigrams) {
    let target = base.bigrams.get(prev);
    if (!target) { target = new Map(); base.bigrams.set(prev, target); }
    for (const [nxt, c] of tbl) {
      target.set(nxt, (target.get(nxt) ?? 0) + c * weight);
    }
  }
  for (const [p, c] of extra.phrases) {
    base.phrases.set(p, (base.phrases.get(p) ?? 0) + c * weight);
  }
  return base;
}

export function trainModel(skills: Skill[]): AutocompleteModel {
  const unigrams = new Map<string, number>();
  const bigrams = new Map<string, Map<string, number>>();
  const phrases = new Map<string, number>();

  const bump = <K,>(m: Map<K, number>, k: K) => m.set(k, (m.get(k) ?? 0) + 1);

  for (const s of skills) {
    // Feed rules text + skill name into the corpus.
    const corpus = `${s.name}\n${s.rulesText ?? ""}`;

    // Split by sentence-ish boundaries so a bigram doesn't cross a period.
    const sentences = corpus.split(/[.!?\n]+/);

    for (const sent of sentences) {
      const words = tokenizeWords(sent);
      if (words.length === 0) continue;

      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        bump(unigrams, w);

        if (i + 1 < words.length) {
          const next = words[i + 1];
          if (!bigrams.has(w)) bigrams.set(w, new Map());
          bump(bigrams.get(w)!, next);
        }

        // Record contiguous phrases of length 2–6.
        for (let len = 2; len <= 6 && i + len <= words.length; len++) {
          const phrase = words.slice(i, i + len).join(" ");
          bump(phrases, phrase.toLowerCase());
        }
      }
    }
  }

  return { unigrams, bigrams, phrases };
}

// ────────────────────────────────────────────────────────────────
// Context extraction — look at what the user just typed.
// ────────────────────────────────────────────────────────────────
export interface TypingContext {
  /** The partial word currently under the caret. */
  prefix: string;
  /** The word immediately before the prefix, if any. */
  prevWord: string | null;
  /** Position in the source string where the prefix starts. */
  prefixStart: number;
  /** Position in the source string where the prefix ends (== caret). */
  prefixEnd: number;
}

export function analyzeTyping(text: string, caret: number): TypingContext {
  // Walk left from caret while we still see word-characters.
  let i = caret;
  while (i > 0 && /[A-Za-z'’-]/.test(text[i - 1])) i--;
  const prefixStart = i;
  const prefix = text.slice(prefixStart, caret);

  // Grab the word before that prefix by skipping whitespace and reading.
  let j = prefixStart;
  while (j > 0 && /\s/.test(text[j - 1])) j--;
  let k = j;
  while (k > 0 && /[A-Za-z'’-]/.test(text[k - 1])) k--;
  const prevWord = k < j ? text.slice(k, j) : null;

  return { prefix, prevWord, prefixStart, prefixEnd: caret };
}

// ────────────────────────────────────────────────────────────────
// Suggestion
// ────────────────────────────────────────────────────────────────
const STOP = new Set([
  "a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "is",
  "it", "at", "by", "as", "be", "if",
]);

/**
 * Build a ranked list of completions. Suggestions can be:
 *   1) single-word completions matching the prefix
 *   2) multi-word phrase completions (prefix begins the phrase)
 *   3) if prefix is empty and we have a prevWord, next-word predictions
 *      from the bigram model
 *   4) existing skill names (users often reference other skills)
 */
export function suggest(
  ctx: TypingContext,
  model: AutocompleteModel,
  skillNames: string[],
  limit = 8,
): Suggestion[] {
  const out: Suggestion[] = [];
  const prefixLower = ctx.prefix.toLowerCase();
  const prevLower = ctx.prevWord?.toLowerCase() ?? null;

  const preserveCase = (base: string): string => {
    // Preserve capitalization of the user's typed prefix on the output.
    if (ctx.prefix.length === 0) return base;
    if (ctx.prefix === ctx.prefix.toUpperCase()) return base.toUpperCase();
    if (ctx.prefix[0] === ctx.prefix[0].toUpperCase())
      return base[0].toUpperCase() + base.slice(1);
    return base;
  };

  // ── Skill names ──
  for (const name of skillNames) {
    if (name.length === 0) continue;
    if (prefixLower.length === 0) continue;
    if (name.toLowerCase().startsWith(prefixLower) && name.toLowerCase() !== prefixLower) {
      out.push({
        text: name,
        label: `${name}  · skill`,
        score: 500 + name.length,
        kind: "skillName",
      });
    }
  }

  // ── Phrase completions ──
  if (prefixLower.length >= 2) {
    for (const [phrase, count] of model.phrases) {
      if (!phrase.startsWith(prefixLower)) continue;
      if (phrase === prefixLower) continue;
      // Skip phrases where the FIRST word is just the prefix — they're
      // covered by unigram completions. We want longer sequences.
      const firstSpace = phrase.indexOf(" ");
      if (firstSpace === -1) continue;
      // Prefer phrases where prevWord matches the word before this phrase.
      const words = phrase.split(" ");
      out.push({
        text: preserveCase(phrase),
        label: phrase,
        score: 100 + count * 5 + words.length * 3,
        kind: "phrase",
      });
    }
  }

  // ── Single-word unigram completions ──
  if (prefixLower.length >= 1) {
    for (const [word, count] of model.unigrams) {
      const lw = word.toLowerCase();
      if (!lw.startsWith(prefixLower)) continue;
      if (lw === prefixLower) continue;
      const penalty = STOP.has(lw) ? -20 : 0;
      out.push({
        text: preserveCase(word),
        label: word,
        score: 50 + count * 2 + penalty,
        kind: "word",
      });
    }
  }

  // ── Bigram next-word (only when prefix is empty and we have prevWord) ──
  if (prefixLower.length === 0 && prevLower) {
    const table = model.bigrams.get(prevLower)
      ?? model.bigrams.get(ctx.prevWord!) // exact-case fallback
      ?? null;
    if (table) {
      for (const [word, count] of table) {
        if (STOP.has(word.toLowerCase())) continue;
        out.push({
          text: word,
          label: `→ ${word}`,
          score: 30 + count * 4,
          kind: "word",
        });
      }
    }
  }

  // De-dupe by lowercase text; keep highest score for each.
  const bestByKey = new Map<string, Suggestion>();
  for (const s of out) {
    const key = s.text.toLowerCase();
    const prev = bestByKey.get(key);
    if (!prev || prev.score < s.score) bestByKey.set(key, s);
  }

  return Array.from(bestByKey.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ────────────────────────────────────────────────────────────────
// Apply a suggestion into a text string.
// ────────────────────────────────────────────────────────────────
export function applySuggestion(
  text: string,
  ctx: TypingContext,
  suggestion: Suggestion,
): { newText: string; newCaret: number } {
  const before = text.slice(0, ctx.prefixStart);
  const after = text.slice(ctx.prefixEnd);
  // If the prefix is empty and we're using a bigram prediction, make sure a
  // space precedes the inserted word.
  let insertion = suggestion.text;
  if (ctx.prefix.length === 0 && before.length > 0 && !/\s$/.test(before)) {
    insertion = " " + insertion;
  }
  // Add a trailing space so the user can immediately continue typing.
  const withTail = insertion + " ";
  return {
    newText: before + withTail + after,
    newCaret: before.length + withTail.length,
  };
}
