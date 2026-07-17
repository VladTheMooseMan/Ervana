// ============================================================================
// App store — Supabase-backed shared state
// ============================================================================
// Replaces the localStorage-persisted Zustand store. On mount, hydrates from
// four Supabase tables (cards / skills / damage_types / creature_types).
// Every mutating call performs an optimistic in-memory update AND an upsert
// (or delete) against Supabase so all logged-in users see the same library.
// ============================================================================

import { create } from 'zustand';
import type { AppState, NPCCard, Skill, DamageType, CreatureType } from '../types';
import { supabase } from '../supabase';
import { seedState } from '../store';

type EntityKey = 'cards' | 'skills' | 'damageTypes' | 'creatureTypes';
type EntityRow = NPCCard | Skill | DamageType | CreatureType;

const TABLE: Record<EntityKey, string> = {
  cards: 'cards',
  skills: 'skills',
  damageTypes: 'damage_types',
  creatureTypes: 'creature_types',
};

interface AppStore extends AppState {
  loading: boolean;
  loaded: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  update: (patch: Partial<AppState>) => void;

  saveCard: (card: NPCCard) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;

  saveSkill: (skill: Skill) => Promise<void>;
  deleteSkill: (id: string) => Promise<void>;

  saveDamageType: (dt: DamageType) => Promise<void>;
  deleteDamageType: (id: string) => Promise<void>;

  saveCreatureType: (ct: CreatureType) => Promise<void>;
  deleteCreatureType: (id: string) => Promise<void>;

  seedIfEmpty: () => Promise<void>;
};

async function fetchAll(): Promise<AppState> {
  const [c, s, d, ct] = await Promise.all([
    supabase.from('cards').select('data'),
    supabase.from('skills').select('data'),
    supabase.from('damage_types').select('data'),
    supabase.from('creature_types').select('data'),
  ]);
  return {
    cards:         (c.data  ?? []).map(r => r.data as NPCCard),
    skills:        (s.data  ?? []).map(r => r.data as Skill),
    damageTypes:   (d.data  ?? []).map(r => r.data as DamageType),
    creatureTypes: (ct.data ?? []).map(r => r.data as CreatureType),
  };
}

async function upsertRow(table: string, row: EntityRow) {
  const { error } = await supabase.from(table).upsert({
    id: (row as { id: string }).id,
    data: row,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error(`[store] upsert ${table} failed:`, error);
}

async function deleteRow(table: string, id: string) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) console.error(`[store] delete ${table} failed:`, error);
}

export const useAppStore = create<AppStore>()((set, get) => ({
  cards: [],
  skills: [],
  damageTypes: [],
  creatureTypes: [],
  loading: false,
  loaded: false,
  error: null,

  hydrate: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const state = await fetchAll();
      set({ ...state, loading: false, loaded: true });
    } catch (e) {
      console.error('[store] hydrate failed:', e);
      set({ loading: false, error: (e as Error).message });
    }
  },

  update: (patch) => set(patch),

  // ── Cards ─────────────────────────────────────────────────────────────────
  saveCard: async (card) => {
    const { cards } = get();
    const exists = cards.some(c => c.id === card.id);
    set({ cards: exists ? cards.map(c => c.id === card.id ? card : c) : [...cards, card] });
    await upsertRow('cards', card);
  },
  deleteCard: async (id) => {
    set(state => ({ cards: state.cards.filter(c => c.id !== id) }));
    await deleteRow('cards', id);
  },

  // ── Skills ────────────────────────────────────────────────────────────────
  saveSkill: async (skill) => {
    const { skills } = get();
    const exists = skills.some(s => s.id === skill.id);
    set({ skills: exists ? skills.map(s => s.id === skill.id ? skill : s) : [...skills, skill] });
    await upsertRow('skills', skill);
  },
  deleteSkill: async (id) => {
    set(state => ({ skills: state.skills.filter(s => s.id !== id) }));
    await deleteRow('skills', id);
  },

  // ── Damage Types ──────────────────────────────────────────────────────────
  saveDamageType: async (dt) => {
    const { damageTypes } = get();
    const exists = damageTypes.some(d => d.id === dt.id);
    set({ damageTypes: exists ? damageTypes.map(d => d.id === dt.id ? dt : d) : [...damageTypes, dt] });
    await upsertRow('damage_types', dt);
  },
  deleteDamageType: async (id) => {
    set(state => ({ damageTypes: state.damageTypes.filter(d => d.id !== id) }));
    await deleteRow('damage_types', id);
  },

  // ── Creature Types ────────────────────────────────────────────────────────
  saveCreatureType: async (ct) => {
    const { creatureTypes } = get();
    const exists = creatureTypes.some(c => c.id === ct.id);
    set({ creatureTypes: exists ? creatureTypes.map(c => c.id === ct.id ? ct : c) : [...creatureTypes, ct] });
    await upsertRow('creature_types', ct);
  },
  deleteCreatureType: async (id) => {
    set(state => ({ creatureTypes: state.creatureTypes.filter(c => c.id !== id) }));
    await deleteRow('creature_types', id);
  },

  // ── Seed helpers ──────────────────────────────────────────────────────────
  seedIfEmpty: async () => {
    const { skills, damageTypes, creatureTypes } = get();
    if (skills.length || damageTypes.length || creatureTypes.length) return;
    // Push the built-in defaults from /src/store.ts up to the shared DB
    await Promise.all([
      ...seedState.skills.map(s => upsertRow('skills', s)),
      ...seedState.damageTypes.map(d => upsertRow('damage_types', d)),
      ...seedState.creatureTypes.map(c => upsertRow('creature_types', c)),
    ]);
    // Re-hydrate to pick up what we just wrote
    set({ ...seedState });
  },
}));

// ============================================================================
// Backward-compat shim: some existing components call `update({ skills: [...] })`
// or `update({ cards: [...] })` expecting a full-array replace. We intercept
// those and diff against current state to run the correct upsert/delete calls.
// ============================================================================
const rawUpdate = useAppStore.getState().update;
useAppStore.setState({
  update: (patch: Partial<AppState>) => {
    const prev = useAppStore.getState();
    (Object.keys(patch) as (keyof AppState)[]).forEach(key => {
      const table = TABLE[key as EntityKey];
      const nextArr = patch[key] as EntityRow[] | undefined;
      const prevArr = prev[key] as EntityRow[];
      if (!nextArr || !table) return;

      const nextIds = new Set(nextArr.map(r => (r as { id: string }).id));
      const prevById = new Map(prevArr.map(r => [(r as { id: string }).id, r]));

      // Deletes: was in prev, not in next
      for (const p of prevArr) {
        const id = (p as { id: string }).id;
        if (!nextIds.has(id)) deleteRow(table, id);
      }
      // Upserts: only rows that are new or changed (shallow JSON compare)
      for (const n of nextArr) {
        const id = (n as { id: string }).id;
        const prevRow = prevById.get(id);
        if (!prevRow || JSON.stringify(prevRow) !== JSON.stringify(n)) {
          upsertRow(table, n);
        }
      }
    });
    rawUpdate(patch);
  },
});
