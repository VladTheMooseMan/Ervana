// ============================================================
// PurposeManifest:
//   DocsExport renders each selected NPC card as a nested HTML
//   table that closely mirrors the in-app CardPreview: header
//   with name + type badges on the left and Body/Armor/Traits
//   on the right, then a 2-column body (Base Attacks + W/R/I +
//   Description on the left, Skills on the right). Google Docs
//   pastes this as native tables and preserves inline styling.
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
import type {
  NPCCard, Skill, CreatureType, DamageType, BaseAttack,
  CreatureRef, TextFormat, CardSkillEntry,
} from "../types";
import { useAppStore } from "../store/appStore";
import { freqLabel, emptyTraits, buildRichChunks } from "../utils";

// ------------------------------------------------------------
// esc: minimal HTML escape
// ------------------------------------------------------------
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ------------------------------------------------------------
// fmtToInlineStyle: turn a TextFormat into an inline CSS string
// (Google Docs strips class-based styling; only inline survives.)
// ------------------------------------------------------------
function fmtToInlineStyle(fmt?: TextFormat): string {
  if (!fmt) return "";
  const legacy = new Set(["#e8dcc8", "#c8a96e"]);
  const parts: string[] = [];
  if (fmt.color && !legacy.has(fmt.color.toLowerCase())) parts.push(`color:${fmt.color}`);
  if (fmt.fontFamily) parts.push(`font-family:${fmt.fontFamily}`);
  parts.push(`font-weight:${fmt.bold ? "bold" : "normal"}`);
  parts.push(`font-style:${fmt.italic ? "italic" : "normal"}`);
  if (fmt.underline) parts.push("text-decoration:underline");
  if (fmt.fontSize) parts.push(`font-size:${fmt.fontSize}px`);
  return parts.join(";");
}

// ------------------------------------------------------------
// cssToInlineStyle: convert React CSSProperties into an inline
// CSS string suitable for HTML (handles the shape returned by
// buildRichChunks / applyFmt).
// ------------------------------------------------------------
function cssToInlineStyle(css: React.CSSProperties): string {
  const parts: string[] = [];
  const kebab = (k: string) => k.replace(/[A-Z]/g, m => "-" + m.toLowerCase());
  for (const [k, v] of Object.entries(css)) {
    if (v === undefined || v === null || v === "") continue;
    parts.push(`${kebab(k)}:${String(v)}`);
  }
  return parts.join(";");
}

// ------------------------------------------------------------
// renderRichHTML: mimic buildRichChunks in HTML form so damage
// types get their color and skill references get bolded.
// ------------------------------------------------------------
function renderRichHTML(
  text: string,
  damageTypes: DamageType[],
  skills: Skill[],
): string {
  const chunks = buildRichChunks(text, undefined, damageTypes, skills);
  if (chunks.length === 0) return esc(text).replace(/\n/g, "<br/>");
  return chunks
    .map(c => {
      const style = cssToInlineStyle(c.style);
      const safe = esc(c.text).replace(/\n/g, "<br/>");
      return style ? `<span style="${style}">${safe}</span>` : safe;
    })
    .join("");
}

// ------------------------------------------------------------
// renderRefsHTML: Weak/Resist/Immune list as comma-separated
// styled chunks (damage-type colors, bolded skill names).
// ------------------------------------------------------------
function renderRefsHTML(
  refs: CreatureRef[],
  damageTypes: DamageType[],
  skills: Skill[],
): string {
  return refs
    .map(r => {
      if (r.kind === "damage") {
        const dt = damageTypes.find(d => d.id === r.damageTypeId);
        if (!dt) return "?";
        return `<span style="${fmtToInlineStyle(dt.format)}">${esc(dt.name)}</span>`;
      }
      if (r.kind === "skill") {
        const sk = skills.find(s => s.id === r.skillId);
        if (!sk) return "?";
        const base = fmtToInlineStyle(sk.nameFormat);
        return `<span style="font-weight:bold;${base}">${esc(sk.name)}</span>`;
      }
      return esc(r.text ?? "");
    })
    .join(", ");
}

