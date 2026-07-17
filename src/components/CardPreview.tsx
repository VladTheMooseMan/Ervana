import type { NPCCard, Skill, CreatureType } from "../types";
import { useAppStore } from "../store/appStore";
import { applyFmt, freqLabel } from "../utils";

export function CardPreview({ card }: { card: NPCCard }) {
  const { skills, creatureTypes } = useAppStore();
  const cardSkills = card.skills
    .map(e => ({ entry: e, skill: skills.find(s => s.id === e.skillId) }))
    .filter(x => x.skill) as { entry: any; skill: Skill }[];

  const types = card.creatureTypeIds
    .map(id => creatureTypes.find(c => c.id === id)).filter(Boolean) as CreatureType[];

  return (
    <div className="w-[460px] min-h-[600px] border-2 border-custom-brown rounded-xl p-5 font-serif relative shadow-[0_8px_30px_rgba(0,0,0,0.35)] flex-shrink-0 bg-white text-black" style={card.backgroundImage ? { backgroundImage: `url(${card.backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
      {card.backgroundImage && (
        <div className="absolute inset-0 bg-white/85 rounded-xl" />
      )}
      <div className="relative">
        {/* Header */}
        <h1 className="font-cinzel text-3xl font-bold text-black m-0 leading-tight">
          {card.name || "Unnamed NPC"}
        </h1>
        {types.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-1">
            {types.map(t => <span key={t.id} className="text-xs" style={applyFmt(t.format)}>[{t.name}]</span>)}
          </div>
        )}
        <div className="font-cinzel text-black text-sm mt-1.5 border-b border-black/40 pb-2.5">
          Body : {card.body} &nbsp; Armor : {card.armor}
        </div>

        {/* Two-column body */}
        <div className="grid grid-cols-2 gap-4 mt-3.5">
          {/* Left — Lore */}
          <div>
            {card.description && (
              <p className="text-black text-[11.5px] leading-relaxed m-0">
                {card.description}
              </p>
            )}
          </div>

          {/* Right — Skills */}
          <div className="border-l border-black/30 pl-3.5">
            {cardSkills.map(({ entry, skill }) => (
              <div key={skill.id} className="mb-3">
                <div className="flex items-baseline gap-1.5 flex-wrap mb-0.5">
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
                <p className="text-[10.5px] leading-normal m-0 text-black" style={applyFmt(skill.rulesFormat)}>
                  {skill.rulesText}
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
