export type SkillCategory = "TAG" | "SPELL" | "TALENT" | "PASSIVE";

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

// Skills in the bank have no frequency — frequency is set per card instance
export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  domain?: string;
  rulesText: string;
  nameFormat?: TextFormat;
  rulesFormat?: TextFormat;
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

export interface NPCCard {
  id: string;
  name: string;
  body: number;
  armor: number;
  baseDamage: number;
  creatureTypeIds: string[];
  description: string;
  skills: CardSkillEntry[];
  backgroundImage?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface AppState {
  cards: NPCCard[];
  skills: Skill[];
  damageTypes: DamageType[];
  creatureTypes: CreatureType[];
}