// ------------------------------------------------------------
// Style constants — inline CSS strings applied throughout.
// ------------------------------------------------------------
const STY = {
  // Outer "card frame"
  frame:
    "border:2px solid #1a1208;border-radius:10px;background:#ffffff;padding:16px;" +
    "font-family:Georgia,serif;color:#000;margin-bottom:16pt;",
  // Header row layout table
  headerTable: "width:100%;border-collapse:collapse;",
  headerLeft:  "vertical-align:top;padding:0;",
  headerRight: "vertical-align:top;padding:0;text-align:right;white-space:nowrap;",
  cardName:
    "font-family:'Cinzel',Georgia,serif;font-size:22pt;font-weight:bold;line-height:1.1;margin:0;color:#000;",
  typeTag: "font-size:9pt;margin-right:4px;",
  statsBlock:
    "font-family:'Cinzel',Georgia,serif;font-size:10pt;line-height:1.25;color:#000;",
  traitPill:
    "display:inline-block;margin-left:6px;font-size:8pt;font-weight:bold;text-transform:uppercase;",
  divider: "border:0;border-top:1px solid rgba(0,0,0,0.4);margin:6px 0 10px;",

  // Body 2-col table
  bodyTable: "width:100%;border-collapse:collapse;table-layout:fixed;",
  colLeft:   "vertical-align:top;padding:0 10px 0 0;width:50%;",
  colRight:  "vertical-align:top;padding:0 0 0 12px;width:50%;border-left:1px solid rgba(0,0,0,0.3);",

  // Section headings (small caps, uppercase)
  sectionHead:
    "font-family:'Cinzel',Georgia,serif;font-size:8pt;font-weight:bold;text-transform:uppercase;" +
    "letter-spacing:0.1em;color:#000;margin:0 0 2px 0;",
  softDivider: "border:0;border-top:1px solid rgba(0,0,0,0.25);margin:6px 0;",

  // Attacks / W-R-I rows
  attackRow: "font-size:9.5pt;line-height:1.25;color:#000;",
  wriRow:    "font-size:9.5pt;line-height:1.35;color:#000;",
  wriLabel:
    "font-family:'Cinzel',Georgia,serif;font-size:8pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.06em;color:#000;",

  // Description
  descText:  "font-size:10pt;line-height:1.4;color:#000;margin:0;",

  // Skills
  skillBlock:  "margin-bottom:8pt;",
  skillHeader: "display:block;margin-bottom:2px;",
  skillName:   "font-size:11pt;font-weight:600;color:#000;letter-spacing:0.02em;",
  skillFreq:   "font-family:'Cinzel',Georgia,serif;font-size:9pt;color:rgba(0,0,0,0.7);margin-left:6px;",
  skillPassive:"font-style:italic;color:#166534;font-size:9pt;margin-left:6px;",
  skillRules:  "font-size:9.5pt;line-height:1.35;color:#000;margin:0;",
};

