import type { TextFormat, FrequencyType, SkillCategory, NPCCard } from "./types";
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

export function emptyCard(): NPCCard {
  return {
    id: uuidv4(), name: "", body: 50, armor: 0, baseDamage: 0,
    creatureTypeIds: [], description: "", skills: [],
    tags: [], createdAt: Date.now(), updatedAt: Date.now(),
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
