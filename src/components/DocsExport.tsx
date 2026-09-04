// ============================================================
// PurposeManifest:
//   DocsExport renders each selected NPC card as a compact HTML
//   table that Google Docs can paste as a native table (keeps
//   structure and most styling).
// FlowChart:
//   [Library cards]  ->  [Select cards]  ->  [Copy button]
//                                              |
//                                              v
//                                     [Clipboard: text/html]
//                                              |
//                                              v
//                                     [Paste in Google Docs]
// ============================================================

import { useMemo, useState } from "react";
import type { NPCCard, Skill, CreatureType, DamageType, BaseAttack } from "../types";
import { useAppStore } from "../store/appStore";
import { freqLabel, emptyTraits } from "../utils";

// ---- HTML escape (defensive) --------------------------------
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---- Build the HTML table for one card ----------------------
// Google Docs accepts <table>/<tr>/<td> as a real table. Inline
// styles survive; class-based styles are dropped. Colors that
// come from damage types are inlined via <span style=...>.
function buildCardHTML(
  card: NPCCard,
  skills: Skill[],
  creatureTypes: CreatureType[],
  damageTypes: DamageType[],
): string {
  const cardSkills = card.skills
    .map(e => ({ entry: e, skill: skills.find(s => s.id === e.skillId) }))
    .filter(x => x.skill) as { entry: typeof card.skills[number]; skill: Skill }[];

  const types = card.creatureTypeIds
    .map(id => creatureTypes.find(c => c.id === id))
    .filter(Boolean) as CreatureType[];

  const traits = card.traits ?? emptyTraits();
  const traitLine = (["str", "dex", "int", "wis", "cha", "con"] as const)
    .filter(k => traits[k] !== 0)
    .map(k => `${k.toUpperCase()} ${traits[k] > 0 ? "+" : ""}${traits[k]}`)
    .join(" · ");

  const dtName = (id: string) => damageTypes.find(d => d.id === id)?.name ?? "?";
  const attackLine = (a: BaseAttack) =>
    `${a.attackType}: ${a.weaponName || "(weapon)"} — ${a.damage} ${dtName(a.damageTypeId)}`;

  const attacks = (card.baseAttacks ?? []).map(attackLine);
  const weaknesses = types.flatMap(t => t.weaknesses ?? []);
  const resistances = types.flatMap(t => t.resistances ?? []);
  const immunities = types.flatMap(t => t.immunities ?? []);

  const refText = (r: { kind: string; damageTypeId?: string; skillId?: string; text?: string }) => {
    if (r.kind === "damage") return dtName(r.damageTypeId!);
    if (r.kind === "skill")  return skills.find(s => s.id === r.skillId)?.name ?? "?";
    return r.text ?? "";
  };

  const tdStyle       = "border:1px solid #856d4b;padding:6px 8px;vertical-align:top;font-family:Georgia,serif;font-size:11pt;";
  const labelStyle    = tdStyle + "background:#e6d5a8;font-weight:bold;font-variant:small-caps;letter-spacing:0.05em;width:22%;";
  const headerStyle   = "border:1px solid #856d4b;padding:8px 10px;background:#856d4b;color:#fff;font-family:'Cinzel',Georgia,serif;font-size:14pt;font-weight:bold;letter-spacing:0.05em;";
  const subHeaderStyle= "border:1px solid #856d4b;padding:6px 10px;background:#c9b382;font-family:'Cinzel',Georgia,serif;font-size:11pt;font-weight:bold;font-variant:small-caps;";

  const rows: string[] = [];

  // Title bar spans both columns
  rows.push(
    `<tr><td colspan="2" style="${headerStyle}">${esc(card.name || "(unnamed)")}` +
    (types.length ? ` <span style="font-size:10pt;font-weight:normal;font-style:italic;">— ${esc(types.map(t => t.name).join(", "))}</span>` : "") +
    `</td></tr>`
  );

  // Core stats line
  const stats = `Body ${card.body} · Armor ${card.armor}` +
    (card.baseDamage ? ` · Base Damage ${card.baseDamage}` : "") +
    (traitLine ? ` · ${traitLine}` : "");
  rows.push(`<tr><td style="${labelStyle}">Stats</td><td style="${tdStyle}">${esc(stats)}</td></tr>`);

  // Description
  if (card.description) {
    rows.push(`<tr><td style="${labelStyle}">Description</td><td style="${tdStyle}">${esc(card.description).replace(/\n/g, "<br/>")}</td></tr>`);
  }

  // Base Attacks
  if (attacks.length > 0) {
    rows.push(
      `<tr><td style="${labelStyle}">Base Attacks</td><td style="${tdStyle}">` +
      attacks.map(a => esc(a)).join("<br/>") +
      `</td></tr>`
    );
  }

  // Weak / Resist / Immune
  const wri: string[] = [];
  if (weaknesses.length)  wri.push(`WEAK to ${weaknesses.map(refText).map(esc).join(", ")}`);
  if (resistances.length) wri.push(`RESISTANT to ${resistances.map(refText).map(esc).join(", ")}`);
  if (immunities.length)  wri.push(`IMMUNE to ${immunities.map(refText).map(esc).join(", ")}`);
  if (wri.length) {
    rows.push(`<tr><td style="${labelStyle}">Traits</td><td style="${tdStyle}">${wri.join("<br/>")}</td></tr>`);
  }

  // Skills — section header + one row per skill
  if (cardSkills.length > 0) {
    rows.push(`<tr><td colspan="2" style="${subHeaderStyle}">Skills</td></tr>`);
    for (const { entry, skill } of cardSkills) {
      const catAndDomain = skill.category + (skill.domain ? ` · ${skill.domain}` : "");
      const freq = freqLabel(entry.frequency);
      const nameLine = `<b>${esc(skill.name)}</b> <i>(${esc(catAndDomain)}${freq ? ` — ${esc(freq)}` : ""})</i>`;
      rows.push(
        `<tr>` +
        `<td style="${tdStyle}">${nameLine}</td>` +
        `<td style="${tdStyle}">${esc(skill.rulesText).replace(/\n/g, "<br/>")}</td>` +
        `</tr>`
      );
    }
  }

  // Notes
  if (card.notes) {
    rows.push(`<tr><td style="${labelStyle}">Notes</td><td style="${tdStyle}">${esc(card.notes).replace(/\n/g, "<br/>")}</td></tr>`);
  }

  const tableStyle = "border-collapse:collapse;width:100%;margin-bottom:14pt;table-layout:fixed;";
  return `<table style="${tableStyle}"><tbody>${rows.join("")}</tbody></table>`;
}

