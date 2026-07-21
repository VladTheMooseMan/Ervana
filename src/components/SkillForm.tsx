// ============================================================================
// SkillForm.tsx — Reusable skill create/edit form
// ============================================================================
// Purpose: Same form used by Skills Bank tab AND the "Create New Skill"
// pop-up in Card Builder. Guarantees a single implementation so both stay
// in sync.
//
// Duplicate-name protection: onSave rejects skills whose name matches an
// existing skill (case-insensitive) unless it is the same id being edited.
// ============================================================================

import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Skill, SkillCategory, SkillIcon as SkillIconType } from "../types";
import { defaultFmt } from "../utils";
import { FormatEditor, SkillIconPicker } from "./shared";
import { useAppStore } from "../store/appStore";

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
        <label className="font-cinzel text-custom-brown text-xs tracking-widest uppercase">Rules Text</label>
        <textarea className="bg-paper border border-custom-brown/20 rounded-md text-custom-brown px-3 py-2 font-serif text-sm w-full outline-none min-h-[80px] resize-y mt-1" value={skill.rulesText}
          onChange={e => set({ rulesText: e.target.value })} placeholder="Describe what this skill does…" />
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
