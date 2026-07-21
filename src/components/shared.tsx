import { useState, useEffect, useRef } from "react";
import { HexColorPicker } from "react-colorful";
import type { TextFormat, FrequencyType, SkillCategory, Skill, SkillIcon as SkillIconType } from "../types";
import { applyFmt, FONT_OPTS } from "../utils";

export function ColorPopover({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen(o => !o)} className="w-6 h-6 rounded border-2 border-[#4a3f2e] cursor-pointer" style={{ background: value }} />
      {open && (
        <div className="absolute z-50 top-8 left-0 bg-[#1a1410] border border-[#4a3f2e] rounded-lg p-2">
          <HexColorPicker color={value} onChange={onChange} />
          <input className="mt-1.5 w-full bg-custom-dark-brown border border-[#4a3f2e] rounded text-custom-tan px-1.5 py-0.5 font-mono text-xs" value={value} onChange={e => onChange(e.target.value)} />
        </div>
      )}
    </div>
  );
}

export function FormatEditor({ fmt, onChange, label }: { fmt: TextFormat; onChange: (f: TextFormat) => void; label: string }) {
  const set = (p: Partial<TextFormat>) => onChange({ ...fmt, ...p });
  return (
    <div className="flex items-center gap-2 flex-wrap py-1">
      <span className="text-custom-dark-tan text-xs min-w-[70px]">{label}</span>
      <ColorPopover value={fmt.color} onChange={c => set({ color: c })} />
      <select value={fmt.fontFamily} onChange={e => set({ fontFamily: e.target.value })} className="bg-custom-dark-brown border border-[#4a3f2e] rounded-md text-custom-tan px-1.5 py-0.5 font-serif text-xs w-auto outline-none">
        {FONT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <button onClick={() => set({ bold: !fmt.bold })} className={`border border-[#4a3f2e] rounded w-7 h-7 cursor-pointer text-sm font-bold ${fmt.bold ? "bg-[#4a3f2e]" : "bg-[#1a1410]"}`}>B</button>
      <button onClick={() => set({ italic: !fmt.italic })} className={`border border-[#4a3f2e] rounded w-7 h-7 cursor-pointer text-sm italic ${fmt.italic ? "bg-[#4a3f2e]" : "bg-[#1a1410]"}`}>I</button>
      <button onClick={() => set({ underline: !fmt.underline })} className={`border border-[#4a3f2e] rounded w-7 h-7 cursor-pointer text-sm underline ${fmt.underline ? "bg-[#4a3f2e]" : "bg-[#1a1410]"}`}>U</button>
    </div>
  );
}

export function FreqEditor({ freq, onChange }: { freq: FrequencyType; onChange: (f: FrequencyType) => void }) {
  const kind = freq.kind;
  const fieldCls = "bg-white border border-[#4a2f18] rounded-md text-[#1a1208] px-2 py-1 font-serif text-xs outline-none";
  return (
    <div className="flex gap-1.5 items-center flex-wrap">
      <select value={kind} className={fieldCls} onChange={e => {
        const k = e.target.value as FrequencyType["kind"];
        if (k === "uses")    onChange({ kind: "uses", count: 3 });
        else if (k === "con") onChange({ kind: "con", seconds: 10 });
        else if (k === "cd")  onChange({ kind: "cd", seconds: 3 });
        else if (k === "other") onChange({ kind: "other", text: "" });
        else onChange({ kind: "passive" });
      }}>
        <option value="uses">x [uses]</option>
        <option value="con">x [n] sec Con</option>
        <option value="cd">x [n] sec CD</option>
        <option value="other">Other</option>
        <option value="passive">Passive</option>
      </select>
      {kind === "uses" && (
        <input type="number" className={`${fieldCls} w-16`} value={(freq as { kind: "uses"; count: number }).count} onChange={e => onChange({ kind: "uses", count: Number(e.target.value) })} />
      )}
      {kind === "con" && (
        <>
          <input type="number" className={`${fieldCls} w-16`} value={(freq as { kind: "con"; seconds: number }).seconds} onChange={e => onChange({ kind: "con", seconds: Number(e.target.value) })} />
          <span className="text-[#1a1208] text-xs font-semibold">sec Con</span>
        </>
      )}
      {kind === "cd" && (
        <>
          <input type="number" className={`${fieldCls} w-16`} value={(freq as { kind: "cd"; seconds: number }).seconds} onChange={e => onChange({ kind: "cd", seconds: Number(e.target.value) })} />
          <span className="text-[#1a1208] text-xs font-semibold">sec CD</span>
        </>
      )}
      {kind === "other" && (
        <input className={`${fieldCls} w-48`} value={(freq as { kind: "other"; text: string }).text} onChange={e => onChange({ kind: "other", text: e.target.value })} placeholder="Custom frequency…" />
      )}
    </div>
  );
}

export function SkillBadge({ category }: { category: SkillCategory }) {
  const colors: Record<SkillCategory, string> = {
    TAG: "#78909c", SPELL: "#7e57c2", TALENT: "#c8a96e", PASSIVE: "#5a8a5a",
  };
  return (
    <span className="text-[9px] font-cinzel tracking-wider border rounded-sm px-1.5 py-0.5 ml-1.5 align-middle" style={{ color: colors[category], borderColor: colors[category] }}>
      {category}
    </span>
  );
}

// ── Skill icon ──────────────────────────────────────────────────────────────
// sword = Attack, shield = Defense, star = Other. Rendered as inline SVG so
// it inherits currentColor and scales cleanly.
export function SkillIcon({ kind, size = 16, title }: { kind: SkillIconType; size?: number; title?: string }) {
  const stroke = "currentColor";
  const strokeWidth = 1.8;
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke, strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const label = title ?? (kind === "sword" ? "Attack" : kind === "shield" ? "Defense" : "Other");
  if (kind === "sword") {
    return (
      <svg {...common} aria-label={label}>
        <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
        <path d="M13 19l6-6" />
        <path d="M16 16l4 4" />
        <path d="M19 21l2-2" />
      </svg>
    );
  }
  if (kind === "shield") {
    return (
      <svg {...common} aria-label={label}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-label={label}>
      <polygon points="12 2 15 9 22 9.3 16.5 14 18.4 21 12 17 5.6 21 7.5 14 2 9.3 9 9" />
    </svg>
  );
}

export function SkillIconPicker({ value, onChange }: { value: SkillIconType; onChange: (v: SkillIconType) => void }) {
  const opts: { v: SkillIconType; label: string }[] = [
    { v: "sword",  label: "Attack" },
    { v: "shield", label: "Defense" },
    { v: "star",   label: "Other" },
  ];
  return (
    <div className="flex gap-1.5">
      {opts.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)} title={o.label}
          className={`border rounded-md px-2 py-1 cursor-pointer flex items-center gap-1 text-xs font-bold ${value === o.v ? "bg-custom-gold/40 border-custom-gold text-black" : "bg-white/70 border-custom-brown/40 text-black"}`}>
          <SkillIcon kind={o.v} size={14} /> {o.label}
        </button>
      ))}
    </div>
  );
}

