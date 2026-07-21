import { useState, useMemo } from "react";
import type { Skill, SkillCategory } from "../types";
import { useAppStore } from "../store/appStore";
import { SkillRow } from "./shared";
import { SkillForm } from "./SkillForm";

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
