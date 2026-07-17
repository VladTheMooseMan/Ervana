import { useState } from "react";
import type { CreatureType, DamageType, Skill, CreatureRef, BaseAttack, AttackType } from "../types";
import { v4 as uuidv4 } from "uuid";
import { useAppStore } from "../store/appStore";
import { applyFmt } from "../utils";
import { FormatEditor } from "./shared";

function CreatureRefEditor({ refEntry, onUpdate, onDelete }: {
  refEntry: CreatureRef;
  onUpdate: (r: CreatureRef) => void; onDelete: () => void;
}) {
  const { damageTypes, skills } = useAppStore();
  return (
    <div className="flex gap-2 items-center mb-1">
      <select value={refEntry.kind} className="bg-paper border border-custom-brown/20 rounded-md text-custom-brown px-2 py-1 font-serif text-xs w-auto outline-none" onChange={e => {
        const k = e.target.value as CreatureRef["kind"];
        if (k === "damage") onUpdate({ kind: "damage", damageTypeId: damageTypes[0]?.id ?? "" });
        else if (k === "skill") onUpdate({ kind: "skill", skillId: skills[0]?.id ?? "" });
        else onUpdate({ kind: "rp", text: "" });
      }}>
        <option value="damage">Damage Type</option>
        <option value="skill">Skill</option>
        <option value="rp">RP Text</option>
      </select>
      {refEntry.kind === "damage" && (
        <select className="bg-paper border border-custom-brown/20 rounded-md text-custom-brown px-2 py-1 font-serif text-xs w-auto outline-none" value={refEntry.damageTypeId} onChange={e => onUpdate({ kind: "damage", damageTypeId: e.target.value })}>
          {damageTypes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      )}
      {refEntry.kind === "skill" && (
        <select className="bg-paper border border-custom-brown/20 rounded-md text-custom-brown px-2 py-1 font-serif text-xs w-auto outline-none" value={refEntry.skillId} onChange={e => onUpdate({ kind: "skill", skillId: e.target.value })}>
          {skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}
      {refEntry.kind === "rp" && (
        <input className="bg-paper border border-custom-brown/20 rounded-md text-custom-brown px-2 py-1 font-serif text-xs w-auto outline-none w-36" value={refEntry.text} onChange={e => onUpdate({ kind: "rp", text: e.target.value })} placeholder="RP description…" />
      )}
      <button className="border border-custom-brown/20 rounded-md text-custom-brown px-2 py-0.5 cursor-pointer text-xs hover:bg-paper" onClick={onDelete}>✕</button>
    </div>
  );
}

function CreatureTypeForm({ initial, onSave, onCancel }: {
  initial?: CreatureType; onSave: (ct: CreatureType) => void; onCancel: () => void;
}) {
  const { damageTypes, skills } = useAppStore();
  const blank: CreatureType = {
    id: uuidv4(), name: "",
    format: { color: "#856d4b", fontFamily: "'Cinzel', serif", bold: false, italic: false, underline: false },
    weaknesses: [], resistances: [], immunities: [], baseAttacks: [],
  };
  const [ct, setCt] = useState<CreatureType>(initial ? { ...initial, weaknesses: [...initial.weaknesses], resistances: [...initial.resistances], immunities: [...initial.immunities], baseAttacks: [...initial.baseAttacks] } : blank);
  const set = (p: Partial<CreatureType>) => setCt(c => ({ ...c, ...p }));

  const addRef = (section: "weaknesses" | "resistances" | "immunities") => {
    const r: CreatureRef = damageTypes.length > 0 ? { kind: "damage", damageTypeId: damageTypes[0].id } : { kind: "rp", text: "" };
    set({ [section]: [...ct[section], r] });
  };
  const updateRef = (section: "weaknesses" | "resistances" | "immunities", i: number, r: CreatureRef) =>
    set({ [section]: ct[section].map((x, idx) => idx === i ? r : x) });
  const deleteRef = (section: "weaknesses" | "resistances" | "immunities", i: number) =>
    set({ [section]: ct[section].filter((_, idx) => idx !== i) });

  const addAttack = () =>
    set({ baseAttacks: [...ct.baseAttacks, { id: uuidv4(), weaponName: "", damage: 3, damageTypeId: damageTypes[0]?.id ?? "", attackType: "Melee" }] });
  const updateAttack = (i: number, p: Partial<BaseAttack>) =>
    set({ baseAttacks: ct.baseAttacks.map((a, idx) => idx === i ? { ...a, ...p } : a) });
  const deleteAttack = (i: number) =>
    set({ baseAttacks: ct.baseAttacks.filter((_, idx) => idx !== i) });

  const sectionBlock = (label: string, colorHex: string, key: "weaknesses" | "resistances" | "immunities") => (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-cinzel text-xs tracking-widest" style={{ color: colorHex }}>{label}</span>
        <button className="border border-custom-brown/20 rounded-md text-custom-brown px-2 py-0.5 cursor-pointer font-serif text-xs hover:bg-paper-dark" onClick={() => addRef(key)}>+ Add</button>
      </div>
      {ct[key].map((r, i) => (
        <CreatureRefEditor key={i} refEntry={r}
          onUpdate={r2 => updateRef(key, i, r2)}
          onDelete={() => deleteRef(key, i)} />
      ))}
    </div>
  );

  return (
    <div className="bg-paper-dark border border-custom-brown/10 rounded-lg p-4 mb-4">
      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="font-cinzel text-custom-brown text-xs tracking-widest uppercase">Name</label>
          <input className="bg-paper border border-custom-brown/20 rounded-md text-custom-brown px-3 py-2 font-serif text-sm w-full outline-none mt-1" value={ct.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. Demon" />
        </div>
      </div>
      <div className="mt-3">
        <label className="font-cinzel text-custom-brown text-xs tracking-widest uppercase">Display Format</label>
        <div className="mt-2"><FormatEditor fmt={ct.format} onChange={f => set({ format: f })} label="Name Style" /></div>
      </div>

      <div className="mt-3">
        <label className="font-cinzel text-custom-brown text-xs tracking-widest uppercase">Weaknesses / Resistances / Immunities</label>
        <div className="mt-2">
          {sectionBlock("WEAKNESSES", "#c83737", "weaknesses")}
          {sectionBlock("RESISTANCES", "#377bc8", "resistances")}
          {sectionBlock("IMMUNITIES", "#37c88a", "immunities")}
        </div>
      </div>

      <div className="mt-3">
        <label className="font-cinzel text-custom-brown text-xs tracking-widest uppercase">Base Attacks</label>
        <div className="mt-2">
          {ct.baseAttacks.map((a, i) => (
            <div key={a.id} className="flex gap-2 items-center mb-2 flex-wrap">
              <select className="bg-paper border border-custom-brown/20 rounded-md text-custom-brown px-2 py-1 font-serif text-xs w-auto outline-none" value={a.attackType} onChange={e => updateAttack(i, { attackType: e.target.value as AttackType })}>
                {(["Melee","Ranged","Phokus"] as AttackType[]).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input className="bg-paper border border-custom-brown/20 rounded-md text-custom-brown px-2 py-1 font-serif text-xs w-auto outline-none w-32" value={a.weaponName} onChange={e => updateAttack(i, { weaponName: e.target.value })} placeholder="Weapon name" />
              <input type="number" className="bg-paper border border-custom-brown/20 rounded-md text-custom-brown px-2 py-1 font-serif text-xs w-auto outline-none w-16" value={a.damage} onChange={e => updateAttack(i, { damage: Number(e.target.value) })} />
              <select className="bg-paper border border-custom-brown/20 rounded-md text-custom-brown px-2 py-1 font-serif text-xs w-auto outline-none" value={a.damageTypeId} onChange={e => updateAttack(i, { damageTypeId: e.target.value })}>
                {damageTypes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <button className="border border-custom-brown/20 rounded-md text-custom-brown px-2 py-0.5 cursor-pointer text-xs hover:bg-paper" onClick={() => deleteAttack(i)}>✕</button>
            </div>
          ))}
          <button className="border border-custom-brown/20 rounded-md text-custom-brown px-2 py-0.5 cursor-pointer font-serif text-xs hover:bg-paper-dark" onClick={addAttack}>+ Add Attack</button>
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button className="bg-button-gradient border border-custom-gold/50 rounded-md text-white px-5 py-2 cursor-pointer font-cinzel tracking-wider text-sm flex-1" onClick={() => { if (!ct.name.trim()) return; onSave(ct); }}>Save Creature Type</button>
        <button className="border border-custom-brown/20 rounded-md text-custom-brown px-4 py-2 cursor-pointer text-xs hover:bg-paper" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export function CreatureTypesBank() {
  const { creatureTypes, update } = useAppStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const save = (ct: CreatureType) => {
    const exists = creatureTypes.find(t => t.id === ct.id);
    update({ creatureTypes: exists ? creatureTypes.map(t => t.id === ct.id ? ct : t) : [...creatureTypes, ct] });
    setEditing(null); setAdding(false);
  };
  
  const del = (id: string) => {
    update({ creatureTypes: creatureTypes.filter(x => x.id !== id) });
  }

  return (
    <div className="bg-paper rounded-lg p-4 shadow-paper">
      <div className="flex justify-end mb-4">
        <button className="bg-button-gradient border border-custom-gold/50 rounded-md text-white px-4 py-2 cursor-pointer font-cinzel text-sm tracking-wider" onClick={() => setAdding(true)}>+ New Creature Type</button>
      </div>
      {adding && <CreatureTypeForm onSave={save} onCancel={() => setAdding(false)} />}
      {creatureTypes.map(t => editing === t.id
        ? <CreatureTypeForm key={t.id} initial={t} onSave={save} onCancel={() => setEditing(null)} />
        : (
          <div key={t.id} className="bg-paper-dark border border-custom-brown/10 rounded-lg p-4 mb-3 flex justify-between items-center">
            <div>
              <span className="text-2xl font-bold" style={applyFmt(t.format)}>{t.name}</span>
              <div className="flex gap-5 mt-2 text-base font-semibold text-[#1a1208]">
                <span>Weaknesses: {t.weaknesses.length}</span>
                <span>Resistances: {t.resistances.length}</span>
                <span>Immunities: {t.immunities.length}</span>
                <span>Attacks: {t.baseAttacks.length}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="border border-custom-brown/40 rounded-md text-[#1a1208] font-bold px-4 py-1.5 cursor-pointer font-serif text-sm hover:bg-paper" onClick={() => setEditing(t.id)}>Edit</button>
              <button className="border border-custom-brown/40 rounded-md text-[#1a1208] font-bold px-3 py-1 cursor-pointer text-sm hover:bg-paper" onClick={() => del(t.id)}>✕</button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