// ------------------------------------------------------------
// buildCardHTML — the big one.
// ------------------------------------------------------------
function buildCardHTML(
  card: NPCCard,
  skills: Skill[],
  creatureTypes: CreatureType[],
  damageTypes: DamageType[],
): string {
  const cardSkills = card.skills
    .map(e => ({ entry: e, skill: skills.find(s => s.id === e.skillId) }))
    .filter(x => x.skill) as { entry: CardSkillEntry; skill: Skill }[];

  const types = card.creatureTypeIds
    .map(id => creatureTypes.find(c => c.id === id))
    .filter(Boolean) as CreatureType[];

  const traits = card.traits ?? emptyTraits();
  const TRAIT_KEYS = ["str", "dex", "int", "wis", "cha", "con"] as const;
  const activeTraits = TRAIT_KEYS.filter(k => traits[k] !== 0);

  const referenceableSkills = cardSkills.map(cs => cs.skill);
  const baseAttacks: BaseAttack[] = card.baseAttacks ?? [];
  const weaknesses:  CreatureRef[] = types.flatMap(t => t.weaknesses ?? []);
  const resistances: CreatureRef[] = types.flatMap(t => t.resistances ?? []);
  const immunities:  CreatureRef[] = types.flatMap(t => t.immunities ?? []);

  // ── HEADER ─────────────────────────────────────────────
  const typeTags = types
    .map(t => `<span style="${STY.typeTag};${fmtToInlineStyle(t.format)}">[${esc(t.name)}]</span>`)
    .join(" ");

  const traitLine = activeTraits
    .map(k => `<span style="${STY.traitPill}">${k}:${traits[k]}</span>`)
    .join(" ");

  const headerHTML =
    `<table style="${STY.headerTable}"><tbody><tr>` +
    `<td style="${STY.headerLeft}">` +
    `<div style="${STY.cardName}">${esc(card.name || "Unnamed NPC")}</div>` +
    (typeTags ? `<div style="margin-top:2px;">${typeTags}</div>` : "") +
    `</td>` +
    `<td style="${STY.headerRight}">` +
    `<div style="${STY.statsBlock}">Body : ${card.body}</div>` +
    (card.armor !== 0 ? `<div style="${STY.statsBlock}">Armor : ${card.armor}</div>` : "") +
    (traitLine ? `<div style="margin-top:2px;">${traitLine}</div>` : "") +
    `</td></tr></tbody></table>` +
    `<hr style="${STY.divider}"/>`;

  // ── LEFT COLUMN ────────────────────────────────────────
  const leftParts: string[] = [];

  if (baseAttacks.length > 0) {
    const rows = baseAttacks
      .map(a => {
        const dt = damageTypes.find(d => d.id === a.damageTypeId);
        const dmgTypeHTML = dt
          ? `<span style="${fmtToInlineStyle(dt.format)}">${esc(dt.name)}</span>`
          : "";
        return (
          `<div style="${STY.attackRow}">` +
          `<b>${esc(a.weaponName || "(weapon)")}</b> ` +
          `<i style="opacity:0.7;">(${esc(a.attackType)})</i> — ` +
          `${a.damage} ${dmgTypeHTML}` +
          `</div>`
        );
      })
      .join("");
    leftParts.push(
      `<div style="${STY.sectionHead}">Base Attacks</div>${rows}<hr style="${STY.softDivider}"/>`
    );
  }

  const wriParts: string[] = [];
  if (weaknesses.length > 0)
    wriParts.push(
      `<div style="${STY.wriRow}"><span style="${STY.wriLabel}">Weak to:</span> ${renderRefsHTML(weaknesses, damageTypes, skills)}</div>`
    );
  if (resistances.length > 0)
    wriParts.push(
      `<div style="${STY.wriRow}"><span style="${STY.wriLabel}">Resist:</span> ${renderRefsHTML(resistances, damageTypes, skills)}</div>`
    );
  if (immunities.length > 0)
    wriParts.push(
      `<div style="${STY.wriRow}"><span style="${STY.wriLabel}">Immune:</span> ${renderRefsHTML(immunities, damageTypes, skills)}</div>`
    );
  if (wriParts.length) {
    leftParts.push(wriParts.join("") + `<hr style="${STY.softDivider}"/>`);
  }

  if (card.description) {
    leftParts.push(
      `<p style="${STY.descText}">${renderRichHTML(card.description, damageTypes, referenceableSkills)}</p>`
    );
  }

  const leftHTML = leftParts.join("") || "&nbsp;";

  // ── RIGHT COLUMN (skills) ──────────────────────────────
  const skillsHTML = cardSkills.length === 0
    ? `<p style="${STY.descText};opacity:0.5;font-style:italic;">No skills added.</p>`
    : cardSkills
        .map(({ entry, skill }) => {
          const nameStyle = STY.skillName + ";" + fmtToInlineStyle(skill.nameFormat);
          const rulesStyle = STY.skillRules + ";" + fmtToInlineStyle(skill.rulesFormat);
          const freqHTML =
            skill.category === "PASSIVE"
              ? `<span style="${STY.skillPassive}">Passive</span>`
              : `<span style="${STY.skillFreq}">${esc(freqLabel(entry.frequency))}</span>`;
          const otherSkills = referenceableSkills.filter(s => s.id !== skill.id);
          const rulesHTML = renderRichHTML(skill.rulesText, damageTypes, otherSkills);
          return (
            `<div style="${STY.skillBlock}">` +
            `<div style="${STY.skillHeader}">` +
            `<span style="${nameStyle}">${esc(skill.name)}</span>` +
            freqHTML +
            `</div>` +
            `<p style="${rulesStyle}">${rulesHTML}</p>` +
            `</div>`
          );
        })
        .join("");

  const bodyHTML =
    `<table style="${STY.bodyTable}"><tbody><tr>` +
    `<td style="${STY.colLeft}">${leftHTML}</td>` +
    `<td style="${STY.colRight}">${skillsHTML}</td>` +
    `</tr></tbody></table>`;

  return `<div style="${STY.frame}">${headerHTML}${bodyHTML}</div>`;
}

// ------------------------------------------------------------
// buildCardText — plain-text fallback for non-HTML paste
// targets (chat apps, terminals, notes).
// ------------------------------------------------------------
function buildCardText(
  card: NPCCard,
  skills: Skill[],
  creatureTypes: CreatureType[],
  damageTypes: DamageType[],
): string {
  const cardSkills = card.skills
    .map(e => ({ entry: e, skill: skills.find(s => s.id === e.skillId) }))
    .filter(x => x.skill) as { entry: CardSkillEntry; skill: Skill }[];
  const types = card.creatureTypeIds
    .map(id => creatureTypes.find(c => c.id === id))
    .filter(Boolean) as CreatureType[];
  const dtName = (id: string) => damageTypes.find(d => d.id === id)?.name ?? "?";
  const lines: string[] = [];
  lines.push(`=== ${card.name || "(unnamed)"} ===`);
  if (types.length) lines.push(`Type: ${types.map(t => t.name).join(", ")}`);
  lines.push(`Body ${card.body} · Armor ${card.armor}${card.baseDamage ? ` · Base Dmg ${card.baseDamage}` : ""}`);
  if (card.description) lines.push("", card.description);
  const atks = (card.baseAttacks ?? []).map(a =>
    `${a.attackType}: ${a.weaponName || "(weapon)"} — ${a.damage} ${dtName(a.damageTypeId)}`);
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

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
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
              Select cards on the left to preview the exact HTML Google Docs will receive.
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
        Tip: after clicking Copy, paste into Google Docs (Ctrl+V or ⌘+V). Each card becomes its own bordered card mirroring the in-app layout.
      </p>
    </div>
  );
}
