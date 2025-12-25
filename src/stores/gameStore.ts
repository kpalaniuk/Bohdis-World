import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PowerUp = 'double-jump' | 'shield' | 'slow-mo';
export type GameTheme = 'beach' | 'sunset' | 'night' | 'tropical';

interface GameState {
  // Gate state
  isUnlocked: boolean;
  jumpCount: number;
  hasCompletedGateEver: boolean;
  
  // Game state
  score: number;
  highScore: number;
  isPaused: boolean;
  isPlaying: boolean;
  
  // Settings
  soundEnabled: boolean;
  
  // Power-ups & themes
  activePowerUps: PowerUp[];
  currentTheme: GameTheme;
  
  // Actions
  incrementJumpCount: () => void;
  unlockSite: () => void;
  setScore: (score: number) => void;
  setHighScore: (score: number) => void;
  updateHighScore: (score: number) => void;
  setPaused: (paused: boolean) => void;
  setPlaying: (playing: boolean) => void;
  activatePowerUp: (powerUp: PowerUp) => void;
  deactivatePowerUp: (powerUp: PowerUp) => void;
  setTheme: (theme: GameTheme) => void;
  resetGame: () => void;
  setGateCompleted: (completed: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      isUnlocked: false,
      jumpCount: 0,
      hasCompletedGateEver: false,
      score: 0,
      highScore: 0,
      isPaused: false,
      isPlaying: false,
      soundEnabled: true,
      activePowerUps: [],
      currentTheme: 'beach',

      incrementJumpCount: () => {
        const newCount = get().jumpCount + 1;
        set({ jumpCount: newCount });
        
        if (newCount >= 3) {
          set({ isUnlocked: true, hasCompletedGateEver: true });
        }
      },

      unlockSite: () => {
        set({ isUnlocked: true, hasCompletedGateEver: true });
      },

      setScore: (score: number) => {
        set({ score });
      },

      setHighScore: (score: number) => {
        set({ highScore: score });
      },

      updateHighScore: (score: number) => {
        const { highScore } = get();
        if (score > highScore) {
          set({ highScore: score });
        }
      },

      setPaused: (paused: boolean) => {
        set({ isPaused: paused });
      },

      setPlaying: (playing: boolean) => {
        set({ isPlaying: playing });
      },

      activatePowerUp: (powerUp: PowerUp) => {
        set((state) => ({
          activePowerUps: state.activePowerUps.includes(powerUp)
            ? state.activePowerUps
            : [...state.activePowerUps, powerUp],
        }));
      },

      deactivatePowerUp: (powerUp: PowerUp) => {
        set((state) => ({
          activePowerUps: state.activePowerUps.filter((p) => p !== powerUp),
        }));
      },

      setTheme: (theme: GameTheme) => {
        set({ currentTheme: theme });
      },

      resetGame: () => {
        set({
          score: 0,
          highScore: 0,
          isPaused: false,
          isPlaying: false,
          activePowerUps: [],
          currentTheme: 'beach',
        });
      },

      setGateCompleted: (completed: boolean) => {
        set({ 
          hasCompletedGateEver: completed,
          isUnlocked: completed,
        });
      },
      
      setSoundEnabled: (enabled: boolean) => {
        set({ soundEnabled: enabled });
      },
    }),
    {
      name: 'bohdi-game',
      partialize: (state) => ({
        hasCompletedGateEver: state.hasCompletedGateEver,
        highScore: state.highScore,
        currentTheme: state.currentTheme,
        soundEnabled: state.soundEnabled,
      }),
    }
  )
);

