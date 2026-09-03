import type { TextFormat, FrequencyType, SkillCategory, NPCCard, CardTraits, FormatRange, Skill, DamageType } from "./types";
import { v4 as uuidv4 } from "uuid";

export function applyFmt(fmt?: TextFormat): React.CSSProperties {
  if (!fmt) return {};
  // Legacy default colors were light tan / light gold — drop them so
  // CSS classes provide a readable dark color on parchment/paper.
  const legacy = new Set(["#e8dcc8", "#c8a96e"]);
  const isLegacy = fmt.color && legacy.has(fmt.color.toLowerCase());
  return {
    color: isLegacy ? undefined : fmt.color,
    fontFamily: fmt.fontFamily,
    fontWeight: fmt.bold ? "bold" : "normal",
    fontStyle: fmt.italic ? "italic" : "normal",
    textDecoration: fmt.underline ? "underline" : "none",
    fontSize: fmt.fontSize ? `${fmt.fontSize}px` : undefined,
  };
}

export function freqLabel(f: FrequencyType): string {
  switch (f.kind) {
    case "uses":    return `x ${f.count}`;
    case "con":     return `x ${f.seconds} sec Con`;
    case "cd":      return `x ${f.seconds} sec CD`;
    case "other":   return f.text;
    case "passive": return "Passive";
  }
}

export function defaultFmt(): TextFormat {
  return { color: "#1a1208", fontFamily: "serif", bold: false, italic: false, underline: false };
}

export function emptyTraits(): CardTraits {
  return { str: 0, dex: 0, int: 0, wis: 0, cha: 0, con: 0 };
}

export function emptyCard(): NPCCard {
  return {
    id: uuidv4(), name: "", body: 50, armor: 0, baseDamage: 0,
    creatureTypeIds: [], description: "", descriptionRanges: [], skills: [],
    tags: [], traits: emptyTraits(), notes: "",
    baseAttacks: [], useThreeColumns: false,
    createdAt: Date.now(), updatedAt: Date.now(),
  };
}

export function defaultFreq(category: SkillCategory): FrequencyType {
  if (category === "PASSIVE") return { kind: "passive" };
  return { kind: "uses", count: 3 };
}

export function pasteAtCursor(text: string) {
  const el = document.activeElement as HTMLTextAreaElement | HTMLInputElement | null;
  if (!el || (el.tagName !== "TEXTAREA" && el.tagName !== "INPUT")) return false;
  const start = el.selectionStart ?? el.value.length;
  const end   = el.selectionEnd ?? start;
  const before = el.value.slice(0, start);
  const after  = el.value.slice(end);
  const proto = el.tagName === "TEXTAREA"
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) {
    setter.call(el, before + text + after);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  requestAnimationFrame(() => {
    el.selectionStart = el.selectionEnd = start + text.length;
    el.focus();
  });
  return true;
}
export const FONT_OPTS = [
  { label: "Serif",        value: "serif" },
  { label: "Sans",         value: "sans-serif" },
  { label: "Mono",         value: "monospace" },
  { label: "Cinzel",       value: "'Cinzel', serif" },
  { label: "Uncial",       value: "'Uncial Antiqua', cursive" },
  { label: "IM Fell",      value: "'IM Fell English', serif" },
];

// ── Rich-text description rendering ─────────────────────────────────────────
// Given the raw description string, an optional list of user-applied
// FormatRange overrides, and the current damageTypes + skills collections,
// return an array of {text, style} chunks ready to render as <span>s.
//
// Behaviour:
//   1. Auto-highlight every occurrence of a DamageType name using that
//      type's TextFormat.
//   2. Auto-bold every occurrence of a Skill name.
//   3. User FormatRange overrides win over 1 & 2 for their span.
export interface Chunk {
  text: string;
  style: React.CSSProperties;
}

interface Marker {
  start: number;
  end: number;
  priority: number;      // higher wins
  style: React.CSSProperties;
}

function findAllOccurrences(hay: string, needle: string): { start: number; end: number }[] {
  const res: { start: number; end: number }[] = [];
  if (!needle) return res;
  const lc = hay.toLowerCase();
  const n  = needle.toLowerCase();
  let i = 0;
  while (i <= lc.length - n.length) {
    const idx = lc.indexOf(n, i);
    if (idx === -1) break;
    // Word-boundary check — only match whole words
    const before = idx === 0 ? " " : lc[idx - 1];
    const after  = idx + n.length >= lc.length ? " " : lc[idx + n.length];
    if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) {
      res.push({ start: idx, end: idx + n.length });
    }
    i = idx + n.length;
  }
  return res;
}

export function buildRichChunks(
  text: string,
  ranges: FormatRange[] | undefined,
  damageTypes: DamageType[],
  skills: Skill[],
): Chunk[] {
  if (!text) return [];

  const markers: Marker[] = [];

  // Priority 1: damage-type auto-format
  for (const dt of damageTypes) {
    for (const occ of findAllOccurrences(text, dt.name)) {
      markers.push({ ...occ, priority: 1, style: applyFmt(dt.format) });
    }
  }
  // Priority 2: skill names bold
  for (const sk of skills) {
    for (const occ of findAllOccurrences(text, sk.name)) {
      markers.push({ ...occ, priority: 2, style: { fontWeight: "bold" } });
    }
  }
  // Priority 3: user-applied ranges (highest)
  for (const r of ranges ?? []) {
    if (r.end <= r.start) continue;
    const style: React.CSSProperties = {};
    if (r.color)     style.color = r.color;
    if (r.bold)      style.fontWeight = "bold";
    if (r.italic)    style.fontStyle = "italic";
    if (r.underline) style.textDecoration = "underline";
    markers.push({ start: r.start, end: r.end, priority: 3, style });
  }

  // Break the string into segments where the winning marker changes.
  // For each character index build the style stack (higher priority overrides).
  const chunks: Chunk[] = [];
  let cursor = 0;

  // Collect all boundary points
  const points = new Set<number>([0, text.length]);
  for (const m of markers) { points.add(m.start); points.add(m.end); }
  const sorted = [...points].sort((a, b) => a - b);

  for (let i = 0; i < sorted.length - 1; i++) {
    const s = sorted[i];
    const e = sorted[i + 1];
    if (s >= text.length) break;
    if (s < cursor) continue;
    const covering = markers.filter(m => m.start <= s && m.end >= e);
    // Merge styles in ascending priority so higher priority overrides
    let style: React.CSSProperties = {};
    for (const m of covering.sort((a, b) => a.priority - b.priority)) {
      style = { ...style, ...m.style };
    }
    chunks.push({ text: text.slice(s, e), style });
    cursor = e;
  }
  return chunks;
}

