import { useState, useMemo, useRef } from "react";
import type { NPCCard } from "../types";
import { useAppStore } from "../store/appStore";
import { CardPreview } from "./CardPreview";

// ============================================================
// PurposeManifest:
//   PrintQueue lets the user queue saved NPC cards from the
//   Library and print them on standard paper. The queue supports
//   DUPLICATES — the same card can be added multiple times
//   (each copy is a separate entry with its own uid).
// FlowChart:
//   [Library cards]  ->  [+ Queue any # of times]  ->  [Queue]  ->  [Print]
//                                                       |
//                                                       v
//                                              [print-only sheet]
// ============================================================

type PageSize = "letter" | "a4";
type PerPage = 1 | 2 | 4 | 6;

interface QueueEntry {
  uid: string;    // unique per-entry id (allows duplicates of the same cardId)
  cardId: string;
}

// Native card render sizes (pixels @ 96dpi). Match CardPreview.
const CARD_NATIVE_W_PORTRAIT = 480;
const CARD_NATIVE_W_WIDE     = 720;
const CARD_NATIVE_H          = 600;

// Slot size per layout, in inches — used to auto-scale each card.
// Letter printable ~ 7.7 × 10.2in (with 0.4in margin all sides).
const SLOT_IN: Record<PerPage, { w: number; h: number }> = {
  1: { w: 7.5, h: 10.0 },
  2: { w: 7.5, h:  4.9 },   // 2 rows × 1 col
  4: { w: 3.7, h:  4.9 },   // 2 rows × 2 cols
  6: { w: 3.7, h:  3.3 },   // 3 rows × 2 cols
};

// Compute the fit-to-slot scale for a given card in a given layout.
function scaleForCard(card: NPCCard, per: PerPage): number {
  const nativeW = card.useThreeColumns ? CARD_NATIVE_W_WIDE : CARD_NATIVE_W_PORTRAIT;
  const nativeH = CARD_NATIVE_H;
  const slot = SLOT_IN[per];
  const slotW = slot.w * 96;
  const slotH = slot.h * 96;
  return Math.min(slotW / nativeW, slotH / nativeH);
}

