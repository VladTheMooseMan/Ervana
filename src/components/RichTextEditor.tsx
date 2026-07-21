// ============================================================================
// RichTextEditor.tsx — Textarea + selection-based formatting toolbar
// ============================================================================
// Purpose: Lets the user apply bold/italic/underline/color to a *selection*
// of the description text. Ranges are stored on the NPCCard as
// FormatRange[] and used by CardPreview.buildRichChunks() to render styled
// spans.
//
// ASCII Flow:
//   [ textarea ] --(select text)--> [ toolbar buttons ]
//                                        |
//                                        v
//                              [ push FormatRange w/ start,end ]
//                                        |
//                                        v
//                              [ merge overlapping ranges on save ]
// ============================================================================

import { useRef, useState } from "react";
import type { FormatRange } from "../types";
import { ColorPopover } from "./shared";

interface Props {
  value: string;
  onChange: (v: string) => void;
  ranges: FormatRange[];
  onRangesChange: (r: FormatRange[]) => void;
}

export function RichTextEditor({ value, onChange, ranges, onRangesChange }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [sel, setSel] = useState<{ start: number; end: number } | null>(null);

  function captureSelection() {
    const el = ref.current;
    if (!el) return null;
    const s = el.selectionStart ?? 0;
    const e = el.selectionEnd ?? 0;
    if (e <= s) return null;
    const range = { start: s, end: e };
    setSel(range);
    return range;
  }

  function applyToSelection(patch: Partial<Omit<FormatRange, "start" | "end">>) {
    const cur = captureSelection() ?? sel;
    if (!cur) return;
    const next: FormatRange = { start: cur.start, end: cur.end, ...patch };
    onRangesChange([...ranges, next]);
  }

  function clearSelection() {
    const cur = captureSelection() ?? sel;
    if (!cur) return;
    onRangesChange(ranges.filter(r => r.end <= cur.start || r.start >= cur.end));
  }

  const [pickerColor, setPickerColor] = useState("#8a2a2a");

  return (
    <div>
      <div className="flex gap-1.5 flex-wrap items-center mb-2 bg-white/70 border border-custom-brown/30 rounded-md px-2 py-1">
        <span className="text-[10px] font-cinzel text-black font-bold tracking-wider">FORMAT SELECTION:</span>
        <button className="border border-custom-brown/50 rounded px-2 py-0.5 text-xs font-bold bg-white" onMouseDown={e => e.preventDefault()} onClick={() => applyToSelection({ bold: true })}>B</button>
        <button className="border border-custom-brown/50 rounded px-2 py-0.5 text-xs italic bg-white" onMouseDown={e => e.preventDefault()} onClick={() => applyToSelection({ italic: true })}>I</button>
        <button className="border border-custom-brown/50 rounded px-2 py-0.5 text-xs underline bg-white" onMouseDown={e => e.preventDefault()} onClick={() => applyToSelection({ underline: true })}>U</button>
        <div onMouseDown={e => e.preventDefault()} className="flex items-center gap-1">
          <ColorPopover value={pickerColor} onChange={setPickerColor} />
          <button className="border border-custom-brown/50 rounded px-2 py-0.5 text-xs bg-white text-black font-bold" onClick={() => applyToSelection({ color: pickerColor })}>Apply Color</button>
        </div>
        <button className="border border-custom-brown/50 rounded px-2 py-0.5 text-xs bg-white text-black" onMouseDown={e => e.preventDefault()} onClick={clearSelection}>Clear</button>
      </div>
      <textarea
        ref={ref}
        className="bg-paper-dark border border-custom-brown/20 rounded-md text-custom-brown px-3 py-2 font-serif text-sm w-full outline-none min-h-[120px] resize-y"
        value={value}
        onChange={e => {
          // If text length changes, drop any ranges that are now out of bounds
          const next = e.target.value;
          if (next.length < value.length) {
            onRangesChange(ranges.filter(r => r.end <= next.length));
          }
          onChange(next);
        }}
        onSelect={captureSelection}
        onMouseUp={captureSelection}
        onKeyUp={captureSelection}
        placeholder="Background, tactics, roleplay notes…"
      />
      {ranges.length > 0 && (
        <p className="text-xs text-custom-brown/70 italic mt-1">
          {ranges.length} formatted range{ranges.length === 1 ? "" : "s"} applied
        </p>
      )}
    </div>
  );
}
