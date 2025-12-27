'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Lock, Check, ShoppingBag, Sparkles } from 'lucide-react';
import { PixelCard } from '@/components/ui/PixelCard';
import { PixelButton } from '@/components/ui/PixelButton';
import { CoinDisplay } from '@/components/ui/CoinDisplay';
import { useAuth } from '@/contexts/AuthContext';
import { useCoinStore } from '@/stores/coinStore';
import { 
  useCharacterStore, 
  ACCESSORIES, 
  Accessory,
  AccessorySlot,
} from '@/stores/characterStore';

const SLOT_LABELS: Record<AccessorySlot, string> = {
  head: '👒 Head',
  body: '👕 Body',
  board: '🏄 Board',
  trail: '✨ Trail',
};

export default function ShopPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { coins, spendCoins } = useCoinStore();
  const { 
    ownedAccessories, 
    equippedAccessories,
    purchaseAccessory, 
    equipAccessory,
    unequipAccessory,
    getCharacter,
  } = useCharacterStore();
  
  const [selectedSlot, setSelectedSlot] = useState<AccessorySlot>('head');
  const [purchaseMessage, setPurchaseMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const character = getCharacter();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="font-pixel text-foamy-green animate-pulse">LOADING...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <PixelCard variant="glass" padding="lg" className="max-w-md text-center">
          <ShoppingBag size={48} className="text-gray-500 mx-auto mb-4" />
          <h1 className="font-pixel text-foamy-green text-lg mb-4">SHOP LOCKED</h1>
          <p className="font-lcd text-gray-300 mb-6">
            Sign in to access the accessory shop and customize your character!
          </p>
          <PixelButton variant="primary" onClick={() => router.push('/')}>
            SIGN IN
          </PixelButton>
        </PixelCard>
      </div>
    );
  }

  const slotAccessories = ACCESSORIES.filter(a => a.slot === selectedSlot);

  const handlePurchase = (accessory: Accessory) => {
    if (ownedAccessories.includes(accessory.id)) {
      // Already owned, equip or unequip
      if (equippedAccessories[accessory.slot] === accessory.id) {
        unequipAccessory(accessory.slot);
        setPurchaseMessage({ type: 'success', text: `Unequipped ${accessory.name}!` });
      } else {
        equipAccessory(accessory.id);
        setPurchaseMessage({ type: 'success', text: `Equipped ${accessory.name}!` });
      }
    } else {
      // Try to purchase
      if (coins >= accessory.price) {
        const success = spendCoins(accessory.price);
        if (success) {
          purchaseAccessory(accessory.id);
          equipAccessory(accessory.id);
          setPurchaseMessage({ type: 'success', text: `Purchased and equipped ${accessory.name}!` });
        }
      } else {
        setPurchaseMessage({ type: 'error', text: `Not enough coins! Need ${accessory.price - coins} more.` });
      }
    }

    setTimeout(() => setPurchaseMessage(null), 3000);
  };

  return (
    <div className="min-h-screen p-4 pt-20">
      <div className="max-w-4xl mx-auto">
        <PixelCard variant="glass" padding="lg">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-400 hover:text-foamy-green transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 
              className="font-pixel text-foamy-green text-lg flex-1"
              style={{ textShadow: '2px 2px 0px #2d2d2d' }}
            >
              ACCESSORY SHOP
            </h1>
            <CoinDisplay size="md" />
          </div>

          {/* Character Preview */}
          {character && (
            <div className="flex justify-center mb-6">
              <div 
                className="relative w-24 h-24 flex items-center justify-center border-4 border-pixel-black"
                style={{ 
                  backgroundColor: character.primaryColor,
                  boxShadow: '4px 4px 0px #2d2d2d'
                }}
              >
                <span className="text-5xl">{character.emoji}</span>
                
                {/* Show equipped accessories */}
                {Object.entries(equippedAccessories).map(([slot, accessoryId]) => {
                  const acc = ACCESSORIES.find(a => a.id === accessoryId);
                  if (!acc) return null;
                  return (
                    <div 
                      key={slot}
                      className="absolute text-sm"
                      style={{
                        top: slot === 'head' ? '-8px' : slot === 'trail' ? '50%' : 'auto',
                        left: slot === 'trail' ? '-16px' : '50%',
                        transform: slot === 'trail' ? 'translateY(-50%)' : 'translateX(-50%)',
                        bottom: slot === 'board' ? '-8px' : 'auto',
                      }}
                    >
                      {acc.preview}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Purchase Message */}
          {purchaseMessage && (
            <div 
              className={`mb-4 p-3 border-2 font-lcd text-sm text-center ${
                purchaseMessage.type === 'success' 
                  ? 'bg-green-900/50 border-foamy-green text-foamy-green'
                  : 'bg-red-900/50 border-red-500 text-red-300'
              }`}
            >
              {purchaseMessage.text}
            </div>
          )}

          {/* Slot Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {(Object.entries(SLOT_LABELS) as [AccessorySlot, string][]).map(([slot, label]) => (
              <button
                key={slot}
                onClick={() => setSelectedSlot(slot)}
                className={`
                  px-4 py-2 font-pixel text-xs border-4 border-pixel-black transition-all
                  ${selectedSlot === slot 
                    ? 'bg-foamy-green text-pixel-black' 
                    : 'bg-pixel-shadow text-white hover:bg-ocean-blue'
                  }
                `}
                style={{ boxShadow: '2px 2px 0px #1a1a1a' }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Accessories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {slotAccessories.map(accessory => {
              const isOwned = ownedAccessories.includes(accessory.id);
              const isEquipped = equippedAccessories[accessory.slot] === accessory.id;
              const canAfford = coins >= accessory.price;

              return (
                <div
                  key={accessory.id}
                  className={`
                    relative p-4 border-4 transition-all
                    ${isEquipped 
                      ? 'border-foamy-green bg-foamy-green/10' 
                      : isOwned 
                        ? 'border-ocean-blue bg-ocean-blue/10' 
                        : 'border-pixel-shadow bg-pixel-black/50'
                    }
                  `}
                  style={{ boxShadow: '3px 3px 0px #1a1a1a' }}
                >
                  {/* Equipped badge */}
                  {isEquipped && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-foamy-green border-2 border-pixel-black flex items-center justify-center">
                      <Check size={14} className="text-pixel-black" />
                    </div>
                  )}

                  {/* Preview */}
                  <div className="text-center mb-3">
                    <span className="text-4xl">{accessory.preview}</span>
                  </div>

                  {/* Name */}
                  <h3 className="font-pixel text-xs text-white text-center mb-1">
                    {accessory.name}
                  </h3>

                  {/* Description */}
                  <p className="font-lcd text-gray-400 text-xs text-center mb-3">
                    {accessory.description}
                  </p>

                  {/* Price / Action */}
                  {isOwned ? (
                    <button
                      onClick={() => handlePurchase(accessory)}
                      className={`
                        w-full py-2 font-pixel text-xs border-2 transition-all
                        ${isEquipped
                          ? 'bg-pixel-shadow border-gray-600 text-gray-400 hover:bg-red-900/50 hover:border-red-500 hover:text-red-300'
                          : 'bg-ocean-blue border-pixel-black text-white hover:bg-foamy-green hover:text-pixel-black'
                        }
                      `}
                    >
                      {isEquipped ? 'UNEQUIP' : 'EQUIP'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePurchase(accessory)}
                      disabled={!canAfford}
                      className={`
                        w-full py-2 font-pixel text-xs border-2 transition-all flex items-center justify-center gap-2
                        ${canAfford
                          ? 'bg-yellow-600 border-pixel-black text-pixel-black hover:bg-yellow-500'
                          : 'bg-pixel-shadow border-gray-700 text-gray-500 cursor-not-allowed'
                        }
                      `}
                    >
                      {canAfford ? (
                        <>
                          <Sparkles size={12} />
                          {accessory.price} COINS
                        </>
                      ) : (
                        <>
                          <Lock size={12} />
                          {accessory.price} COINS
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Info */}
          <div className="mt-6 pt-4 border-t-2 border-pixel-shadow text-center">
            <p className="font-lcd text-gray-500 text-xs">
              Earn coins by solving math problems! Accessories are cosmetic and don&apos;t affect gameplay.
            </p>
          </div>
        </PixelCard>
      </div>
    </div>
  );
}

