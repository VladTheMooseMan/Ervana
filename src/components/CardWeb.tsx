import { useState, useMemo } from "react";
import type { NPCCard, CreatureType } from "../types";
import { useAppStore } from "../store/appStore";
import { applyFmt } from "../utils";
import { NotesEditor } from "./NotesEditor";

type WebAxis = "creatureType" | "tag" | "bodyRange" | "skillCount";

export function CardWeb() {
  const { cards, creatureTypes } = useAppStore();
  const [axis, setAxis] = useState<WebAxis>("creatureType");
  const [notesId, setNotesId] = useState<string | null>(null);
  const notesCard = notesId ? cards.find(c => c.id === notesId) : null;

  const groups = useMemo<Map<string, NPCCard[]>>(() => {
    const map = new Map<string, NPCCard[]>();
    const push = (key: string, card: NPCCard) => {
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(card);
    };
    for (const card of cards) {
      if (axis === "creatureType") {
        if (card.creatureTypeIds.length === 0) push("Untyped", card);
        else for (const tid of card.creatureTypeIds) push(creatureTypes.find(c => c.id === tid)?.name ?? "Unknown", card);
      } else if (axis === "tag") {
        if (card.tags.length === 0) push("Untagged", card);
        else for (const tag of card.tags) push(tag, card);
      } else if (axis === "bodyRange") {
        const b = card.body;
        push(b <= 50 ? "0–50" : b <= 100 ? "51–100" : b <= 200 ? "101–200" : b <= 500 ? "201–500" : "500+", card);
      } else {
        const n = card.skills.length;
        push(n === 0 ? "0 skills" : n <= 3 ? "1–3 skills" : n <= 6 ? "4–6 skills" : "7+ skills", card);
      }
    }
    return map;
  }, [cards, creatureTypes, axis]);

  if (cards.length === 0) {
    return (
      <div className="text-center p-16 bg-paper rounded-lg shadow-paper">
        <p className="font-cinzel text-[#2a1608] font-semibold">Save some cards to view them in the web.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 bg-paper rounded-lg shadow-paper px-4 py-3">
        <label className="text-[#2a1608] text-sm font-cinzel font-bold">Organize by:</label>
        <select className="bg-white border border-custom-brown/50 rounded-md text-[#1a1208] px-2 py-1 font-serif text-sm w-auto outline-none" value={axis} onChange={e => setAxis(e.target.value as WebAxis)}>
          <option value="creatureType">Creature Type</option>
          <option value="tag">Tag</option>
          <option value="bodyRange">Body Range</option>
          <option value="skillCount">Skill Count</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <div className="flex gap-7 min-w-max items-start">
          {[...groups.entries()].map(([groupName, cards]) => (
            <div key={groupName} className="min-w-[220px] bg-paper rounded-lg shadow-paper p-3">
              <div className="font-cinzel text-[#2a1608] font-bold text-sm tracking-wider uppercase border-b border-custom-brown/40 pb-2 mb-3">
                {groupName}
                <span className="text-[#5a4a30] text-xs ml-1.5">({cards.length})</span>
              </div>
              <div className="flex flex-col gap-2.5">
                {cards.map(card => {
                  const types = card.creatureTypeIds.map(id => creatureTypes.find(c => c.id === id)).filter(Boolean) as CreatureType[];
                  return (
                    <div key={card.id} className="bg-white/80 border border-custom-brown/50 rounded-lg p-2.5 px-3.5 shadow-sm">
                      <div className="flex justify-between items-start gap-1">
                        <div className="font-cinzel font-bold text-[#1a1208] text-sm mb-0.5">{card.name}</div>
                        <button className="border border-custom-brown/40 rounded text-black px-1.5 py-0 text-xs cursor-pointer hover:bg-paper-dark" title="Edit notes" onClick={() => setNotesId(card.id)}>📝</button>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {types.map(t => <span key={t.id} className="text-xs font-semibold" style={applyFmt(t.format)}>[{t.name}]</span>)}
                      </div>
                      <div className="text-[#2a1608] text-xs mt-1 font-semibold">♥ {card.body} &nbsp; ⚔ {card.armor} &nbsp; · &nbsp; {card.skills.length} skills</div>
                      {card.tags.length > 0 && (
                        <div className="mt-1 flex gap-1 flex-wrap">
                          {card.tags.map(t => <span key={t} className="bg-paper-dark border border-custom-brown/50 rounded-sm text-[10px] text-[#2a1608] px-1.5 py-0.5">{t}</span>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      {notesCard && <NotesEditor card={notesCard} onClose={() => setNotesId(null)} />}
    </div>
  );
}
