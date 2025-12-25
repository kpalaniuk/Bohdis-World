import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CoinState {
  coins: number;
  totalEarned: number;
  lastEarned: number;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  setCoins: (coins: number, totalEarned?: number) => void;
  resetLastEarned: () => void;
  resetCoins: () => void;
}

export const useCoinStore = create<CoinState>()(
  persist(
    (set, get) => ({
      coins: 0,
      totalEarned: 0,
      lastEarned: 0,

      addCoins: (amount: number) => {
        set((state) => ({
          coins: state.coins + amount,
          totalEarned: state.totalEarned + amount,
          lastEarned: amount,
        }));
      },

      spendCoins: (amount: number) => {
        const { coins } = get();
        if (coins >= amount) {
          set({ coins: coins - amount, lastEarned: 0 });
          return true;
        }
        return false;
      },

      setCoins: (coins: number, totalEarned?: number) => {
        set((state) => ({
          coins,
          totalEarned: totalEarned ?? state.totalEarned,
          lastEarned: 0,
        }));
      },

      resetLastEarned: () => {
        set({ lastEarned: 0 });
      },
      
      resetCoins: () => {
        set({ coins: 0, totalEarned: 0, lastEarned: 0 });
      },
    }),
    {
      name: 'bohdi-coins',
    }
  )
);

