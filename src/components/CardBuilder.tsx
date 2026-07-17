import { useState, useEffect, useRef, useMemo } from "react";
import clsx from "clsx";
import type { NPCCard, SkillCategory, FrequencyType } from "../types";
import { useAppStore } from "../store/appStore";
import { emptyCard, defaultFreq, applyFmt } from "../utils";
import { CardPreview } from "./CardPreview";
import { CreatureInfoPanel } from "./CreatureInfoPanel";
import { SkillRow, FreqEditor, SkillBadge } from "./shared";

export function CardBuilder({ onSave, editCard, onClear }: {
  onSave: (card: NPCCard) => void;
  editCard?: NPCCard; onClear: () => void;
}) {
  const { skills, creatureTypes, damageTypes } = useAppStore();
  const [card, setCard] = useState<NPCCard>(editCard ?? emptyCard());
  const [skillSearch, setSkillSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState<SkillCategory | "ALL">("ALL");
  const [bgPreview, setBgPreview] = useState<string | undefined>(card.backgroundImage);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editCard) { setCard({ ...editCard }); setBgPreview(editCard.backgroundImage); }
  }, [editCard?.id]);

  const set = (p: Partial<NPCCard>) => setCard(c => ({ ...c, ...p }));

  const toggleSkill = (skillId: string) => {
    const exists = card.skills.find(e => e.skillId === skillId);
    if (exists) {
      set({ skills: card.skills.filter(e => e.skillId !== skillId) });
    } else {
      const skill = skills.find(s => s.id === skillId);
      set({ skills: [...card.skills, { skillId, frequency: defaultFreq(skill?.category ?? "TALENT") }] });
    }
  };

  const updateFreq = (skillId: string, frequency: FrequencyType) =>
    set({ skills: card.skills.map(e => e.skillId === skillId ? { ...e, frequency } : e) });

  const toggleCreatureType = (id: string) =>
    set({ creatureTypeIds: card.creatureTypeIds.includes(id)
      ? card.creatureTypeIds.filter(x => x !== id)
      : [...card.creatureTypeIds, id] });

  const filteredSkills = useMemo(() => {
      const q = skillSearch.toLowerCase();
      return skills.filter(s => {
      const catOk = skillFilter === "ALL" || s.category === skillFilter;
      const textOk = !q || s.name.toLowerCase().includes(q) || s.rulesText.toLowerCase().includes(q) || (s.domain ?? "").toLowerCase().includes(q);
      return catOk && textOk;
    });
  }, [skills, skillSearch, skillFilter]);

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setBgPreview(url); set({ backgroundImage: url });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex gap-6 items-start flex-wrap">
      {/* ── Left: Form ── */}
      <div className="flex-1 min-w-[340px] max-w-[540px]">

        {/* Identity */}
        <div className="bg-paper rounded-lg p-4 shadow-paper mb-4">
          <div className="font-cinzel text-custom-brown text-xs tracking-widest uppercase border-b border-paper-dark pb-2 mb-3">Identity</div>
          <div className="mb-3">
            <label className="text-custom-brown text-xs">NPC Name</label>
            <input className="bg-paper-dark border border-custom-brown/20 rounded-md text-custom-brown px-3 py-2 font-serif text-sm w-full outline-none mt-1" value={card.name}
              onChange={e => set({ name: e.target.value })} placeholder="e.g. Snail Man" />
          </div>
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <label className="text-custom-brown text-xs">Body</label>
              <input type="number" className="bg-paper-dark border border-custom-brown/20 rounded-md text-custom-brown px-3 py-2 font-serif text-sm w-full outline-none mt-1" value={card.body}
                onChange={e => set({ body: Number(e.target.value) })} />
            </div>
            <div className="flex-1">
              <label className="text-custom-brown text-xs">Armor</label>
              <input type="number" className="bg-paper-dark border border-custom-brown/20 rounded-md text-custom-brown px-3 py-2 font-serif text-sm w-full outline-none mt-1" value={card.armor}
                onChange={e => set({ armor: Number(e.target.value) })} />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-custom-brown text-xs">Creature Types</label>
            <div className="flex flex-wrap gap-2 mt-2">
                {creatureTypes.map(t => (
                <button key={t.id} onClick={() => toggleCreatureType(t.id)} className={clsx(
                  "border rounded px-3 py-1 cursor-pointer text-xs transition-colors",
                  {
                    "border-custom-gold bg-custom-gold/20 text-custom-brown": card.creatureTypeIds.includes(t.id),
                    "border-paper-dark bg-paper-dark hover:bg-paper-dark/80 text-custom-brown/70": !card.creatureTypeIds.includes(t.id),
                  }
                )} style={applyFmt(t.format)}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-custom-brown text-xs">Tags (comma-separated)</label>
            <input className="bg-paper-dark border border-custom-brown/20 rounded-md text-custom-brown px-3 py-2 font-serif text-sm w-full outline-none mt-1" value={card.tags.join(", ")}
              onChange={e => set({ tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })}
              placeholder="e.g. underdark, empire, elite" />
          </div>
        </div>

        {/* Creature Info Panel */}
        {card.creatureTypeIds.length > 0 && (
          <CreatureInfoPanel
            creatureTypes={creatureTypes}
            selectedIds={card.creatureTypeIds}
            damageTypes={damageTypes}
            skills={skills}
          />
        )}

        {/* Description */}
        <div className="bg-paper rounded-lg p-4 shadow-paper mb-4">
          <div className="font-cinzel text-custom-brown text-xs tracking-widest uppercase border-b border-paper-dark pb-2 mb-3">Description / Lore</div>
          <textarea className="bg-paper-dark border border-custom-brown/20 rounded-md text-custom-brown px-3 py-2 font-serif text-sm w-full outline-none min-h-[120px] resize-y" value={card.description}
            onChange={e => set({ description: e.target.value })}
            placeholder="Background, tactics, roleplay notes…" />
        </div>

        {/* Background image */}
        <div className="bg-paper rounded-lg p-4 shadow-paper mb-4">
          <div className="font-cinzel text-custom-brown text-xs tracking-widest uppercase border-b border-paper-dark pb-2 mb-3">Background Image (transparent PNG / WebP)</div>
          <div className="flex gap-3 items-center">
            <button className="bg-button-gradient border border-custom-gold/50 rounded-md text-white px-4 py-2 cursor-pointer font-cinzel text-sm tracking-wider" onClick={() => fileRef.current?.click()}>Upload Image</button>
            {bgPreview && <button className="border border-custom-brown/20 rounded-md text-custom-brown px-3 py-1 cursor-pointer text-xs hover:bg-paper-dark" onClick={() => { setBgPreview(undefined); set({ backgroundImage: undefined }); }}>Remove</button>}
            <input ref={fileRef} type="file" accept="image/png,image/webp,image/svg+xml" className="hidden" onChange={handleBgUpload} />
          </div>
          {bgPreview && <img src={bgPreview} alt="BG preview" className="mt-3 max-w-full max-h-[100px] object-contain rounded-md border border-paper-dark" />}
        </div>

        {/* Skills picker */}
        <div className="bg-paper rounded-lg p-4 shadow-paper mb-4">
          <div className="font-cinzel text-[#2a1608] font-bold text-sm tracking-widest uppercase border-b border-custom-brown/40 pb-2 mb-3">Skills</div>
          <div className="flex gap-2 mb-3 flex-wrap">
            <input className="bg-white border border-custom-brown/40 rounded-md text-[#1a1208] placeholder:text-[#5a4a30]/70 px-3 py-2 font-serif text-sm w-full outline-none flex-1 min-w-[150px]" placeholder="Search skills…"
              value={skillSearch} onChange={e => setSkillSearch(e.target.value)} />
            <select className="bg-white border border-custom-brown/40 rounded-md text-[#1a1208] px-2 py-1 font-serif text-xs w-auto outline-none" value={skillFilter} onChange={e => setSkillFilter(e.target.value as SkillCategory | "ALL")}>
              <option value="ALL">All Categories</option>
              {(['TAG','SPELL','TALENT','PASSIVE'] as SkillCategory[]).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="max-h-[260px] overflow-y-auto pr-2 -mr-2">
            {filteredSkills.map(s => (
              <SkillRow key={s.id} skill={s} selectable
                selected={card.skills.some(e => e.skillId === s.id)}
                onToggle={() => toggleSkill(s.id)} />
            ))}
            {filteredSkills.length === 0 && (
              <p className="text-[#1a1208]/70 italic text-center p-5">
                No skills found. Add skills in the Skills Bank.
              </p>
            )}
          </div>

          {/* Selected skills + per-skill frequency */}
          {card.skills.length > 0 && (
            <div className="mt-4 border-t border-custom-brown/40 pt-3">
              <p className="font-cinzel text-[#2a1608] font-bold text-sm tracking-widest uppercase border-b border-custom-brown/40 pb-2 mb-3">Selected Skills — Set Frequency</p>
              {card.skills.map(entry => {
                const sk = skills.find(s => s.id === entry.skillId);
                if (!sk) return null;
                return (
                  <div key={entry.skillId} className="mb-3 bg-white/80 border border-custom-brown/40 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-cinzel font-bold text-[#2a1608]" style={applyFmt(sk.nameFormat)}>{sk.name}</span>
                        <SkillBadge category={sk.category} />
                      </div>
                      <button className="border border-custom-brown/40 rounded-md text-[#2a1608] px-2 py-0.5 cursor-pointer text-xs hover:bg-paper-dark" onClick={() => toggleSkill(entry.skillId)}>✕</button>
                    </div>
                    {sk.category !== "PASSIVE" ? (
                      <FreqEditor freq={entry.frequency} onChange={f => updateFreq(entry.skillId, f)} />
                    ) : (
                      <span className="text-green-700 text-xs italic font-semibold">Passive — no frequency</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button className="bg-button-gradient border border-custom-gold/50 rounded-md text-white px-5 py-2 cursor-pointer font-cinzel tracking-wider text-base flex-1" onClick={() => { if (!card.name.trim()) return; onSave({ ...card, updatedAt: Date.now() }); onClear(); }}>
            {editCard ? "Update Card" : "Save Card"}
          </button>
          <button className="border border-custom-brown/20 rounded-md text-custom-brown px-4 py-2 cursor-pointer text-xs hover:bg-paper-dark" onClick={onClear}>Clear</button>
        </div>
      </div>

      {/* ── Right: preview ── */}
      <div className="sticky top-24">
        <div className="inline-block font-cinzel text-sm text-[#f5e3b8] font-bold mb-5 tracking-wider px-3 py-1 rounded bg-black/50 border border-custom-gold/50">
          Live Preview
        </div>
        <CardPreview card={card} />
      </div>
    </div>
  );
}
