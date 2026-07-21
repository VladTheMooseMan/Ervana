// ============================================================================
// NotesEditor.tsx — Reusable notes modal for a single NPCCard
// ============================================================================
// Purpose: Popup that lets the user edit the private `notes` field on a
// card without opening the full Card Builder. Used by Library and Card Web.
// Notes are for the GM/user only — they never render on the printed card.
// ============================================================================

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { NPCCard } from "../types";
import { useAppStore } from "../store/appStore";

export function NotesEditor({ card, onClose }: { card: NPCCard; onClose: () => void }) {
  const { saveCard } = useAppStore();
  const [notes, setNotes] = useState(card.notes ?? "");

  useEffect(() => setNotes(card.notes ?? ""), [card.id]);

  async function save() {
    await saveCard({ ...card, notes, updatedAt: Date.now() });
    onClose();
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-paper rounded-lg p-4 shadow-paper w-full max-w-lg"
        initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <div className="font-cinzel text-black font-bold text-lg tracking-wider">
            Notes — {card.name || "Unnamed"}
          </div>
          <button className="border border-custom-brown/40 rounded-md text-black px-3 py-1 cursor-pointer text-sm hover:bg-paper-dark" onClick={onClose}>✕</button>
        </div>
        <p className="text-xs text-black/70 italic mb-2 font-serif">
          Private notes — never printed on the card.
        </p>
        <textarea
          autoFocus
          className="bg-paper-dark border border-custom-brown/40 rounded-md text-black px-3 py-2 font-serif text-sm w-full outline-none min-h-[180px] resize-y font-semibold"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Behind-the-scenes notes NPCs never see…"
        />
        <div className="flex gap-2 mt-3">
          <button className="bg-button-gradient border border-custom-gold/60 rounded-md text-white px-4 py-2 cursor-pointer font-cinzel text-sm tracking-wider flex-1" onClick={save}>Save Notes</button>
          <button className="border border-custom-brown/40 rounded-md text-black px-4 py-2 cursor-pointer text-sm hover:bg-paper-dark" onClick={onClose}>Cancel</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
