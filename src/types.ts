export type SkillCategory = "TAG" | "SPELL" | "TALENT" | "PASSIVE";

// Icon shown next to a skill's name on the card + banks.
// sword = Attack, shield = Defense, star = Other
export type SkillIcon = "sword" | "shield" | "star";

export type FrequencyType =
  | { kind: "uses"; count: number }
  | { kind: "con"; seconds: number }
  | { kind: "cd"; seconds: number }
  | { kind: "other"; text: string }
  | { kind: "passive" };

export interface TextFormat {
  color: string;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fontSize?: number;
}

// Rich-text range applied to a slice of `description` in an NPCCard.
export interface FormatRange {
  start: number;
  end: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

// Skills in the bank have no frequency — frequency is set per card instance
export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  domain?: string;
  rulesText: string;
  nameFormat?: TextFormat;
  rulesFormat?: TextFormat;
  iconKind?: SkillIcon;
}

// Per-card skill entry wires a skill to a frequency chosen for that NPC
export interface CardSkillEntry {
  skillId: string;
  frequency: FrequencyType;
}

export interface DamageType {
  id: string;
  name: string;
  format: TextFormat;
}

// ─── Creature Type ────────────────────────────────────────────────────────────

export type CreatureRef =
  | { kind: "damage"; damageTypeId: string }
  | { kind: "skill"; skillId: string }
  | { kind: "rp"; text: string };

export type AttackType = "Melee" | "Ranged" | "Phokus";

export interface BaseAttack {
  id: string;
  weaponName: string;
  damage: number;
  damageTypeId: string;
  attackType: AttackType;
}

export interface CreatureType {
  id: string;
  name: string;
  format: TextFormat;
  weaknesses: CreatureRef[];
  resistances: CreatureRef[];
  immunities: CreatureRef[];
  baseAttacks: BaseAttack[];
}

// Six D&D-style attributes. All default 0. Shown on card only when != 0.
export interface CardTraits {
  str: number;
  dex: number;
  int: number;
  wis: number;
  cha: number;
  con: number;
}

export interface NPCCard {
  id: string;
  name: string;
  body: number;
  armor: number;
  baseDamage: number;
  creatureTypeIds: string[];
  description: string;
  descriptionRanges?: FormatRange[];
  skills: CardSkillEntry[];
  backgroundImage?: string;
  tags: string[];
  traits?: CardTraits;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppState {
  cards: NPCCard[];
  skills: Skill[];
  damageTypes: DamageType[];
  creatureTypes: CreatureType[];
}
