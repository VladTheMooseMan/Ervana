// ============================================================================
// SkillForm.tsx — Reusable skill create/edit form
// ============================================================================
// Purpose: Same form used by Skills Bank tab AND the "Create New Skill"
// pop-up in Card Builder. Guarantees a single implementation so both stay
// in sync.
//
// Duplicate-name protection: onSave rejects skills whose name matches an
// existing skill (case-insensitive) unless it is the same id being edited.
//
// Autocomplete: while typing in Rules Text, INLINE GHOST TEXT is rendered
// in the textarea past the caret. Trained on ALL existing skills' names +
// rules text; retrains automatically as new skills are added to the store.
//   - Tab            = accept ghost text
//   - ArrowUp/Down   = cycle through alternative suggestions
//   - Esc            = dismiss
//   - just keep typing to ignore
// ============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Skill, SkillCategory, SkillIcon as SkillIconType } from "../types";
import { defaultFmt } from "../utils";
import { FormatEditor, SkillIconPicker } from "./shared";
import { useAppStore } from "../store/appStore";
import {
  trainModel,
  analyzeTyping,
  suggest,
  applySuggestion,
  loadModel,
  mergeModel,
  type Suggestion,
  type AutocompleteModel,
  type TypingContext,
  type SerializedModel,
} from "../skillAutocomplete";
import rulebookModelJSON from "../data/rulebookModel.json";

export function emptySkill(): Skill {
  return {
    id: uuidv4(), name: "", category: "TALENT", domain: "",
    rulesText: "",
    nameFormat: { color: "#c8a96e", fontFamily: "'Cinzel', serif", bold: true, italic: false, underline: false },
    rulesFormat: defaultFmt(),
    iconKind: "star",
  };
}

// ────────────────────────────────────────────────────────────────
// Given a context + suggestion, compute what should appear as ghost
// text past the caret in the textarea.
// ────────────────────────────────────────────────────────────────
function computeGhostText(
  text: string,
  ctx: TypingContext,
  sug: Suggestion,
): string {
  // Simulate an insertion and pull out the characters that would be
  // added *after* the current caret position.
  const before = text.slice(0, ctx.prefixStart);
  let insertion = sug.text;
  if (ctx.prefix.length === 0 && before.length > 0 && !/\s$/.test(before)) {
    insertion = " " + insertion;
  }
  // The portion of `insertion` that overlaps with what's already been
  // typed as the prefix. The rest is what we render as ghost.
  return insertion.slice(ctx.prefix.length);
}

