import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Character types available for selection
export type CharacterType = 'cat' | 'surfer' | 'coach' | 'dog' | 'robot' | 'runner';

// Accessory categories
export type AccessorySlot = 'head' | 'body' | 'board' | 'trail';

// Accessory definition
export interface Accessory {
  id: string;
  name: string;
  slot: AccessorySlot;
  price: number;
  description: string;
  preview: string; // Color or emoji for preview
}

// Character strengths for different games
export interface CharacterStrengths {
  mathSpeed: number;      // Bonus time for math problems
  jumpHeight: number;     // Jump height multiplier
  coinBonus: number;      // Extra coins earned percentage
  shieldDuration: number; // Shield power-up duration
  doubleJump: number;     // Double jump height boost
}

// Character definition
export interface CharacterDef {
  type: CharacterType;
  name: string;
  description: string;
  strengths: CharacterStrengths;
  primaryColor: string;
  secondaryColor: string;
  emoji: string;
}

// Available characters with their traits
export const CHARACTERS: Record<CharacterType, CharacterDef> = {
  cat: {
    type: 'cat',
    name: 'Whiskers',
    description: 'Quick and agile! Great at jumping over obstacles.',
    strengths: {
      mathSpeed: 0,
      jumpHeight: 1.15,
      coinBonus: 0,
      shieldDuration: 1,
      doubleJump: 1.2,
    },
    primaryColor: '#FF9F43',
    secondaryColor: '#FFD93D',
    emoji: '🐱',
  },
  surfer: {
    type: 'surfer',
    name: 'Wave Rider',
    description: 'Balanced and cool! Good at everything.',
    strengths: {
      mathSpeed: 1,
      jumpHeight: 1,
      coinBonus: 0.1,
      shieldDuration: 1.1,
      doubleJump: 1,
    },
    primaryColor: '#4A90D9',
    secondaryColor: '#FFD700',
    emoji: '🏄',
  },
  coach: {
    type: 'coach',
    name: 'Coach Max',
    description: 'Smart and strategic! Bonus time on math problems.',
    strengths: {
      mathSpeed: 3,
      jumpHeight: 0.95,
      coinBonus: 0.05,
      shieldDuration: 1.2,
      doubleJump: 0.9,
    },
    primaryColor: '#E74C3C',
    secondaryColor: '#FFFFFF',
    emoji: '🏋️',
  },
  dog: {
    type: 'dog',
    name: 'Buddy',
    description: 'Loyal and energetic! Earns extra coins.',
    strengths: {
      mathSpeed: 0,
      jumpHeight: 1.05,
      coinBonus: 0.25,
      shieldDuration: 1,
      doubleJump: 1.1,
    },
    primaryColor: '#A0522D',
    secondaryColor: '#DEB887',
    emoji: '🐕',
  },
  robot: {
    type: 'robot',
    name: 'Bit-3000',
    description: 'Precise and powerful! Extra shield protection.',
    strengths: {
      mathSpeed: 2,
      jumpHeight: 1,
      coinBonus: 0,
      shieldDuration: 1.5,
      doubleJump: 1,
    },
    primaryColor: '#95A5A6',
    secondaryColor: '#3498DB',
    emoji: '🤖',
  },
  runner: {
    type: 'runner',
    name: 'Dash',
    description: 'Fast and furious! Master of the obstacle course.',
    strengths: {
      mathSpeed: 0,
      jumpHeight: 1.1,
      coinBonus: 0.15,
      shieldDuration: 0.9,
      doubleJump: 1.15,
    },
    primaryColor: '#9B59B6',
    secondaryColor: '#F39C12',
    emoji: '🏃',
  },
};

