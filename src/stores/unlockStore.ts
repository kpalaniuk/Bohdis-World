import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameTheme, PowerUp } from './gameStore';

export interface UnlockableTheme {
  id: GameTheme;
  name: string;
  price: number;
  description: string;
}

export interface UnlockablePowerUp {
  id: PowerUp;
  name: string;
  price: number;
  description: string;
  quantity: number;
}

export const AVAILABLE_THEMES: UnlockableTheme[] = [
  { id: 'beach', name: 'Beach Day', price: 0, description: 'Classic daytime ocean vibes' },
  { id: 'sunset', name: 'Sunset Surf', price: 50, description: 'Golden hour at the beach' },
  { id: 'night', name: 'Night Waves', price: 75, description: 'Moonlit waves and stars' },
  { id: 'tropical', name: 'Tropical Paradise', price: 100, description: 'Lush palm trees and crystal waters' },
];

export const AVAILABLE_POWERUPS: Omit<UnlockablePowerUp, 'quantity'>[] = [
  { id: 'double-jump', name: 'Double Jump', price: 25, description: 'Jump again mid-air!' },
  { id: 'shield', name: 'Shield', price: 25, description: 'Survive one collision' },
  { id: 'slow-mo', name: 'Slow-Mo', price: 25, description: 'Slow down time briefly' },
];

interface UnlockState {
  unlockedThemes: GameTheme[];
  unlockedPowerUps: PowerUp[]; // Derived from ownedPowerUps
  ownedPowerUps: Record<PowerUp, number>;
  
  // Actions
  unlockTheme: (theme: GameTheme) => void;
  purchasePowerUp: (powerUp: PowerUp) => void;
  buyPowerUp: (powerUp: PowerUp) => void; // Alias for purchasePowerUp
  usePowerUp: (powerUp: PowerUp) => boolean;
  hasTheme: (theme: GameTheme) => boolean;
  getPowerUpCount: (powerUp: PowerUp) => number;
  setUnlockedThemes: (themes: GameTheme[]) => void;
  setOwnedPowerUps: (powerUps: Record<PowerUp, number>) => void;
}

export const useUnlockStore = create<UnlockState>()(
  persist(
    (set, get) => ({
      unlockedThemes: ['beach'],
      unlockedPowerUps: [], // Will be computed from ownedPowerUps
      ownedPowerUps: {
        'double-jump': 0,
        'shield': 0,
        'slow-mo': 0,
      },

      unlockTheme: (theme: GameTheme) => {
        set((state) => ({
          unlockedThemes: state.unlockedThemes.includes(theme)
            ? state.unlockedThemes
            : [...state.unlockedThemes, theme],
        }));
      },

      purchasePowerUp: (powerUp: PowerUp) => {
        set((state) => ({
          ownedPowerUps: {
            ...state.ownedPowerUps,
            [powerUp]: state.ownedPowerUps[powerUp] + 1,
          },
        }));
      },

      buyPowerUp: (powerUp: PowerUp) => {
        // Alias for purchasePowerUp
        set((state) => ({
          ownedPowerUps: {
            ...state.ownedPowerUps,
            [powerUp]: state.ownedPowerUps[powerUp] + 1,
          },
        }));
      },

      usePowerUp: (powerUp: PowerUp) => {
        const count = get().ownedPowerUps[powerUp];
        if (count > 0) {
          set((state) => ({
            ownedPowerUps: {
              ...state.ownedPowerUps,
              [powerUp]: state.ownedPowerUps[powerUp] - 1,
            },
          }));
          return true;
        }
        return false;
      },

      hasTheme: (theme: GameTheme) => {
        return get().unlockedThemes.includes(theme);
      },

      getPowerUpCount: (powerUp: PowerUp) => {
        return get().ownedPowerUps[powerUp];
      },

      setUnlockedThemes: (themes: GameTheme[]) => {
        set({ unlockedThemes: themes });
      },

      setOwnedPowerUps: (powerUps: Record<PowerUp, number>) => {
        set({ ownedPowerUps: powerUps });
      },
    }),
    {
      name: 'bohdi-unlocks',
    }
  )
);

