import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Checkpoint {
  altitude: number;
  reached: boolean;
}

interface SkyClimberState {
  // Game progress
  highestAltitude: number;
  currentCheckpoint: number;
  totalCoinsCollected: number;
  timesReachedTop: number;
  
  // Checkpoints (every 1000m)
  checkpoints: Checkpoint[];
  
  // Current run stats
  currentAltitude: number;
  currentLives: number;
  hasDoubleJump: boolean;
  
  // Actions
  setCurrentAltitude: (altitude: number) => void;
  updateHighestAltitude: (altitude: number) => void;
  reachCheckpoint: (checkpointIndex: number) => void;
  setCurrentCheckpoint: (index: number) => void;
  loseLife: () => boolean; // returns true if game over
  resetLives: () => void;
  collectCoin: () => void;
  activateDoubleJump: () => void;
  deactivateDoubleJump: () => void;
  reachTop: () => void;
  resetRun: () => void;
  resetAllProgress: () => void;
}

// Checkpoints every 1000m up to 5000m
const INITIAL_CHECKPOINTS: Checkpoint[] = [
  { altitude: 0, reached: true },      // Start
  { altitude: 1000, reached: false },
  { altitude: 2000, reached: false },
  { altitude: 3000, reached: false },
  { altitude: 4000, reached: false },
  { altitude: 5000, reached: false },  // Goal!
];

export const useSkyClimberStore = create<SkyClimberState>()(
  persist(
    (set, get) => ({
      highestAltitude: 0,
      currentCheckpoint: 0,
      totalCoinsCollected: 0,
      timesReachedTop: 0,
      checkpoints: [...INITIAL_CHECKPOINTS],
      currentAltitude: 0,
      currentLives: 3,
      hasDoubleJump: false,

      setCurrentAltitude: (altitude: number) => {
        set({ currentAltitude: altitude });
      },

      updateHighestAltitude: (altitude: number) => {
        const { highestAltitude } = get();
        if (altitude > highestAltitude) {
          set({ highestAltitude: altitude });
        }
      },

      reachCheckpoint: (checkpointIndex: number) => {
        const { checkpoints } = get();
        const newCheckpoints = [...checkpoints];
        if (checkpointIndex < newCheckpoints.length) {
          newCheckpoints[checkpointIndex].reached = true;
          set({ 
            checkpoints: newCheckpoints,
            currentCheckpoint: checkpointIndex,
          });
        }
      },

      setCurrentCheckpoint: (index: number) => {
        set({ currentCheckpoint: index });
      },

      loseLife: () => {
        const { currentLives } = get();
        const newLives = currentLives - 1;
        set({ currentLives: newLives });
        return newLives <= 0;
      },

      resetLives: () => {
        set({ currentLives: 3 });
      },

      collectCoin: () => {
        set((state) => ({ totalCoinsCollected: state.totalCoinsCollected + 1 }));
      },

      activateDoubleJump: () => {
        set({ hasDoubleJump: true });
      },

      deactivateDoubleJump: () => {
        set({ hasDoubleJump: false });
      },

      reachTop: () => {
        set((state) => ({ timesReachedTop: state.timesReachedTop + 1 }));
      },

      resetRun: () => {
        const { currentCheckpoint, checkpoints } = get();
        const checkpointAltitude = checkpoints[currentCheckpoint]?.altitude || 0;
        set({ 
          currentAltitude: checkpointAltitude,
          currentLives: 3,
          hasDoubleJump: false,
        });
      },

      resetAllProgress: () => {
        set({
          highestAltitude: 0,
          currentCheckpoint: 0,
          totalCoinsCollected: 0,
          timesReachedTop: 0,
          checkpoints: [...INITIAL_CHECKPOINTS],
          currentAltitude: 0,
          currentLives: 3,
          hasDoubleJump: false,
        });
      },
    }),
    {
      name: 'bohdi-sky-climber',
      partialize: (state) => ({
        highestAltitude: state.highestAltitude,
        currentCheckpoint: state.currentCheckpoint,
        totalCoinsCollected: state.totalCoinsCollected,
        timesReachedTop: state.timesReachedTop,
        checkpoints: state.checkpoints,
      }),
    }
  )
);