// Available accessories
export const ACCESSORIES: Accessory[] = [
  // Head accessories
  { id: 'crown', name: 'Golden Crown', slot: 'head', price: 100, description: 'Rule the waves like royalty!', preview: '👑' },
  { id: 'cap', name: 'Cool Cap', slot: 'head', price: 25, description: 'Classic backwards cap style.', preview: '🧢' },
  { id: 'headphones', name: 'Pixel Headphones', slot: 'head', price: 50, description: 'Listen to 8-bit beats!', preview: '🎧' },
  { id: 'sunglasses', name: 'Shades', slot: 'head', price: 30, description: 'Too cool for the sun.', preview: '🕶️' },
  { id: 'wizard-hat', name: 'Wizard Hat', slot: 'head', price: 75, description: 'Magical math powers!', preview: '🧙' },
  
  // Body accessories
  { id: 'cape', name: 'Hero Cape', slot: 'body', price: 60, description: 'Every hero needs a cape!', preview: '🦸' },
  { id: 'wetsuit', name: 'Pro Wetsuit', slot: 'body', price: 40, description: 'Premium surfing gear.', preview: '🩱' },
  { id: 'jersey', name: 'Sports Jersey', slot: 'body', price: 35, description: 'Team spirit!', preview: '👕' },
  
  // Board accessories
  { id: 'flame-board', name: 'Flame Board', slot: 'board', price: 80, description: 'Ride the fire!', preview: '🔥' },
  { id: 'rainbow-board', name: 'Rainbow Board', slot: 'board', price: 90, description: 'Colorful and proud!', preview: '🌈' },
  { id: 'galaxy-board', name: 'Galaxy Board', slot: 'board', price: 120, description: 'Out of this world!', preview: '🌌' },
  
  // Trail effects
  { id: 'sparkle-trail', name: 'Sparkle Trail', slot: 'trail', price: 50, description: 'Leave a sparkly path!', preview: '✨' },
  { id: 'star-trail', name: 'Star Trail', slot: 'trail', price: 70, description: 'Shooting star effect!', preview: '⭐' },
  { id: 'heart-trail', name: 'Heart Trail', slot: 'trail', price: 45, description: 'Spread the love!', preview: '💖' },
];

interface CharacterState {
  // Selected character type
  selectedCharacter: CharacterType | null;
  
  // Has the user completed character setup
  hasSelectedCharacter: boolean;
  
  // Owned accessories
  ownedAccessories: string[];
  
  // Equipped accessories by slot
  equippedAccessories: Partial<Record<AccessorySlot, string>>;
  
  // Actions
  selectCharacter: (type: CharacterType) => void;
  purchaseAccessory: (accessoryId: string) => void;
  equipAccessory: (accessoryId: string) => void;
  unequipAccessory: (slot: AccessorySlot) => void;
  hasAccessory: (accessoryId: string) => boolean;
  getEquippedAccessory: (slot: AccessorySlot) => Accessory | null;
  getCharacter: () => CharacterDef | null;
  getStrengths: () => CharacterStrengths | null;
  resetCharacter: () => void;
  
  // Sync methods for cloud storage
  setCharacterData: (data: {
    selectedCharacter?: CharacterType | null;
    hasSelectedCharacter?: boolean;
    ownedAccessories?: string[];
    equippedAccessories?: Partial<Record<AccessorySlot, string>>;
  }) => void;
}

export const useCharacterStore = create<CharacterState>()(
  persist(
    (set, get) => ({
      selectedCharacter: null,
      hasSelectedCharacter: false,
      ownedAccessories: [],
      equippedAccessories: {},

      selectCharacter: (type: CharacterType) => {
        set({
          selectedCharacter: type,
          hasSelectedCharacter: true,
        });
      },

      purchaseAccessory: (accessoryId: string) => {
        const state = get();
        if (!state.ownedAccessories.includes(accessoryId)) {
          set({
            ownedAccessories: [...state.ownedAccessories, accessoryId],
          });
        }
      },

      equipAccessory: (accessoryId: string) => {
        const accessory = ACCESSORIES.find(a => a.id === accessoryId);
        if (accessory && get().ownedAccessories.includes(accessoryId)) {
          set(state => ({
            equippedAccessories: {
              ...state.equippedAccessories,
              [accessory.slot]: accessoryId,
            },
          }));
        }
      },

      unequipAccessory: (slot: AccessorySlot) => {
        set(state => {
          const newEquipped = { ...state.equippedAccessories };
          delete newEquipped[slot];
          return { equippedAccessories: newEquipped };
        });
      },

      hasAccessory: (accessoryId: string) => {
        return get().ownedAccessories.includes(accessoryId);
      },

      getEquippedAccessory: (slot: AccessorySlot) => {
        const accessoryId = get().equippedAccessories[slot];
        if (!accessoryId) return null;
        return ACCESSORIES.find(a => a.id === accessoryId) || null;
      },

      getCharacter: () => {
        const type = get().selectedCharacter;
        if (!type) return null;
        return CHARACTERS[type];
      },

      getStrengths: () => {
        const character = get().getCharacter();
        return character?.strengths || null;
      },

      resetCharacter: () => {
        set({
          selectedCharacter: null,
          hasSelectedCharacter: false,
          ownedAccessories: [],
          equippedAccessories: {},
        });
      },

      setCharacterData: (data) => {
        set(state => ({
          ...state,
          ...data,
        }));
      },
    }),
    {
      name: 'bohdi-character',
    }
  )
);