// ---- Plain-text fallback (for editors that don't take HTML) --
function buildCardText(
  card: NPCCard,
  skills: Skill[],
  creatureTypes: CreatureType[],
  damageTypes: DamageType[],
): string {
  const cardSkills = card.skills
    .map(e => ({ entry: e, skill: skills.find(s => s.id === e.skillId) }))
    .filter(x => x.skill) as { entry: typeof card.skills[number]; skill: Skill }[];
  const types = card.creatureTypeIds
    .map(id => creatureTypes.find(c => c.id === id))
    .filter(Boolean) as CreatureType[];
  const dtName = (id: string) => damageTypes.find(d => d.id === id)?.name ?? "?";
  const lines: string[] = [];
  lines.push(`=== ${card.name || "(unnamed)"} ===`);
  if (types.length) lines.push(`Type: ${types.map(t => t.name).join(", ")}`);
  lines.push(`Body ${card.body} · Armor ${card.armor}${card.baseDamage ? ` · Base Dmg ${card.baseDamage}` : ""}`);
  if (card.description) lines.push("", card.description);
  const atks = (card.baseAttacks ?? []).map(a => `${a.attackType}: ${a.weaponName || "(weapon)"} — ${a.damage} ${dtName(a.damageTypeId)}`);
  if (atks.length) { lines.push("", "Base Attacks:"); atks.forEach(a => lines.push("  - " + a)); }
  if (cardSkills.length) {
    lines.push("", "Skills:");
    for (const { entry, skill } of cardSkills) {
      lines.push(`  * ${skill.name} (${skill.category}${skill.domain ? " · " + skill.domain : ""} — ${freqLabel(entry.frequency)})`);
      lines.push("    " + skill.rulesText.replace(/\n/g, "\n    "));
    }
  }
  if (card.notes) lines.push("", "Notes: " + card.notes);
  return lines.join("\n") + "\n\n";
}

