
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppState, NPCCard } from '../types';
import { seedState } from '../store';

interface AppStore extends AppState {
  update: (patch: Partial<AppState>) => void;
  saveCard: (card: NPCCard) => void;
  deleteCard: (id: string) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      cards: [],
      skills: [],
      damageTypes: [],
      creatureTypes: [],

      update: (patch) => set(patch),

      saveCard: (card) => {
        const { cards } = get();
        const cardExists = cards.some(c => c.id === card.id);
        const nextCards = cardExists
          ? cards.map(c => c.id === card.id ? card : c)
          : [...cards, card];
        set({ cards: nextCards });
      },

      deleteCard: (id) => set(state => ({
        cards: state.cards.filter(c => c.id !== id)
      })),
    }),
    {
      name: 'npc-card-forge-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state && state.skills.length === 0 && state.damageTypes.length === 0 && state.creatureTypes.length === 0) {
          Object.assign(state, seedState);
        }
      },
    }
  )
);
