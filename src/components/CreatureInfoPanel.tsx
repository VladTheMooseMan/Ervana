import type { CreatureType, DamageType, Skill, CreatureRef } from "../types";
import { applyFmt, pasteAtCursor } from "../utils";

function refLabel(r: CreatureRef, damageTypes: DamageType[], skills: Skill[]): string {
  if (r.kind === "damage") return damageTypes.find(d => d.id === r.damageTypeId)?.name ?? "?";
  if (r.kind === "skill")  return skills.find(s => s.id === r.skillId)?.name ?? "?";
  return r.text;
}

function buildAttackString(a: any, damageTypes: DamageType[]): string {
  const dt = damageTypes.find(d => d.id === a.damageTypeId)?.name ?? "Unknown";
  return `${a.attackType}: ${a.weaponName} — ${a.damage} ${dt} damage`;
}

function buildWeaknessString(ct: CreatureType, damageTypes: DamageType[], skills: Skill[]): string {
  const parts = [
    ct.weaknesses.length > 0 ? `WEAK to ${ct.weaknesses.map(r => refLabel(r, damageTypes, skills)).join(", ")}` : "",
    ct.resistances.length > 0 ? `RESISTANT to ${ct.resistances.map(r => refLabel(r, damageTypes, skills)).join(", ")}` : "",
    ct.immunities.length > 0 ? `IMMUNE to ${ct.immunities.map(r => refLabel(r, damageTypes, skills)).join(", ")}` : "",
  ].filter(Boolean);
  return parts.join(". ");
}

export function CreatureInfoPanel({ creatureTypes, selectedIds, damageTypes, skills }: {
  creatureTypes: CreatureType[]; selectedIds: string[];
  damageTypes: DamageType[]; skills: Skill[];
}) {
  const selected = selectedIds.map(id => creatureTypes.find(c => c.id === id)).filter(Boolean) as CreatureType[];
  if (selected.length === 0) return null;

  return (
    <div className="bg-paper rounded-lg p-4 shadow-paper mb-4">
      <div className="font-cinzel text-custom-brown text-xs tracking-widest uppercase border-b border-paper-dark pb-2 mb-3">
        Creature Type Reference
        <span className="text-custom-brown/60 text-xs ml-2 tracking-normal normal-case">
          — click a field, then press Paste to insert text at cursor
        </span>
      </div>
      {selected.map(ct => (
        <div key={ct.id} className="mb-4 border-b border-paper-dark last:border-b-0 pb-3 last:pb-0">
          <div className="text-base mb-2" style={applyFmt(ct.format)}>{ct.name}</div>

          {(ct.weaknesses.length > 0 || ct.resistances.length > 0 || ct.immunities.length > 0) && (
            <div className="mb-2">
              <div className="text-custom-brown/70 text-xs tracking-widest font-cinzel mb-1">TRAITS</div>
              {[
                { label: "WEAK TO", items: ct.weaknesses, color: "#c83737" },
                { label: "RESISTANT TO", items: ct.resistances, color: "#377bc8" },
                { label: "IMMUNE TO", items: ct.immunities, color: "#37c88a" },
              ].map(({ label, items, color }) => items.length > 0 && (
                <div key={label} className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-cinzel min-w-[80px]" style={{ color }}>{label}</span>
                  <div className="flex gap-1 flex-wrap">
                    {items.map((r, i) => {
                      const txt = refLabel(r, damageTypes, skills);
                      return (
                        <span key={i} className="flex items-center gap-1">
                          <span className="text-custom-brown text-xs bg-paper-dark px-1 rounded-sm">{txt}</span>
                          <button className="border border-custom-brown/20 rounded-md text-custom-brown px-2 py-0.5 cursor-pointer text-xs hover:bg-paper-dark whitespace-nowrap" onMouseDown={e => { e.preventDefault(); pasteAtCursor(txt); }}>
                            Paste
                          </button>
                        </span>
                      );
                    })}
                  </div>
                  <button className="border border-custom-brown/20 rounded-md text-custom-brown px-2 py-0.5 cursor-pointer text-xs hover:bg-paper-dark whitespace-nowrap" onMouseDown={e => { e.preventDefault(); const full = `${label}: ${items.map(r => refLabel(r, damageTypes, skills)).join(", ")}`; pasteAtCursor(full); }}>
                    Paste All
                  </button>
                </div>
              ))}
              <div className="mt-2">
                <button className="border border-custom-brown/20 rounded-md text-custom-brown px-2 py-0.5 cursor-pointer text-xs hover:bg-paper-dark whitespace-nowrap" onMouseDown={e => { e.preventDefault(); pasteAtCursor(buildWeaknessString(ct, damageTypes, skills)); }}>
                  Paste Full Trait Block
                </button>
              </div>
            </div>
          )}

          {ct.baseAttacks.length > 0 && (
            <div>
              <div className="text-custom-brown/70 text-xs tracking-widest font-cinzel mb-1">BASE ATTACKS</div>
              {ct.baseAttacks.map(a => {
                const str = buildAttackString(a, damageTypes);
                return (
                  <div key={a.id} className="flex items-center gap-2 mb-1">
                    <span className="text-custom-brown text-xs">{str}</span>
                    <button className="border border-custom-brown/20 rounded-md text-custom-brown px-2 py-0.5 cursor-pointer text-xs hover:bg-paper-dark whitespace-nowrap" onMouseDown={e => { e.preventDefault(); pasteAtCursor(str); }}>Paste</button>
                  </div>
                );
              })}
              <button className="border border-custom-brown/20 rounded-md text-custom-brown px-2 py-0.5 cursor-pointer text-xs hover:bg-paper-dark whitespace-nowrap mt-1" onMouseDown={e => { e.preventDefault(); pasteAtCursor(ct.baseAttacks.map(a => buildAttackString(a, damageTypes)).join("\n")); }}>
                Paste All Attacks
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
