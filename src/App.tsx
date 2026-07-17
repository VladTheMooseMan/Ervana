import { useState } from "react";
import clsx from "clsx";
import { motion } from "framer-motion";
import type { NPCCard } from "./types";
import { useAppStore } from "./store/appStore";
import { CardBuilder } from "./components/CardBuilder";
import { CardLibrary } from "./components/CardLibrary";
import { CardWeb } from "./components/CardWeb";
import { SkillsBank } from "./components/SkillsBank";
import { DamageTypesBank } from "./components/DamageTypesBank";
import { CreatureTypesBank } from "./components/CreatureTypesBank";
import { PrintQueue } from "./components/PrintQueue";

type Tab = "builder" | "library" | "web" | "skills" | "damage" | "creatures" | "print";
const TAB_LABELS: { id: Tab; label: string }[] = [
  { id: "builder",   label: "Card Builder" },
  { id: "library",   label: "Library" },
  { id: "web",       label: "Card Web" },
  { id: "skills",    label: "Skills Bank" },
  { id: "damage",    label: "Damage Types" },
  { id: "creatures", label: "Creature Types" },
  { id: "print",     label: "Print" },
];

export default function App() {
  const { cards, skills, damageTypes, creatureTypes, update, saveCard, deleteCard } = useAppStore();
  const [tab, setTab] = useState<Tab>("builder");
  const [editingCard, setEditingCard] = useState<NPCCard | undefined>(undefined);

  const handleSaveCard = (card: NPCCard) => {
    saveCard(card);
    setTab("library");
    setEditingCard(undefined);
  };

  return (
    <div className="min-h-screen bg-wood-pattern text-custom-brown">
      <header className="bg-paper-dark border-b border-custom-brown/20 px-7 py-3.5 flex items-center justify-between sticky top-0 z-50 shadow-header">
        <div>
          <h1 className="font-cinzel text-xl font-bold text-custom-brown m-0 tracking-wider shadow-text-gold">
            ⚔ Ervana Sedengers Creature Compendium
          </h1>
          <p className="text-custom-brown text-xs m-0 tracking-widest">LARP CHARACTER AND CREATURE CARD BUILDER, CATALOG, AND LIBRARY</p>
        </div>
        <nav className="flex gap-1 flex-wrap">
          {TAB_LABELS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={clsx(
              "border rounded-md px-3 py-1.5 cursor-pointer font-cinzel text-xs tracking-wider transition-all duration-150",
              {
                "bg-button-gradient border-custom-gold text-white": tab === t.id,
                "bg-transparent border-custom-brown/20 text-custom-brown": tab !== t.id,
              }
            )}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <motion.main
        key={tab} // Animate when tab changes
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="px-7 py-7 pb-16 max-w-7xl mx-auto"
      >
        <div className="print:hidden inline-block font-cinzel text-sm text-[#f5e3b8] font-bold mb-5 tracking-wider px-3 py-1 rounded bg-black/50 border border-custom-gold/50">
          {TAB_LABELS.find(t => t.id === tab)?.label}
          {tab === "builder" && editingCard && <span className="text-custom-gold"> — Editing: {editingCard.name}</span>}
        </div>

        {tab === "builder" && (
          <CardBuilder onSave={handleSaveCard} editCard={editingCard}
            onClear={() => setEditingCard(undefined)} />
        )}
        {tab === "library" && (
          <CardLibrary
            onEdit={c => { setEditingCard(c); setTab("builder"); }}
            onDelete={deleteCard} />
        )}
        {tab === "web" && <CardWeb />}
        {tab === "skills" && <SkillsBank />}
        {tab === "damage" && <DamageTypesBank />}
        {tab === "creatures" && <CreatureTypesBank />}
        {tab === "print" && <PrintQueue />}
      </motion.main>
    </div>
  );
}
