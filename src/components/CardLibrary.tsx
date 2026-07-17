import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { NPCCard, CreatureType } from "../types";
import { useAppStore } from "../store/appStore";
import { applyFmt } from "../utils";
import { CardPreview } from "./CardPreview";

export function CardLibrary({ onEdit, onDelete }: {
  onEdit: (c: NPCCard) => void; onDelete: (id: string) => void;
}) {
  const { cards, skills, creatureTypes } = useAppStore();
  const [query, setQuery] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewCard = previewId ? cards.find(c => c.id === previewId) : null;

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return cards;
    return cards.filter(c =>
      c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) ||
      c.tags.some(t => t.toLowerCase().includes(q)));
  }, [cards, query]);

  if (cards.length === 0) {
    return (
      <div className="text-center p-16 bg-paper rounded-lg shadow-paper">
        <div className="text-5xl mb-3">📜</div>
        <p className="font-cinzel text-[#2a1608] font-semibold">Your library is empty. Build your first NPC card.</p>
      </div>
    );
  }

  return (
    <div>
      <input className="bg-white border border-custom-brown/50 rounded-md text-[#1a1208] placeholder:text-[#5a4a30]/70 px-3 py-2 font-serif text-sm w-full outline-none mb-4 shadow-paper" placeholder="Search library by name, tag, description…"
        value={query} onChange={e => setQuery(e.target.value)} />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
        {filtered.map(card => {
          const types = card.creatureTypeIds.map(id => creatureTypes.find(c => c.id === id)).filter(Boolean) as CreatureType[];
          return (
            <motion.div
              key={card.id}
              className="bg-paper border border-custom-brown/50 rounded-lg overflow-hidden shadow-paper"
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            >
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-cinzel font-bold text-[#1a1208] text-lg m-0">{card.name}</h3>
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {types.map(t => <span key={t.id} className="text-xs font-semibold" style={applyFmt(t.format)}>[{t.name}]</span>)}
                    </div>
                    <p className="text-[#2a1608] text-xs m-0 mt-1 font-semibold">
                      Body {card.body} · Armor {card.armor} · {card.skills.length} skills
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button className="bg-paper-dark border border-custom-brown/50 rounded-md text-[#2a1608] px-3 py-1 cursor-pointer font-serif text-xs font-semibold hover:bg-custom-tan" onClick={() => onEdit(card)}>Edit</button>
                    <button className="bg-red-100 border border-red-500 rounded-md text-red-800 px-2.5 py-1 cursor-pointer text-xs font-bold hover:bg-red-200" onClick={() => {
                      if (window.confirm(`Are you sure you want to delete ${card.name}?`)) {
                        onDelete(card.id);
                      }
                    }}>✕</button>
                  </div>
                </div>
                {card.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-2">
                    {card.tags.map(t => (
                      <span key={t} className="bg-paper-dark border border-custom-brown/50 rounded-sm text-[10px] text-[#2a1608] px-1.5 py-0.5 font-cinzel tracking-wider font-semibold">{t}</span>
                    ))}
                  </div>
                )}
                <button className="bg-button-gradient border border-custom-gold/60 rounded-md text-[#f5e3b8] cursor-pointer text-xs mt-3 px-3 py-1.5 font-cinzel font-bold tracking-wider hover:brightness-110"
                  onClick={() => setPreviewId(card.id)}>
                  🔍 View Preview
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewCard && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setPreviewId(null)}
          >
            <motion.div
              className="relative"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={e => e.stopPropagation()}
            >
              <button
                className="absolute -top-3 -right-3 z-10 bg-red-600 hover:bg-red-700 border-2 border-custom-gold text-white rounded-full w-10 h-10 cursor-pointer text-lg font-bold shadow-lg"
                onClick={() => setPreviewId(null)}
                aria-label="Close preview"
              >
                ✕
              </button>
              <CardPreview card={previewCard} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
