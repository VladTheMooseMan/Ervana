import { useState, useMemo } from "react";
import type { Skill, SkillCategory } from "../types";
import { v4 as uuidv4 } from "uuid";
import { useAppStore } from "../store/appStore";
import { defaultFmt } from "../utils";
import { FormatEditor, SkillRow } from "./shared";

function emptySkill(): Skill {
  return {
    id: uuidv4(), name: "", category: "TALENT", domain: "",
    rulesText: "",
    nameFormat: { color: "#c8a96e", fontFamily: "'Cinzel', serif", bold: true, italic: false, underline: false },
    rulesFormat: defaultFmt(),
  };
}

function SkillForm({ initial, onSave, onCancel }: {
  initial?: Skill; onSave: (s: Skill) => void; onCancel: () => void;
}) {
  const [skill, setSkill] = useState<Skill>(initial ? { ...initial } : emptySkill());
  const set = (p: Partial<Skill>) => setSkill(s => ({ ...s, ...p }));
  const hasDomain = skill.category === "SPELL" || skill.category === "TALENT";
  return (
    <div className="bg-paper-dark border border-custom-brown/10 rounded-lg p-4 mb-4">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="font-cinzel text-custom-brown text-xs tracking-widest uppercase">Skill Name</label>
          <input className="bg-paper border border-custom-brown/20 rounded-md text-custom-brown px-3 py-2 font-serif text-sm w-full outline-none mt-1" value={skill.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. SUBDUE" />
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
        <button className="bg-button-gradient border border-custom-gold/50 rounded-md text-white px-5 py-2 cursor-pointer font-cinzel tracking-wider text-sm flex-1" onClick={() => { if (!skill.name.trim()) return; onSave(skill); }}>Save Skill</button>
        <button className="border border-custom-brown/20 rounded-md text-custom-brown px-4 py-2 cursor-pointer text-xs hover:bg-paper" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export function SkillsBank() {
  const { skills, update } = useAppStore();
  const [query, setQuery] = useState("");
  const [filterCat, setFilterCat] = useState<SkillCategory | "ALL">("ALL");
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return skills.filter(s => {
      const catOk = filterCat === "ALL" || s.category === filterCat;
      const textOk = !q || s.name.toLowerCase().includes(q) || s.rulesText.toLowerCase().includes(q) || (s.domain ?? "").toLowerCase().includes(q);
      return catOk && textOk;
    });
  }, [skills, query, filterCat]);

  const save = (s: Skill) => {
    const exists = skills.find(x => x.id === s.id);
    update({ skills: exists ? skills.map(x => x.id === s.id ? s : x) : [...skills, s] });
    setEditing(null); setAdding(false);
  };
  
  const del = (id: string) => {
    update({ skills: skills.filter(x => x.id !== id) });
  }

  return (
    <div className="bg-paper rounded-lg p-4 shadow-paper">
      <div className="flex gap-3 mb-4 flex-wrap">
        <input className="bg-white border-2 border-custom-brown/40 rounded-md text-black placeholder-black/60 px-3 py-2 font-serif text-base font-semibold w-full outline-none flex-1 min-w-[180px] shadow-inner" placeholder="Search — name, domain, rules text…"
          value={query} onChange={e => setQuery(e.target.value)} />
        <select className="bg-white border-2 border-custom-brown/40 rounded-md text-black px-3 py-2 font-serif text-base font-semibold w-auto outline-none" value={filterCat} onChange={e => setFilterCat(e.target.value as SkillCategory | "ALL")}>
          <option value="ALL">All Types</option>
          {(["TAG","SPELL","TALENT","PASSIVE"] as SkillCategory[]).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="bg-button-gradient border border-custom-gold/50 rounded-md text-white px-4 py-2 cursor-pointer font-cinzel text-sm tracking-wider" onClick={() => setAdding(true)}>+ New Skill</button>
      </div>
      {adding && <SkillForm onSave={save} onCancel={() => setAdding(false)} />}
      {filtered.map(s => editing === s.id
        ? <SkillForm key={s.id} initial={s} onSave={save} onCancel={() => setEditing(null)} />
        : <SkillRow key={s.id} skill={s} onEdit={() => setEditing(s.id)} onDelete={() => del(s.id)} />
      )}
      {filtered.length === 0 && !adding && (
        <p className="text-custom-brown/70 text-center p-10 italic">
          No skills found. Create one above.
        </p>
      )}
    </div>
  );
}