export function SkillRow({
  skill, onEdit, onDelete, selectable, selected, onToggle,
}: {
  skill: Skill; onEdit?: () => void; onDelete?: () => void;
  selectable?: boolean; selected?: boolean; onToggle?: () => void;
}) {
  return (
    <div onClick={selectable ? onToggle : undefined} className={`skill-row border rounded-lg p-3.5 mb-2 transition-colors ${selectable ? "cursor-pointer" : "cursor-default"} ${selected ? "bg-custom-gold/20 border-custom-gold" : "bg-paper border-custom-brown/30 hover:bg-paper-dark/60"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          {skill.iconKind && (
            <span className="text-[#2a1608]"><SkillIcon kind={skill.iconKind} size={18} /></span>
          )}
          <span className="text-xl font-cinzel font-bold text-[#2a1608] skill-name" style={applyFmt(skill.nameFormat)}>{skill.name}</span>
          <SkillBadge category={skill.category} />
          {skill.domain && (
            <span className="text-custom-dark-tan text-sm italic">[{skill.domain}]</span>
          )}
        </div>
        {(onEdit || onDelete) && (
          <div className="flex gap-1.5">
            {onEdit && (
              <button className="bg-paper-dark border border-custom-brown/40 rounded-md text-custom-brown px-3 py-1 cursor-pointer font-serif text-xs hover:bg-custom-tan/50" onClick={e => { e.stopPropagation(); onEdit(); }}>Edit</button>
            )}
            {onDelete && (
              <button className="bg-red-100 border border-red-400 rounded-md text-red-800 px-2.5 py-1 cursor-pointer text-xs hover:bg-red-200" onClick={e => { e.stopPropagation(); onDelete(); }}>✕</button>
            )}
          </div>
        )}
      </div>
      <p className="text-base mt-1.5 leading-snug text-[#1a1208] skill-rules" style={applyFmt(skill.rulesFormat)}>
        {skill.rulesText}
      </p>
    </div>
  );
}
