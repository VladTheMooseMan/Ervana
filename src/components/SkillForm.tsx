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
// Autocomplete: while typing in Rules Text, an overlay dropdown suggests
// completions trained on ALL existing skills' names + rules text. Tab or
// Enter accepts the top suggestion, arrow keys navigate, Esc dismisses.
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
  type Suggestion,
  type AutocompleteModel,
} from "../skillAutocomplete";

export function emptySkill(): Skill {
  return {
    id: uuidv4(), name: "", category: "TALENT", domain: "",
    rulesText: "",
    nameFormat: { color: "#c8a96e", fontFamily: "'Cinzel', serif", bold: true, italic: false, underline: false },
    rulesFormat: defaultFmt(),
    iconKind: "star",
  };
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
  const rulesRef = useRef<HTMLTextAreaElement | null>(null);
  const model: AutocompleteModel = useMemo(() => {
    // Exclude the skill we're editing so it doesn't pollute its own training.
    const others = skills.filter(s => s.id !== skill.id);
    return trainModel(others);
  }, [skills, skill.id]);
  const skillNames = useMemo(
    () => skills.filter(s => s.id !== skill.id).map(s => s.name),
    [skills, skill.id],
  );
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [acOpen, setAcOpen] = useState(false);
  const [acIndex, setAcIndex] = useState(0);
  const [acEnabled, setAcEnabled] = useState(true);
  const [caretPos, setCaretPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  function refreshSuggestions(nextText: string, caret: number) {
    if (!acEnabled) { setAcOpen(false); return; }
    const ctx = analyzeTyping(nextText, caret);
    // Only show completions once user has typed at least one word char,
    // or when there's a prevWord (bigram prediction).
    if (ctx.prefix.length === 0 && !ctx.prevWord) { setAcOpen(false); return; }
    const list = suggest(ctx, model, skillNames, 8);
    setSuggestions(list);
    setAcIndex(0);
    setAcOpen(list.length > 0);
  }

  function acceptSuggestion(sug: Suggestion) {
    const ta = rulesRef.current;
    if (!ta) return;
    const ctx = analyzeTyping(skill.rulesText, ta.selectionStart ?? skill.rulesText.length);
    const { newText, newCaret } = applySuggestion(skill.rulesText, ctx, sug);
    set({ rulesText: newText });
    setAcOpen(false);
    // Restore caret after React re-renders.
    requestAnimationFrame(() => {
      const el = rulesRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(newCaret, newCaret);
    });
  }

  function onRulesKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!acOpen || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAcIndex(i => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAcIndex(i => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();
      acceptSuggestion(suggestions[acIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setAcOpen(false);
    }
  }

  // Recompute caret pixel position for dropdown anchoring.
  useEffect(() => {
    const ta = rulesRef.current;
    if (!ta || !acOpen) return;
    // Very cheap approximation: use the textarea's bounding rect and offset
    // by a fixed distance from the top-left. Good enough for a floating
    // dropdown pinned to the bottom-left of the field.
    const rect = ta.getBoundingClientRect();
    setCaretPos({
      top: rect.height,
      left: 0,
    });
  }, [acOpen, skill.rulesText]);

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
      <div className="mb-3 relative">
        <div className="flex items-center justify-between">
          <label className="font-cinzel text-custom-brown text-xs tracking-widest uppercase">Rules Text</label>
          <label className="flex items-center gap-1 text-[10px] text-custom-brown/70 font-serif cursor-pointer select-none">
            <input
              type="checkbox"
              checked={acEnabled}
              onChange={e => { setAcEnabled(e.target.checked); if (!e.target.checked) setAcOpen(false); }}
              className="cursor-pointer"
            />
            Autocomplete (Tab/Enter accepts, Esc dismisses)
          </label>
        </div>
        <textarea
          ref={rulesRef}
          className="bg-paper border border-custom-brown/20 rounded-md text-custom-brown px-3 py-2 font-serif text-sm w-full outline-none min-h-[80px] resize-y mt-1"
          value={skill.rulesText}
          onChange={e => {
            const val = e.target.value;
            set({ rulesText: val });
            const caret = e.target.selectionStart ?? val.length;
            refreshSuggestions(val, caret);
          }}
          onKeyDown={onRulesKeyDown}
          onBlur={() => setTimeout(() => setAcOpen(false), 120)}
          onClick={e => {
            const el = e.currentTarget;
            refreshSuggestions(el.value, el.selectionStart ?? 0);
          }}
          placeholder="Describe what this skill does…"
        />
        {acOpen && suggestions.length > 0 && (
          <div
            className="absolute z-40 bg-paper border border-custom-brown/40 rounded-md shadow-lg overflow-hidden"
            style={{ top: caretPos.top + 4, left: 8, minWidth: 240, maxWidth: 360 }}
          >
            <div className="px-2 py-1 text-[10px] uppercase tracking-widest font-cinzel text-custom-brown/60 border-b border-custom-brown/10 bg-paper-dark">
              Suggestions
            </div>
            {suggestions.map((s, i) => (
              <button
                key={s.text + i}
                type="button"
                onMouseDown={ev => { ev.preventDefault(); acceptSuggestion(s); }}
                onMouseEnter={() => setAcIndex(i)}
                className={
                  "block w-full text-left px-2 py-1 text-sm font-serif " +
                  (i === acIndex
                    ? "bg-custom-gold/30 text-custom-brown"
                    : "text-custom-brown hover:bg-paper-dark")
                }
              >
                <span className="font-medium">{s.label}</span>
                <span className="ml-2 text-[10px] uppercase text-custom-brown/50">{s.kind}</span>
              </button>
            ))}
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
