import { useState } from "react";
import type { DamageType, TextFormat } from "../types";
import { v4 as uuidv4 } from "uuid";
import { useAppStore } from "../store/appStore";
import { applyFmt } from "../utils";
import { FormatEditor } from "./shared";

export function DamageTypesBank() {
  const { damageTypes, update } = useAppStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [fmt, setFmt] = useState<TextFormat>({ color: "#c83737", fontFamily: "'Cinzel', serif", bold: true, italic: false, underline: false });
  const [editId, setEditId] = useState<string | null>(null);

  const reset = () => { setAdding(false); setEditId(null); setName(""); setFmt({ color: "#c83737", fontFamily: "'Cinzel', serif", bold: true, italic: false, underline: false }); };

  const save = () => {
    if (!name.trim()) return;
    if (editId) {
      update({ damageTypes: damageTypes.map(t => t.id === editId ? { ...t, name, format: fmt } : t) });
    } else {
      update({ damageTypes: [...damageTypes, { id: uuidv4(), name, format: fmt }] });
    }
    reset();
  };
  
  const del = (id: string) => {
    update({ damageTypes: damageTypes.filter(x => x.id !== id) });
  }

  return (
    <div className="bg-paper rounded-lg p-4 shadow-paper">
      <div className="flex justify-end mb-4">
        <button className="bg-button-gradient border border-custom-gold/50 rounded-md text-white px-4 py-2 cursor-pointer font-cinzel text-sm tracking-wider" onClick={() => setAdding(true)}>+ New Damage Type</button>
      </div>
      {adding && (
        <div className="bg-paper-dark border border-custom-brown/10 rounded-lg p-4 mb-4">
          <div className="mb-3">
            <label className="font-cinzel text-custom-brown text-xs tracking-widest uppercase">Name</label>
            <input className="bg-paper border border-custom-brown/20 rounded-md text-custom-brown px-3 py-2 font-serif text-sm w-full outline-none mt-1" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Fire" />
          </div>
          <FormatEditor fmt={fmt} onChange={setFmt} label="Style" />
          <div className="flex gap-3 mt-4">
            <button className="bg-button-gradient border border-custom-gold/50 rounded-md text-white px-5 py-2 cursor-pointer font-cinzel tracking-wider text-sm flex-1" onClick={save}>Save</button>
            <button className="border border-custom-brown/20 rounded-md text-custom-brown px-4 py-2 cursor-pointer text-xs hover:bg-paper" onClick={reset}>Cancel</button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        {damageTypes.map(t => (
          <div key={t.id} className="bg-paper-dark border border-custom-brown/10 rounded-lg px-4 py-2 flex items-center gap-3">
            <span style={applyFmt(t.format)}>{t.name}</span>
            <button className="border border-custom-brown/20 rounded-md text-custom-brown px-2 py-1 cursor-pointer font-serif text-xs hover:bg-paper" onClick={() => { setEditId(t.id); setName(t.name); setFmt(t.format); setAdding(true); }}>Edit</button>
            <button className="border border-custom-brown/20 rounded-md text-custom-brown px-2 py-0.5 cursor-pointer text-xs hover:bg-paper" onClick={() => del(t.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