export function SkillForm({ initial, onSave, onCancel }: {
  initial?: Skill; onSave: (s: Skill) => void; onCancel: () => void;
}) {
  const [skill, setSkill] = useState<Skill>(initial ? { ...initial } : emptySkill());
  const [nameError, setNameError] = useState<string | null>(null);
  const { skills } = useAppStore();
  const set = (p: Partial<Skill>) => setSkill(s => ({ ...s, ...p }));
  const hasDomain = skill.category === "SPELL" || skill.category === "TALENT";

  // ── Autocomplete state ──
  // Model retrains automatically whenever the store's skill list
  // changes, so any skill added later is immediately part of the
  // corpus without a page reload. The pre-baked rulebook model is
  // merged in with a lower weight so canonical game vocabulary is
  // available but user-authored skills still rank higher.
  const rulesRef = useRef<HTMLTextAreaElement | null>(null);
  const mirrorRef = useRef<HTMLDivElement | null>(null);
  const rulebookModel: AutocompleteModel = useMemo(
    () => loadModel(rulebookModelJSON as SerializedModel),
    [],
  );
  const model: AutocompleteModel = useMemo(() => {
    const others = skills.filter(s => s.id !== skill.id);
    const trained = trainModel(others);
    return mergeModel(trained, rulebookModel, 0.35);
  }, [skills, skill.id, rulebookModel]);
  const skillNames = useMemo(
    () => skills.filter(s => s.id !== skill.id).map(s => s.name),
    [skills, skill.id],
  );
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [acIndex, setAcIndex] = useState(0);
  const [acEnabled, setAcEnabled] = useState(true);
  const [caretIdx, setCaretIdx] = useState(0);

  const activeSuggestion: Suggestion | null =
    acEnabled && suggestions.length > 0 ? suggestions[acIndex] : null;
  const currentCtx: TypingContext = useMemo(
    () => analyzeTyping(skill.rulesText, caretIdx),
    [skill.rulesText, caretIdx],
  );
  const ghostText: string = activeSuggestion
    ? computeGhostText(skill.rulesText, currentCtx, activeSuggestion)
    : "";

  function refreshSuggestions(nextText: string, caret: number) {
    setCaretIdx(caret);
    if (!acEnabled) { setSuggestions([]); return; }
    const ctx = analyzeTyping(nextText, caret);
    // Only surface ghost text at word boundaries or mid-word — if the
    // caret is followed by a non-whitespace char (mid-typing existing
    // word), suppress it to avoid confusing "completions" over text.
    const nextChar = nextText[caret];
    if (nextChar && !/\s/.test(nextChar)) { setSuggestions([]); return; }
    if (ctx.prefix.length === 0 && !ctx.prevWord) { setSuggestions([]); return; }
    const list = suggest(ctx, model, skillNames, 8);
    setSuggestions(list);
    setAcIndex(0);
  }

  function acceptSuggestion() {
    const ta = rulesRef.current;
    const sug = activeSuggestion;
    if (!ta || !sug) return;
    const ctx = analyzeTyping(skill.rulesText, ta.selectionStart ?? skill.rulesText.length);
    const { newText, newCaret } = applySuggestion(skill.rulesText, ctx, sug);
    set({ rulesText: newText });
    setSuggestions([]);
    requestAnimationFrame(() => {
      const el = rulesRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(newCaret, newCaret);
      setCaretIdx(newCaret);
    });
  }

  function onRulesKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (suggestions.length === 0) return;
    if (e.key === "Tab") {
      e.preventDefault();
      acceptSuggestion();
    } else if (e.key === "ArrowDown") {
      // Alt-Down or Ctrl-Down cycles suggestions; plain Down should
      // still move the caret within the textarea like normal.
      if (e.altKey || e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setAcIndex(i => (i + 1) % suggestions.length);
      }
    } else if (e.key === "ArrowUp") {
      if (e.altKey || e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setAcIndex(i => (i - 1 + suggestions.length) % suggestions.length);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSuggestions([]);
    }
  }

  // Keep mirror scroll pinned to textarea scroll so the ghost text
  // stays aligned even in a long field.
  useEffect(() => {
    const ta = rulesRef.current;
    const mir = mirrorRef.current;
    if (!ta || !mir) return;
    const sync = () => {
      mir.scrollTop = ta.scrollTop;
      mir.scrollLeft = ta.scrollLeft;
    };
    ta.addEventListener("scroll", sync);
    sync();
    return () => ta.removeEventListener("scroll", sync);
  }, []);

  function handleSave() {
    const trimmed = skill.name.trim();
    if (!trimmed) { setNameError("Name required"); return; }
    const dup = skills.find(x => x.id !== skill.id && x.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (dup) { setNameError(`A skill named "${dup.name}" already exists.`); return; }
    setNameError(null);
    onSave({ ...skill, name: trimmed });
  }

  return (
    <div className="bg-paper-dark border border-custom-brown/10 rounded-lg p-4 mb-4">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="font-cinzel text-custom-brown text-xs tracking-widest uppercase">Skill Name</label>
          <input className="bg-paper border border-custom-brown/20 rounded-md text-custom-brown px-3 py-2 font-serif text-sm w-full outline-none mt-1" value={skill.name} onChange={e => { set({ name: e.target.value }); setNameError(null); }} placeholder="e.g. SUBDUE" />
          {nameError && <p className="text-red-800 bg-red-100 border border-red-400 rounded px-2 py-1 mt-1 text-xs font-bold">{nameError}</p>}
        </div>
        <div>
          <label className="font-cinzel text-custom-brown text-xs tracking-widest uppercase">Category</label>
          <select className="bg-paper border border-custom-brown/20 rounded-md text-custom-brown px-3 py-2 font-serif text-sm w-full outline-none mt-1" value={skill.category}
            onChange={e => set({ category: e.target.value as SkillCategory })}>
            {(["TAG","SPELL","TALENT","PASSIVE"] as SkillCategory[]).map(c =>
              <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="mb-3">
        <label className="font-cinzel text-custom-brown text-xs tracking-widest uppercase">Icon</label>
        <div className="mt-1">
          <SkillIconPicker value={skill.iconKind ?? "star"} onChange={v => set({ iconKind: v as SkillIconType })} />
        </div>
      </div>
      {hasDomain && (
        <div className="mb-3">
          <label className="font-cinzel text-custom-brown text-xs tracking-widest uppercase">Domain</label>
          <input className="bg-paper border border-custom-brown/20 rounded-md text-custom-brown px-3 py-2 font-serif text-sm w-full outline-none mt-1" value={skill.domain ?? ""} onChange={e => set({ domain: e.target.value })} placeholder="e.g. Combat, Evocation…" />
        </div>
      )}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <label className="font-cinzel text-custom-brown text-xs tracking-widest uppercase">Rules Text</label>
          <label className="flex items-center gap-1 text-[10px] text-custom-brown/70 font-serif cursor-pointer select-none">
            <input
              type="checkbox"
              checked={acEnabled}
              onChange={e => { setAcEnabled(e.target.checked); if (!e.target.checked) setSuggestions([]); }}
              className="cursor-pointer"
            />
            Autocomplete (Tab accepts · Alt-↑/↓ cycles · Esc dismisses)
          </label>
        </div>
        <div className="relative mt-1 rounded-md border border-custom-brown/20 bg-paper overflow-hidden">
          {/* Ghost-text mirror layer. It mirrors the textarea's typed
              text in fully-transparent color and inserts a visible,
              faint italic <span> at the caret position. Sits BEHIND
              the textarea; the textarea's own background is transparent
              so the ghost bleeds through. */}
          <div
            ref={mirrorRef}
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none whitespace-pre-wrap break-words overflow-hidden font-serif text-sm px-3 py-2 leading-[1.35]"
            style={{ color: "transparent", zIndex: 1 }}
          >
            <span>{skill.rulesText.slice(0, caretIdx)}</span>
            {ghostText && (
              <span style={{ color: "rgba(74, 55, 40, 0.55)", fontStyle: "italic" }}>
                {ghostText}
              </span>
            )}
            <span>{skill.rulesText.slice(caretIdx)}</span>
            {"\u200b"}
          </div>
          <textarea
            ref={rulesRef}
            className="relative block w-full font-serif text-sm px-3 py-2 min-h-[80px] leading-[1.35] text-custom-brown outline-none resize-y bg-transparent border-0"
            style={{ zIndex: 2 }}
            value={skill.rulesText}
            onChange={e => {
              const val = e.target.value;
              set({ rulesText: val });
              const caret = e.target.selectionStart ?? val.length;
              refreshSuggestions(val, caret);
            }}
            onKeyDown={onRulesKeyDown}
            onKeyUp={e => setCaretIdx(e.currentTarget.selectionStart ?? 0)}
            onClick={e => {
              const el = e.currentTarget;
              refreshSuggestions(el.value, el.selectionStart ?? 0);
            }}
            onSelect={e => setCaretIdx((e.target as HTMLTextAreaElement).selectionStart ?? 0)}
            onBlur={() => setSuggestions([])}
            placeholder="Describe what this skill does…"
          />
        </div>
        {activeSuggestion && suggestions.length > 1 && (
          <div className="mt-1 text-[10px] text-custom-brown/50 font-serif">
            {acIndex + 1} / {suggestions.length} · Alt-↑/↓ to cycle
          </div>
        )}
      </div>
      <div className="mb-4">
        <label className="font-cinzel text-custom-brown text-xs tracking-widest uppercase">Text Formatting</label>
        <div className="mt-2">
          <FormatEditor fmt={skill.nameFormat ?? defaultFmt()} onChange={f => set({ nameFormat: f })} label="Skill Name" />
          <FormatEditor fmt={skill.rulesFormat ?? defaultFmt()} onChange={f => set({ rulesFormat: f })} label="Rules Text" />
        </div>
      </div>
      <div className="flex gap-3">
        <button className="bg-button-gradient border border-custom-gold/50 rounded-md text-white px-5 py-2 cursor-pointer font-cinzel tracking-wider text-sm flex-1" onClick={handleSave}>Save Skill</button>
        <button className="border border-custom-brown/20 rounded-md text-custom-brown px-4 py-2 cursor-pointer text-xs hover:bg-paper" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
