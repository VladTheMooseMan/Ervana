import { v4 as uuidv4 } from "uuid";
import type { AppState } from "./types";

const STORAGE_KEY = "npc_card_builder_v2";

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch {}
  return { cards: [], skills: [], damageTypes: [], creatureTypes: [] };
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function makeSeed(): AppState {
  const dmgPrimal    = uuidv4();
  const dmgAcid      = uuidv4();
  const dmgNecrotic  = uuidv4();
  const dmgSonic     = uuidv4();
  const dmgBody      = uuidv4();
  const dmgFire      = uuidv4();
  const dmgIce       = uuidv4();
  const dmgLightning = uuidv4();
  const dmgArcane    = uuidv4();
  const dmgSilver    = uuidv4();
  const dmgBlessing  = uuidv4();

  const nameFmt = (color = "#4a2f18") => ({
    color,
    fontFamily: "'Cinzel', serif",
    bold: true,
    italic: false,
    underline: false,
  });
  const rulesFmt = {
    color: "#1a1208",
    fontFamily: "serif",
    bold: false,
    italic: false,
    underline: false,
  };

  return {
    cards: [],
    skills: [
      {
        id: uuidv4(), name: "SUBDUE", category: "TALENT", domain: "Combat",
        rulesText: "Strike a target with a Weapon Attack and render them Immobilized so long as you remain in contact.",
        nameFormat: nameFmt(), rulesFormat: rulesFmt,
      },
      {
        id: uuidv4(), name: "DEVOUR BUT SLOW", category: "TALENT", domain: "Combat",
        rulesText: "Choose an Immobilized target you are in contact with; after 10 seconds of preparation deal 400 Body Drain damage and cure a Status Effect.",
        nameFormat: nameFmt(), rulesFormat: rulesFmt,
      },
      {
        id: uuidv4(), name: "BODY SLAM", category: "TALENT", domain: "Combat",
        rulesText: "Strike a target with a Weapon Attack; render yourself Tripped and the target suffers 4 Broken Limbs.",
        nameFormat: nameFmt(), rulesFormat: rulesFmt,
      },
      {
        id: uuidv4(), name: "WILLPOWER", category: "TAG",
        rulesText: "Defend a Social ( Enraged, Charmed, Feared ) attack.",
        nameFormat: nameFmt(), rulesFormat: rulesFmt,
      },
      {
        id: uuidv4(), name: "MUCUS", category: "TALENT", domain: "Affliction",
        rulesText: "Strike a target with a melee attack OR choose a target SUBDUED by you; the target is rendered SLOWED and feels gross.",
        nameFormat: nameFmt(), rulesFormat: rulesFmt,
      },
      {
        id: uuidv4(), name: "SLAP", category: "TALENT", domain: "Combat",
        rulesText: "Strike a target with a melee attack and render them STUNNED or deal 5 Body damage.",
        nameFormat: nameFmt(), rulesFormat: rulesFmt,
      },
      {
        id: uuidv4(), name: "SNAIL SHELL", category: "PASSIVE",
        rulesText: "The bearer is HIGHLY RESISTANT to Attacks that do not strike their FRONT TORSO.",
        nameFormat: nameFmt(), rulesFormat: rulesFmt,
      },
      {
        id: uuidv4(), name: "FIREBALL", category: "SPELL", domain: "Evocation",
        rulesText: "Hurl a ball of fire at a target within 30 feet. The target and all within 5 feet suffer 10 Fire damage.",
        nameFormat: nameFmt("#ff7043"), rulesFormat: rulesFmt,
      },
      {
        id: uuidv4(), name: "ARCANE BOLT", category: "SPELL", domain: "Evocation",
        rulesText: "Strike a target at range with Phokus; deal 6 Arcane damage.",
        nameFormat: nameFmt("#ce93d8"), rulesFormat: rulesFmt,
      },
      {
        id: uuidv4(), name: "FEAR", category: "SPELL", domain: "Enchantment",
        rulesText: "Choose a target within 20 feet; they are rendered Feared for 30 seconds.",
        nameFormat: nameFmt("#7e57c2"), rulesFormat: rulesFmt,
      },
    ],
    damageTypes: [
      { id: dmgPrimal,    name: "Primal",    format: { color: "#8bc34a",  fontFamily: "'Cinzel', serif", bold: true, italic: false, underline: false } },
      { id: dmgAcid,      name: "Acid",      format: { color: "#aeea00",  fontFamily: "'Cinzel', serif", bold: true, italic: false, underline: false } },
      { id: dmgNecrotic,  name: "Necrotic",  format: { color: "#9c27b0",  fontFamily: "'Cinzel', serif", bold: true, italic: false, underline: false } },
      { id: dmgSonic,     name: "Sonic",     format: { color: "#f4a742",  fontFamily: "'Cinzel', serif", bold: true, italic: false, underline: false } },
      { id: dmgBody,      name: "Body",      format: { color: "#e57373",  fontFamily: "'Cinzel', serif", bold: true, italic: false, underline: false } },
      { id: dmgFire,      name: "Fire",      format: { color: "#ff7043",  fontFamily: "'Cinzel', serif", bold: true, italic: false, underline: false } },
      { id: dmgIce,       name: "Ice",       format: { color: "#64b5f6",  fontFamily: "'Cinzel', serif", bold: true, italic: false, underline: false } },
      { id: dmgLightning, name: "Lightning", format: { color: "#ffd54f",  fontFamily: "'Cinzel', serif", bold: true, italic: false, underline: false } },
      { id: dmgArcane,    name: "Arcane",    format: { color: "#ce93d8",  fontFamily: "'Cinzel', serif", bold: true, italic: false, underline: false } },
      { id: dmgSilver,    name: "Silver",    format: { color: "#b0bec5",  fontFamily: "'Cinzel', serif", bold: true, italic: false, underline: false } },
      { id: dmgBlessing,  name: "Blessing",  format: { color: "#fff176",  fontFamily: "'Cinzel', serif", bold: true, italic: false, underline: false } },
    ],
    creatureTypes: [
      {
        id: uuidv4(), name: "Humanoid",
        format: { color: "#c8a96e", fontFamily: "'Cinzel', serif", bold: false, italic: false, underline: false },
        weaknesses: [], resistances: [], immunities: [], baseAttacks: [],
      },
      {
        id: uuidv4(), name: "Beast",
        format: { color: "#8bc34a", fontFamily: "'Cinzel', serif", bold: false, italic: false, underline: false },
        weaknesses: [{ kind: "damage", damageTypeId: dmgFire }],
        resistances: [{ kind: "damage", damageTypeId: dmgPrimal }],
        immunities: [],
        baseAttacks: [
          { id: uuidv4(), weaponName: "Claws", damage: 4, damageTypeId: dmgPrimal, attackType: "Melee" },
        ],
      },
      {
        id: uuidv4(), name: "Undead",
        format: { color: "#9c27b0", fontFamily: "'Cinzel', serif", bold: false, italic: false, underline: false },
        weaknesses: [
          { kind: "damage", damageTypeId: dmgBlessing },
          { kind: "damage", damageTypeId: dmgFire },
        ],
        resistances: [
          { kind: "damage", damageTypeId: dmgNecrotic },
          { kind: "rp", text: "Slashing" },
        ],
        immunities: [
          { kind: "rp", text: "Poison" },
          { kind: "rp", text: "Sleep" },
          { kind: "rp", text: "Charm" },
        ],
        baseAttacks: [
          { id: uuidv4(), weaponName: "Rotting Claws", damage: 5, damageTypeId: dmgNecrotic, attackType: "Melee" },
        ],
      },
      {
        id: uuidv4(), name: "Construct",
        format: { color: "#78909c", fontFamily: "'Cinzel', serif", bold: false, italic: false, underline: false },
        weaknesses: [{ kind: "damage", damageTypeId: dmgLightning }],
        resistances: [{ kind: "rp", text: "Piercing" }, { kind: "rp", text: "Slashing" }],
        immunities: [{ kind: "rp", text: "Poison" }, { kind: "rp", text: "Mind Effects" }, { kind: "rp", text: "Sleep" }],
        baseAttacks: [
          { id: uuidv4(), weaponName: "Iron Fist", damage: 8, damageTypeId: dmgBody, attackType: "Melee" },
        ],
      },
      {
        id: uuidv4(), name: "Demon",
        format: { color: "#e53935", fontFamily: "'Cinzel', serif", bold: false, italic: false, underline: false },
        weaknesses: [
          { kind: "damage", damageTypeId: dmgBlessing },
          { kind: "damage", damageTypeId: dmgSilver },
        ],
        resistances: [
          { kind: "damage", damageTypeId: dmgFire },
          { kind: "damage", damageTypeId: dmgNecrotic },
        ],
        immunities: [{ kind: "rp", text: "Fear" }],
        baseAttacks: [
          { id: uuidv4(), weaponName: "Hellfire Touch", damage: 6, damageTypeId: dmgFire, attackType: "Melee" },
          { id: uuidv4(), weaponName: "Hellfire Bolt", damage: 5, damageTypeId: dmgFire, attackType: "Ranged" },
        ],
      },
      {
        id: uuidv4(), name: "Fey",
        format: { color: "#80cbc4", fontFamily: "'Cinzel', serif", bold: false, italic: false, underline: false },
        weaknesses: [{ kind: "rp", text: "Iron" }],
        resistances: [{ kind: "damage", damageTypeId: dmgArcane }],
        immunities: [{ kind: "rp", text: "Mundane Weapons" }],
        baseAttacks: [
          { id: uuidv4(), weaponName: "Enchanted Blade", damage: 4, damageTypeId: dmgArcane, attackType: "Melee" },
          { id: uuidv4(), weaponName: "Glamour Bolt", damage: 3, damageTypeId: dmgArcane, attackType: "Phokus" },
        ],
      },
    ],
  };
}

export const seedState: AppState = makeSeed();
