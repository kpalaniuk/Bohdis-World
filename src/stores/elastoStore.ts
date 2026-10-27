import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FinishResult {
  isNewBest: boolean;
  firstClear: boolean;
}

interface ElastoState {
  bestTimes: Record<number, number>;
  unlockedLevel: number;
  completed: number[];
  loadedBestTimes: Record<string, number>;
  recordFinish: (levelIndex: number, ms: number) => FinishResult;
  unlockLevel: (levelIndex: number) => void;
  recordLoadedFinish: (sha256: string, ms: number) => boolean;
  resetElasto: () => void;
}

export const useElastoStore = create<ElastoState>()(
  persist(
    (set, get) => ({
      bestTimes: {},
      unlockedLevel: 0,
      completed: [],
      loadedBestTimes: {},
      unlockLevel: (levelIndex) => {
        set((state) => ({ unlockedLevel: Math.max(state.unlockedLevel, Math.min(9, levelIndex)) }));
      },
      recordFinish: (levelIndex, ms) => {
        const state = get();
        const previous = state.bestTimes[levelIndex];
        const firstClear = !state.completed.includes(levelIndex);
        const isNewBest = previous === undefined || ms < previous;
        set({
          bestTimes: isNewBest ? { ...state.bestTimes, [levelIndex]: ms } : state.bestTimes,
          unlockedLevel: Math.max(state.unlockedLevel, Math.min(9, levelIndex + 1)),
          completed: firstClear ? [...state.completed, levelIndex].sort((a, b) => a - b) : state.completed,
        });
        return { isNewBest, firstClear };
      },
      recordLoadedFinish: (sha256, ms) => {
        const previous = get().loadedBestTimes[sha256];
        const isNewBest = previous === undefined || ms < previous;
        if (isNewBest) set((state) => ({ loadedBestTimes: { ...state.loadedBestTimes, [sha256]: ms } }));
        return isNewBest;
      },
      resetElasto: () => set({ bestTimes: {}, unlockedLevel: 0, completed: [], loadedBestTimes: {} }),
    }),
    { name: 'bohdi-elasto' },
  ),
);