export function PrintQueue() {
  const { cards } = useAppStore();
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>("letter");
  const [cardsPerPage, setCardsPerPage] = useState<PerPage>(2);
  const [search, setSearch] = useState("");

  const filteredLibrary = useMemo(() => {
    const q = search.toLowerCase();
    return cards.filter(c => !q || c.name.toLowerCase().includes(q) || c.tags.some(t => t.toLowerCase().includes(q)));
  }, [cards, search]);

  const queueCards: { entry: QueueEntry; card: NPCCard }[] = useMemo(
    () => queue
      .map(entry => {
        const card = cards.find(c => c.id === entry.cardId);
        return card ? { entry, card } : null;
      })
      .filter(Boolean) as { entry: QueueEntry; card: NPCCard }[],
    [queue, cards]
  );

  const countInQueue = (cardId: string) => queue.filter(e => e.cardId === cardId).length;

  const addToQueue = (cardId: string) => setQueue(q => [...q, { uid: `${cardId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, cardId }]);
  const removeEntry = (uid: string) => setQueue(q => q.filter(e => e.uid !== uid));
  const removeOneByCardId = (cardId: string) => setQueue(q => {
    const idx = [...q].reverse().findIndex(e => e.cardId === cardId);
    if (idx === -1) return q;
    const realIdx = q.length - 1 - idx;
    return [...q.slice(0, realIdx), ...q.slice(realIdx + 1)];
  });
  const moveUp = (i: number) => setQueue(q => {
    if (i <= 0) return q;
    const c = [...q]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; return c;
  });
  const moveDown = (i: number) => setQueue(q => {
    if (i >= q.length - 1) return q;
    const c = [...q]; [c[i], c[i + 1]] = [c[i + 1], c[i]]; return c;
  });
  const clearQueue = () => setQueue([]);
  const addAll = () => setQueue(q => [
    ...q,
    ...filteredLibrary.map(c => ({ uid: `${c.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, cardId: c.id })),
  ]);

  const handlePrint = () => {
    window.print();
  };

  const sheetRef = useRef<HTMLDivElement | null>(null);

  // ------------------- Empty state -------------------
  if (cards.length === 0) {
    return (
      <div className="text-center p-16 bg-paper rounded-lg shadow-paper">
        <div className="text-5xl mb-3">🖨</div>
        <p className="font-cinzel text-[#2a1608] font-semibold">Your library is empty. Save some NPC cards first.</p>
      </div>
    );
  }

  return (
    <div>
      {/* ---------- CONTROLS (hidden when printing) ---------- */}
      <div className="print:hidden">
        <div className="bg-paper rounded-lg shadow-paper p-4 mb-4 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-[#2a1608] text-sm font-cinzel font-bold">Page:</label>
            <select className="bg-white border border-custom-brown/50 rounded-md text-[#1a1208] px-2 py-1 font-serif text-sm outline-none"
              value={pageSize} onChange={e => setPageSize(e.target.value as PageSize)}>
              <option value="letter">Letter (8.5 × 11 in)</option>
              <option value="a4">A4</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[#2a1608] text-sm font-cinzel font-bold">Per page:</label>
            <select className="bg-white border border-custom-brown/50 rounded-md text-[#1a1208] px-2 py-1 font-serif text-sm outline-none"
              value={cardsPerPage} onChange={e => setCardsPerPage(Number(e.target.value) as PerPage)}>
              <option value={1}>1 card</option>
              <option value={2}>2 cards</option>
              <option value={4}>2 × 2 (4 cards)</option>
              <option value={6}>2 × 3 (6 cards)</option>
            </select>
          </div>
          <button
            onClick={handlePrint}
            disabled={queueCards.length === 0}
            className="ml-auto bg-button-gradient border border-custom-gold/60 rounded-md text-white px-5 py-2 cursor-pointer font-cinzel tracking-wider text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🖨 Print {queueCards.length > 0 ? `(${queueCards.length})` : ""}
          </button>
          <button
            onClick={clearQueue}
            disabled={queueCards.length === 0}
            className="border border-custom-brown/50 rounded-md text-[#2a1608] px-3 py-2 cursor-pointer font-serif text-xs font-semibold hover:bg-paper-dark disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Clear Queue
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ---------- LIBRARY ---------- */}
          <div className="bg-paper rounded-lg shadow-paper p-4">
            <div className="flex items-center justify-between mb-3 border-b border-custom-brown/40 pb-2">
              <p className="font-cinzel text-[#2a1608] font-bold text-sm tracking-widest uppercase">Library</p>
              <button className="text-xs text-[#2a1608] font-semibold hover:underline" onClick={addAll}>+ Add All</button>
            </div>
            <input className="bg-white border border-custom-brown/50 rounded-md text-[#1a1208] placeholder:text-[#5a4a30]/70 px-3 py-2 font-serif text-sm w-full outline-none mb-3"
              placeholder="Search cards…" value={search} onChange={e => setSearch(e.target.value)} />
            <div className="max-h-[480px] overflow-y-auto pr-2 -mr-2">
              {filteredLibrary.map(card => {
                const count = countInQueue(card.id);
                return (
                  <div key={card.id} className="flex items-center justify-between bg-white/80 border border-custom-brown/40 rounded-md px-3 py-2 mb-2">
                    <div>
                      <div className="font-cinzel font-bold text-[#1a1208] text-sm">
                        {card.name || "(unnamed)"}
                        {count > 0 && (
                          <span className="ml-2 inline-block bg-[#8a5a2a] text-white rounded-full text-[10px] font-bold px-2 py-0.5">
                            ×{count} queued
                          </span>
                        )}
                      </div>
                      <div className="text-[#2a1608] text-xs font-semibold">
                        Body {card.body} · Armor {card.armor} · {card.skills.length} skills
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {count > 0 && (
                        <button
                          onClick={() => removeOneByCardId(card.id)}
                          title="Remove one from queue"
                          className="rounded-md px-2 py-1 cursor-pointer font-serif text-xs font-bold border bg-red-100 border-red-500 text-red-800 hover:bg-red-200"
                        >
                          −
                        </button>
                      )}
                      <button
                        onClick={() => addToQueue(card.id)}
                        title="Add another copy to queue"
                        className="rounded-md px-3 py-1 cursor-pointer font-serif text-xs font-semibold border bg-paper-dark border-custom-brown/50 text-[#2a1608] hover:bg-custom-tan"
                      >
                        + Queue
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredLibrary.length === 0 && (
                <p className="italic text-center text-[#2a1608]/70 p-4">No matches.</p>
              )}
            </div>
          </div>

          {/* ---------- QUEUE ---------- */}
          <div className="bg-paper rounded-lg shadow-paper p-4">
            <p className="font-cinzel text-[#2a1608] font-bold text-sm tracking-widest uppercase border-b border-custom-brown/40 pb-2 mb-3">
              Print Queue ({queueCards.length})
            </p>
            {queueCards.length === 0 ? (
              <p className="italic text-center text-[#2a1608]/70 p-6">Queue is empty. Add cards from the Library.</p>
            ) : (
              <div className="max-h-[480px] overflow-y-auto pr-2 -mr-2">
                {queueCards.map(({ entry, card }, i) => (
                  <div key={entry.uid} className="flex items-center justify-between bg-white/80 border border-custom-brown/40 rounded-md px-3 py-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[#2a1608] text-xs font-bold w-6 text-right">{i + 1}.</span>
                      <div>
                        <div className="font-cinzel font-bold text-[#1a1208] text-sm">{card.name || "(unnamed)"}</div>
                        <div className="text-[#2a1608] text-xs font-semibold">
                          Body {card.body} · {card.skills.length} skills
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveUp(i)} disabled={i === 0}
                        className="border border-custom-brown/50 rounded text-[#2a1608] w-7 h-7 cursor-pointer text-xs font-bold hover:bg-paper-dark disabled:opacity-30 disabled:cursor-not-allowed">▲</button>
                      <button onClick={() => moveDown(i)} disabled={i === queueCards.length - 1}
                        className="border border-custom-brown/50 rounded text-[#2a1608] w-7 h-7 cursor-pointer text-xs font-bold hover:bg-paper-dark disabled:opacity-30 disabled:cursor-not-allowed">▼</button>
                      <button onClick={() => removeEntry(entry.uid)}
                        className="bg-red-100 border border-red-500 rounded text-red-800 w-7 h-7 cursor-pointer text-xs font-bold hover:bg-red-200">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ---------- ON-SCREEN PREVIEW ---------- */}
        {queueCards.length > 0 && (
          <div className="mt-6 bg-paper rounded-lg shadow-paper p-4">
            <p className="font-cinzel text-[#2a1608] font-bold text-sm tracking-widest uppercase border-b border-custom-brown/40 pb-2 mb-3">
              Print Preview
            </p>
            <div className="flex flex-wrap gap-4 justify-center bg-white p-4 rounded">
              {queueCards.map(({ entry, card }) => (
                <div key={entry.uid} className="scale-75 origin-top">
                  <CardPreview card={card} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ==================================================
          PRINT SHEET — hidden on screen, revealed by @media print.
          Each card is auto-scaled per its own layout (portrait or
          3-col wide) so the whole card fits its slot. Slots come
          from a 1 / 2 / 2×2 / 2×3 grid.
          ================================================== */}
      <div
        ref={sheetRef}
        className={`print-sheet print-sheet--${pageSize} print-sheet--per-${cardsPerPage} hidden print:block`}
      >
        {queueCards.map(({ entry, card }) => {
          const scale = scaleForCard(card, cardsPerPage);
          const nativeW = card.useThreeColumns ? CARD_NATIVE_W_WIDE : CARD_NATIVE_W_PORTRAIT;
          const slot = SLOT_IN[cardsPerPage];
          return (
            <div
              key={entry.uid}
              className="print-card"
              style={{
                width: `${slot.w}in`,
                height: `${slot.h}in`,
              }}
            >
              <div
                className="print-card-content"
                style={{
                  width: `${nativeW}px`,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
              >
                <CardPreview card={card} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
