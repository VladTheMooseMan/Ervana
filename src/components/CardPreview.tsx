import type { NPCCard, Skill, CreatureType, CardSkillEntry, DamageType, CreatureRef, BaseAttack } from "../types";
import { useAppStore } from "../store/appStore";
import { applyFmt, freqLabel, buildRichChunks, emptyTraits } from "../utils";
import { SkillIcon } from "./shared";

// Card dimensions: 4:5 ratio (portrait) or 3:2 (wide 3-col).
// Base render size is at 96dpi so 1in = 96px.
const CARD_W = 480;
const CARD_H = 600;
// Landscape (wide) mode used when user opts in to 3 columns.
const CARD_W_WIDE = 720;

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

  // Base Attacks now live on the card itself (per-NPC).
  const baseAttacks: BaseAttack[] = card.baseAttacks ?? [];
  // Weak/Resist/Immune still aggregate from selected creature types.
  const weaknesses: CreatureRef[] = types.flatMap(t => t.weaknesses ?? []);
  const resistances: CreatureRef[] = types.flatMap(t => t.resistances ?? []);
  const immunities: CreatureRef[] = types.flatMap(t => t.immunities ?? []);

  // Layout: default 2 columns, 3 columns when user toggles.
  const useThree = !!card.useThreeColumns;
  // Split skills into two roughly-even columns when in 3-column mode.
  const skillCols: (typeof cardSkills)[] = useThree ? (() => {
    const total = cardSkills.reduce((a, cs) => a + cs.skill.rulesText.length + 40, 0);
    const target = total / 2;
    let running = 0;
    const left: typeof cardSkills = [];
    const right: typeof cardSkills = [];
    for (const cs of cardSkills) {
      if (running < target) { left.push(cs); running += cs.skill.rulesText.length + 40; }
      else right.push(cs);
    }
    if (right.length === 0 && left.length > 1) right.unshift(left.pop()!);
    return [left, right];
  })() : [cardSkills];

  return (
    <div
      style={{
        width: `${useThree ? CARD_W_WIDE : CARD_W}px`,
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

        {/* Body: 2 cols (default) or 3 cols (opt-in: lore + skills-A + skills-B) */}
        <div className={useThree ? "grid grid-cols-3 gap-4" : "grid grid-cols-2 gap-4"}>
          {/* Left — Base Attacks, Weak/Resist/Immune, then Lore */}
          <div>
            {baseAttacks.length > 0 && (
              <div className="mb-2 pb-2 border-b border-black/25">
                <div className="font-cinzel text-[10px] font-bold text-black uppercase tracking-widest mb-0.5">Base Attacks</div>
                {baseAttacks.map(a => {
                  const dt = damageTypes.find(d => d.id === a.damageTypeId);
                  return (
                    <div key={a.id} className="text-[11px] leading-tight text-black">
                      <span className="font-semibold">{a.weaponName}</span>{" "}
                      <span className="italic text-black/70">({a.attackType})</span>{" "}
                      — {a.damage} <span style={dt ? applyFmt(dt.format) : undefined}>{dt?.name ?? ""}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {(weaknesses.length + resistances.length + immunities.length) > 0 && (
              <div className="mb-2 pb-2 border-b border-black/25 text-[11px] leading-snug text-black">
                {weaknesses.length > 0 && (
                  <div><span className="font-cinzel font-bold uppercase text-[10px] tracking-wider">Weak to:</span> {renderRefs(weaknesses, damageTypes, skills)}</div>
                )}
                {resistances.length > 0 && (
                  <div><span className="font-cinzel font-bold uppercase text-[10px] tracking-wider">Resist:</span> {renderRefs(resistances, damageTypes, skills)}</div>
                )}
                {immunities.length > 0 && (
                  <div><span className="font-cinzel font-bold uppercase text-[10px] tracking-wider">Immune:</span> {renderRefs(immunities, damageTypes, skills)}</div>
                )}
              </div>
            )}
            {descChunks.length > 0 && (
              <p className="text-black text-[12px] leading-relaxed m-0">
                {descChunks.map((c, i) => (
                  <span key={i} style={c.style}>{c.text}</span>
                ))}
              </p>
            )}
          </div>

          {/* Right — Skills (1 col portrait, 2 cols landscape) */}
          {skillCols.map((col, ci) => (
            <div key={ci} className="border-l border-black/30 pl-3.5">
              {col.map(({ entry, skill }) => (
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
              {ci === 0 && col.length === 0 && (
                <p className="text-black/50 text-xs italic">No skills added.</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Render Weak/Resist/Immune CreatureRef list as comma-separated inline chunks
// with each damage type formatted per its style and skill references bolded.
function renderRefs(refs: CreatureRef[], damageTypes: DamageType[], skills: Skill[]) {
  return refs.map((r, i) => {
    let node: React.ReactNode = null;
    if (r.kind === "damage") {
      const dt = damageTypes.find(d => d.id === r.damageTypeId);
      node = dt ? <span style={applyFmt(dt.format)}>{dt.name}</span> : null;
    } else if (r.kind === "skill") {
      const sk = skills.find(s => s.id === r.skillId);
      node = sk ? <span style={{ fontWeight: "bold", ...applyFmt(sk.nameFormat) }}>{sk.name}</span> : null;
    } else {
      node = <span>{r.text}</span>;
    }
    return (
      <span key={i}>
        {node}
        {i < refs.length - 1 ? ", " : ""}
      </span>
    );
  });
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