// ---- The component -----------------------------------------
export function DocsExport() {
  const { cards, skills, creatureTypes, damageTypes } = useAppStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<{ kind: "idle" | "ok" | "err"; msg: string }>({ kind: "idle", msg: "" });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return cards.filter(c => !q || c.name.toLowerCase().includes(q) || c.tags.some(t => t.toLowerCase().includes(q)));
  }, [cards, search]);

  const toggle = (id: string) => setSelected(s => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const selectAll = () => setSelected(new Set(filtered.map(c => c.id)));
  const clearSel  = () => setSelected(new Set());

  const selectedCards = filtered.filter(c => selected.has(c.id));

  const handleCopy = async () => {
    if (selectedCards.length === 0) return;
    const html = `<div>${selectedCards.map(c => buildCardHTML(c, skills, creatureTypes, damageTypes)).join("")}</div>`;
    const text = selectedCards.map(c => buildCardText(c, skills, creatureTypes, damageTypes)).join("");
    try {
      if (navigator.clipboard && typeof (window as any).ClipboardItem !== "undefined") {
        const item = new (window as any).ClipboardItem({
          "text/html":  new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        });
        await navigator.clipboard.write([item]);
      } else {
        // Fallback for older browsers — plain text only
        await navigator.clipboard.writeText(text);
      }
      setStatus({ kind: "ok", msg: `Copied ${selectedCards.length} card${selectedCards.length === 1 ? "" : "s"} to clipboard.` });
    } catch (e: any) {
      setStatus({ kind: "err", msg: `Copy failed: ${e?.message ?? String(e)}` });
    }
  };

  if (cards.length === 0) {
    return (
      <div className="text-center p-16 bg-paper rounded-lg shadow-paper">
        <div className="text-5xl mb-3">📋</div>
        <p className="font-cinzel text-[#2a1608] font-semibold">Your library is empty. Save some NPC cards first.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Controls */}
      <div className="bg-paper rounded-lg shadow-paper p-4 mb-4 flex flex-wrap gap-3 items-center">
        <input
          className="bg-white border border-custom-brown/50 rounded-md text-[#1a1208] placeholder:text-[#5a4a30]/70 px-3 py-2 font-serif text-sm outline-none flex-1 min-w-[200px]"
          placeholder="Search cards…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button
          onClick={selectAll}
          className="border border-custom-brown/50 rounded-md text-[#2a1608] px-3 py-2 cursor-pointer font-serif text-xs font-semibold hover:bg-paper-dark"
        >
          Select All
        </button>
        <button
          onClick={clearSel}
          disabled={selected.size === 0}
          className="border border-custom-brown/50 rounded-md text-[#2a1608] px-3 py-2 cursor-pointer font-serif text-xs font-semibold hover:bg-paper-dark disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Clear
        </button>
        <button
          onClick={handleCopy}
          disabled={selectedCards.length === 0}
          className="bg-button-gradient border border-custom-gold/60 rounded-md text-white px-5 py-2 cursor-pointer font-cinzel tracking-wider text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          📋 Copy {selectedCards.length > 0 ? `(${selectedCards.length})` : ""}
        </button>
      </div>

      {/* Status message */}
      {status.kind !== "idle" && (
        <div
          className={
            "px-3 py-2 rounded-md mb-4 font-serif text-sm " +
            (status.kind === "ok"
              ? "bg-green-100 border border-green-500 text-green-900"
              : "bg-red-100 border border-red-500 text-red-900")
          }
        >
          {status.msg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card picker */}
        <div className="bg-paper rounded-lg shadow-paper p-4">
          <p className="font-cinzel text-[#2a1608] font-bold text-sm tracking-widest uppercase border-b border-custom-brown/40 pb-2 mb-3">
            Library
          </p>
          <div className="max-h-[520px] overflow-y-auto pr-2 -mr-2">
            {filtered.map(card => {
              const checked = selected.has(card.id);
              return (
                <label
                  key={card.id}
                  className={
                    "flex items-center justify-between bg-white/80 border rounded-md px-3 py-2 mb-2 cursor-pointer " +
                    (checked ? "border-custom-gold" : "border-custom-brown/40")
                  }
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(card.id)}
                      className="w-4 h-4 accent-[#8a5a2a]"
                    />
                    <div>
                      <div className="font-cinzel font-bold text-[#1a1208] text-sm">{card.name || "(unnamed)"}</div>
                      <div className="text-[#2a1608] text-xs font-semibold">
                        Body {card.body} · Armor {card.armor} · {card.skills.length} skills
                      </div>
                    </div>
                  </div>
                </label>
              );
            })}
            {filtered.length === 0 && (
              <p className="italic text-center text-[#2a1608]/70 p-4">No matches.</p>
            )}
          </div>
        </div>

        {/* Live HTML preview of what will be copied */}
        <div className="bg-paper rounded-lg shadow-paper p-4">
          <p className="font-cinzel text-[#2a1608] font-bold text-sm tracking-widest uppercase border-b border-custom-brown/40 pb-2 mb-3">
            Preview ({selectedCards.length})
          </p>
          {selectedCards.length === 0 ? (
            <p className="italic text-center text-[#2a1608]/70 p-6">
              Select cards on the left to preview the exact table Google Docs will receive.
            </p>
          ) : (
            <div
              className="bg-white p-3 rounded max-h-[520px] overflow-y-auto text-black"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{
                __html: selectedCards
                  .map(c => buildCardHTML(c, skills, creatureTypes, damageTypes))
                  .join(""),
              }}
            />
          )}
        </div>
      </div>

      <p className="text-[#f5e3b8] text-xs italic mt-3 font-serif">
        Tip: after clicking Copy, paste into Google Docs (Ctrl+V or ⌘+V). Each card becomes its own table.
      </p>
    </div>
  );
}
