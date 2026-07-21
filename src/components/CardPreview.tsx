import type { NPCCard, Skill, CreatureType, CardSkillEntry } from "../types";
import { useAppStore } from "../store/appStore";
import { applyFmt, freqLabel, buildRichChunks, emptyTraits } from "../utils";
import { SkillIcon } from "./shared";

// Card dimensions: 4:5 ratio (4in × 5in). Rendered at 96 dpi = 384 × 480.
// Bumped from prior 460×~600 to give more room for text.
const CARD_W = 480;
const CARD_H = 600;

const TRAIT_KEYS = ["str", "dex", "int", "wis", "cha", "con"] as const;

export function CardPreview({ card }: { card: NPCCard }) {
  const { skills, creatureTypes, damageTypes } = useAppStore();
  const cardSkills = card.skills
    .map(e => ({ entry: e, skill: skills.find(s => s.id === e.skillId) }))
    .filter(x => x.skill) as { entry: CardSkillEntry; skill: Skill }[];

  const types = card.creatureTypeIds
    .map(id => creatureTypes.find(c => c.id === id)).filter(Boolean) as CreatureType[];

  const traits = card.traits ?? emptyTraits();
  const activeTraits = TRAIT_KEYS.filter(k => traits[k] !== 0);

  // Only reference skills that are actually attached to this card for
  // auto-bolding in the description.
  const referenceableSkills = cardSkills.map(cs => cs.skill);

  const descChunks = buildRichChunks(card.description, card.descriptionRanges, damageTypes, referenceableSkills);

  return (
    <div
      style={{
        width: `${CARD_W}px`,
        minHeight: `${CARD_H}px`,
        ...(card.backgroundImage ? { backgroundImage: `url(${card.backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined),
      }}
      className="border-2 border-custom-brown rounded-xl p-5 font-serif relative shadow-[0_8px_30px_rgba(0,0,0,0.35)] flex-shrink-0 bg-white text-black"
    >
      {card.backgroundImage && (
        <div className="absolute inset-0 bg-white/85 rounded-xl" />
      )}
      <div className="relative">
        {/* Header row: name/types on left, Body/Armor/Traits on right */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="font-cinzel text-3xl font-bold text-black m-0 leading-tight">
              {card.name || "Unnamed NPC"}
            </h1>
            {types.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-1">
                {types.map(t => <span key={t.id} className="text-xs" style={applyFmt(t.format)}>[{t.name}]</span>)}
              </div>
            )}
          </div>
          <div className="text-right font-cinzel text-black text-[13px] leading-tight whitespace-nowrap">
            <div>Body : {card.body}</div>
            {card.armor !== 0 && <div>Armor : {card.armor}</div>}
            {activeTraits.length > 0 && (
              <div className="flex gap-1.5 justify-end flex-wrap mt-0.5">
                {activeTraits.map(k => (
                  <span key={k} className="text-[11px] font-bold uppercase">{k}:{traits[k]}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="border-b border-black/40 mt-1.5 mb-3" />

        {/* Two-column body */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left — Lore (rich-text) */}
          <div>
            {descChunks.length > 0 && (
              <p className="text-black text-[12px] leading-relaxed m-0">
                {descChunks.map((c, i) => (
                  <span key={i} style={c.style}>{c.text}</span>
                ))}
              </p>
            )}
          </div>

          {/* Right — Skills */}
          <div className="border-l border-black/30 pl-3.5">
            {cardSkills.map(({ entry, skill }) => (
              <div key={skill.id} className="mb-3">
                <div className="flex items-baseline gap-1.5 flex-wrap mb-0.5">
                  {skill.iconKind && (
                    <span className="text-black self-center"><SkillIcon kind={skill.iconKind} size={14} /></span>
                  )}
                  <span className="text-sm tracking-wider text-black font-semibold" style={applyFmt(skill.nameFormat)}>
                    {skill.name}
                  </span>
                  {skill.category !== "PASSIVE" && (
                    <span className="font-cinzel text-black/70 text-xs">
                      {freqLabel(entry.frequency)}
                    </span>
                  )}
                  {skill.category === "PASSIVE" && (
                    <span className="italic text-green-700 text-xs">Passive</span>
                  )}
                </div>
                <p className="text-[11px] leading-normal m-0 text-black" style={applyFmt(skill.rulesFormat)}>
                  {renderRulesWithRefs(skill.rulesText, damageTypes, referenceableSkills, skill.id)}
                </p>
              </div>
            ))}
            {cardSkills.length === 0 && (
              <p className="text-black/50 text-xs italic">No skills added.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Same treatment as description: auto-color damage types + bold skill
// references (skipping the skill's own name so it isn't double-styled).
function renderRulesWithRefs(
  text: string,
  damageTypes: import("../types").DamageType[],
  skills: Skill[],
  ownSkillId: string,
) {
  const otherSkills = skills.filter(s => s.id !== ownSkillId);
  const chunks = buildRichChunks(text, undefined, damageTypes, otherSkills);
  return chunks.map((c, i) => <span key={i} style={c.style}>{c.text}</span>);
}
