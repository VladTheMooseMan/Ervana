import { useState, useEffect, useRef, useMemo } from "react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import type { NPCCard, SkillCategory, FrequencyType, Skill, CardTraits, FormatRange } from "../types";
import { useAppStore } from "../store/appStore";
import { emptyCard, defaultFreq, applyFmt, emptyTraits } from "../utils";
import { CardPreview } from "./CardPreview";
import { CreatureInfoPanel } from "./CreatureInfoPanel";
import { SkillRow, FreqEditor, SkillBadge, SkillIcon } from "./shared";
import { SkillForm } from "./SkillForm";
import { RichTextEditor } from "./RichTextEditor";

const TRAIT_KEYS: (keyof CardTraits)[] = ["str", "dex", "int", "wis", "cha", "con"];

export function CardBuilder({ onSave, editCard, onClear }: {
  onSave: (card: NPCCard) => void;
  editCard?: NPCCard; onClear: () => void;
}) {
  const { skills, creatureTypes, damageTypes, cards, saveSkill } = useAppStore();
  const [card, setCard] = useState<NPCCard>(editCard ?? emptyCard());
  const [skillSearch, setSkillSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState<SkillCategory | "ALL">("ALL");
  const [bgPreview, setBgPreview] = useState<string | undefined>(card.backgroundImage);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editCard) { setCard({ ...editCard, traits: editCard.traits ?? emptyTraits() }); setBgPreview(editCard.backgroundImage); }
  }, [editCard?.id]);

  const set = (p: Partial<NPCCard>) => setCard(c => ({ ...c, ...p }));
  const traits = card.traits ?? emptyTraits();
  const setTrait = (k: keyof CardTraits, v: number) => set({ traits: { ...traits, [k]: v } });

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

  const moveSkill = (idx: number, dir: -1 | 1) => {
    const arr = [...card.skills];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    set({ skills: arr });
  };

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

  // Tag suggestions — union of all existing tags across all cards, filtered
  // by what the user is currently typing.
  const allExistingTags = useMemo(() => {
    const set = new Set<string>();
    for (const c of cards) for (const t of c.tags) set.add(t);
    return [...set].sort();
  }, [cards]);

  const tagSuggestions = useMemo(() => {
    const q = tagInput.trim().toLowerCase();
    if (!q) return [];
    return allExistingTags.filter(t =>
      t.toLowerCase().includes(q) && !card.tags.includes(t)
    ).slice(0, 6);
  }, [tagInput, allExistingTags, card.tags]);

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

  const addTag = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    if (card.tags.some(x => x.toLowerCase() === t.toLowerCase())) { setTagInput(""); return; }
    set({ tags: [...card.tags, t] });
    setTagInput("");
  };

  const handleTagKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && card.tags.length) {
      set({ tags: card.tags.slice(0, -1) });
    }
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

          {/* Traits — Str Dex Int Wis Cha Con */}
          <div className="mb-3">
            <label className="text-custom-brown text-xs">Traits</label>
            <div className="grid grid-cols-6 gap-2 mt-1">
              {TRAIT_KEYS.map(k => (
                <div key={k} className="flex flex-col items-center">
                  <span className="font-cinzel text-[10px] font-bold text-black uppercase">{k}</span>
                  <input type="number" className="bg-paper-dark border border-custom-brown/20 rounded-md text-custom-brown px-1 py-1 font-serif text-sm w-full outline-none text-center"
                    value={traits[k]} onChange={e => setTrait(k, Number(e.target.value))} />
                </div>
              ))}
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

          {/* Tags — chip input with suggestions */}
          <div>
            <label className="text-custom-brown text-xs">Tags</label>
            <div className="mt-1 bg-paper-dark border border-custom-brown/20 rounded-md px-2 py-1.5 flex flex-wrap gap-1.5 items-center">
              {card.tags.map(t => (
                <span key={t} className="bg-custom-gold/30 border border-custom-gold rounded-sm px-2 py-0.5 text-xs font-bold text-black flex items-center gap-1">
                  {t}
                  <button className="text-black hover:text-red-800" onClick={() => set({ tags: card.tags.filter(x => x !== t) })}>×</button>
                </span>
              ))}
              <input
                className="flex-1 min-w-[100px] bg-transparent outline-none text-sm text-black placeholder:text-black/50 py-0.5"
                value={tagInput}
                placeholder={card.tags.length ? "" : "Type and press Enter or comma…"}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKey}
                onBlur={() => addTag(tagInput)}
              />
            </div>
            {tagSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                <span className="text-xs text-black/70 italic mr-1">Suggestions:</span>
                {tagSuggestions.map(s => (
                  <button key={s} className="bg-white border border-custom-brown/40 rounded px-2 py-0.5 text-xs text-black hover:bg-custom-gold/30" onClick={() => addTag(s)}>
                    + {s}
                  </button>
                ))}
              </div>
            )}
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

        {/* Description with rich-text formatting */}
        <div className="bg-paper rounded-lg p-4 shadow-paper mb-4">
          <div className="font-cinzel text-custom-brown text-xs tracking-widest uppercase border-b border-paper-dark pb-2 mb-3">Description / Lore</div>
          <RichTextEditor
            value={card.description}
            onChange={v => set({ description: v })}
            ranges={card.descriptionRanges ?? []}
            onRangesChange={r => set({ descriptionRanges: r as FormatRange[] })}
          />
          <p className="text-[11px] text-black/80 italic mt-2 font-serif">
            Reminder — set the creature's Base Damage, Resistances, Immunities & Weaknesses (Creature Types tab).
          </p>
        </div>

        {/* Notes (private, not printed on card) */}
        <div className="bg-paper rounded-lg p-4 shadow-paper mb-4">
          <div className="font-cinzel text-custom-brown text-xs tracking-widest uppercase border-b border-paper-dark pb-2 mb-3">Notes (private — not on card)</div>
          <textarea className="bg-paper-dark border border-custom-brown/20 rounded-md text-custom-brown px-3 py-2 font-serif text-sm w-full outline-none min-h-[70px] resize-y"
            value={card.notes ?? ""}
            onChange={e => set({ notes: e.target.value })}
            placeholder="Behind-the-scenes notes NPCs never see…" />
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
          <div className="flex items-center justify-between border-b border-custom-brown/40 pb-2 mb-3">
            <div className="font-cinzel text-[#2a1608] font-bold text-sm tracking-widest uppercase">Skills</div>
            <button className="bg-button-gradient border border-custom-gold/60 rounded-md text-white px-3 py-1 cursor-pointer font-cinzel text-xs tracking-wider" onClick={() => setShowSkillModal(true)}>+ Create New Skill</button>
          </div>
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

          {/* Selected skills + per-skill frequency + reorder */}
          {card.skills.length > 0 && (
            <div className="mt-4 border-t border-custom-brown/40 pt-3">
              <p className="font-cinzel text-[#2a1608] font-bold text-sm tracking-widest uppercase border-b border-custom-brown/40 pb-2 mb-3">Selected Skills — Order & Frequency</p>
              {card.skills.map((entry, idx) => {
                const sk = skills.find(s => s.id === entry.skillId);
                if (!sk) return null;
                return (
                  <div key={entry.skillId} className="mb-3 bg-white/80 border border-custom-brown/40 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {sk.iconKind && <span className="text-black"><SkillIcon kind={sk.iconKind} size={16} /></span>}
                        <span className="text-sm font-cinzel font-bold text-[#2a1608]" style={applyFmt(sk.nameFormat)}>{sk.name}</span>
                        <SkillBadge category={sk.category} />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          disabled={idx === 0}
                          className="border border-custom-brown/40 rounded-md text-[#2a1608] w-7 h-7 cursor-pointer text-sm hover:bg-paper-dark disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move up"
                          onClick={() => moveSkill(idx, -1)}>▲</button>
                        <button
                          disabled={idx === card.skills.length - 1}
                          className="border border-custom-brown/40 rounded-md text-[#2a1608] w-7 h-7 cursor-pointer text-sm hover:bg-paper-dark disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move down"
                          onClick={() => moveSkill(idx, 1)}>▼</button>
                        <button className="border border-custom-brown/40 rounded-md text-[#2a1608] px-2 py-0.5 cursor-pointer text-xs hover:bg-paper-dark" onClick={() => toggleSkill(entry.skillId)}>✕</button>
                      </div>
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

      {/* ── Create Skill modal ── */}
      <AnimatePresence>
        {showSkillModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowSkillModal(false)}
          >
            <motion.div
              className="bg-paper rounded-lg p-4 shadow-paper w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-3">
                <div className="font-cinzel text-black font-bold text-lg tracking-wider uppercase">Create New Skill</div>
                <button className="border border-custom-brown/40 rounded-md text-black px-3 py-1 cursor-pointer text-sm hover:bg-paper-dark" onClick={() => setShowSkillModal(false)}>✕</button>
              </div>
              <SkillForm
                onSave={async (s: Skill) => {
                  await saveSkill(s);
                  // Auto-add newly created skill to the current card
                  set({ skills: [...card.skills, { skillId: s.id, frequency: defaultFreq(s.category) }] });
                  setShowSkillModal(false);
                }}
                onCancel={() => setShowSkillModal(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
