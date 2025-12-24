'use client';

import { useState } from 'react';
import { X, Palette, Zap, Check } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { PixelButton } from '@/components/ui/PixelButton';
import { CoinDisplay } from '@/components/ui/CoinDisplay';
import { useCoinStore } from '@/stores/coinStore';
import { useUnlockStore, AVAILABLE_THEMES, AVAILABLE_POWERUPS } from '@/stores/unlockStore';
import { useGameStore, GameTheme } from '@/stores/gameStore';
import { saveUserProgress } from '@/lib/syncProgress';

interface CoinShopProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CoinShop({ isOpen, onClose }: CoinShopProps) {
  const { user, isSignedIn } = useUser();
  const { coins, spendCoins } = useCoinStore();
  const { unlockedThemes, ownedPowerUps, unlockTheme, purchasePowerUp, hasTheme } = useUnlockStore();
  const { currentTheme, setTheme } = useGameStore();
  
  const [tab, setTab] = useState<'themes' | 'powerups'>('themes');
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePurchaseTheme = async (themeId: GameTheme, price: number) => {
    if (price === 0 || hasTheme(themeId)) {
      setTheme(themeId);
      setPurchaseMessage(`Theme "${themeId}" activated!`);
    } else if (spendCoins(price)) {
      unlockTheme(themeId);
      setTheme(themeId);
      setPurchaseMessage(`Theme "${themeId}" unlocked!`);
      
      // Save to cloud
      if (isSignedIn && user?.id) {
        saveUserProgress(user.id, {
          coins: coins - price,
          unlockedThemes: [...unlockedThemes, themeId],
        });
      }
    } else {
      setPurchaseMessage('Not enough coins!');
    }
    
    setTimeout(() => setPurchaseMessage(null), 2000);
  };

  const handlePurchasePowerUp = async (powerUpId: string, price: number) => {
    if (spendCoins(price)) {
      purchasePowerUp(powerUpId as 'double-jump' | 'shield' | 'slow-mo');
      setPurchaseMessage(`Power-up purchased!`);
      
      // Save to cloud
      if (isSignedIn && user?.id) {
        saveUserProgress(user.id, {
          coins: coins - price,
          ownedPowerUps,
        });
      }
    } else {
      setPurchaseMessage('Not enough coins!');
    }
    
    setTimeout(() => setPurchaseMessage(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-pixel-black/80"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-lg bg-pixel-black border-4 border-foamy-green p-6 slide-up"
        style={{ boxShadow: '8px 8px 0px #2d2d2d' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 
            className="font-pixel text-foamy-green text-xl mb-2"
            style={{ textShadow: '3px 3px 0px #2d2d2d' }}
          >
            COIN SHOP
          </h2>
          <CoinDisplay size="md" showTotal className="justify-center" />
        </div>

        {/* Purchase message */}
        {purchaseMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-ocean-blue text-white font-pixel text-xs px-4 py-2 border-2 border-pixel-black z-10">
            {purchaseMessage}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('themes')}
            className={`
              flex-1 py-2 font-pixel text-xs
              border-4 border-pixel-black
              flex items-center justify-center gap-2
              transition-all
              ${tab === 'themes' 
                ? 'bg-foamy-green text-pixel-black' 
                : 'bg-pixel-shadow text-white hover:bg-gray-600'
              }
            `}
            style={{ 
              boxShadow: tab === 'themes' 
                ? 'inset 2px 2px 0px rgba(0,0,0,0.2)' 
                : '3px 3px 0px #1a1a1a',
            }}
          >
            <Palette size={16} />
            Themes
          </button>
          <button
            onClick={() => setTab('powerups')}
            className={`
              flex-1 py-2 font-pixel text-xs
              border-4 border-pixel-black
              flex items-center justify-center gap-2
              transition-all
              ${tab === 'powerups' 
                ? 'bg-ocean-blue text-white' 
                : 'bg-pixel-shadow text-white hover:bg-gray-600'
              }
            `}
            style={{ 
              boxShadow: tab === 'powerups' 
                ? 'inset 2px 2px 0px rgba(0,0,0,0.2)' 
                : '3px 3px 0px #1a1a1a',
            }}
          >
            <Zap size={16} />
            Power-Ups
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {tab === 'themes' && (
            <>
              {AVAILABLE_THEMES.map((theme) => {
                const owned = hasTheme(theme.id);
                const active = currentTheme === theme.id;
                const canAfford = coins >= theme.price;

                return (
                  <div
                    key={theme.id}
                    className={`
                      flex items-center justify-between
                      p-3 border-2 border-pixel-shadow
                      ${active ? 'bg-foamy-green/20' : 'bg-pixel-shadow/50'}
                    `}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-pixel text-xs text-white">{theme.name}</span>
                        {active && <span className="text-foamy-green text-xs">(Active)</span>}
                      </div>
                      <p className="font-lcd text-gray-400 text-sm">{theme.description}</p>
                    </div>
                    
                    <div className="ml-4">
                      {owned ? (
                        active ? (
                          <span className="text-foamy-green">
                            <Check size={20} />
                          </span>
                        ) : (
                          <PixelButton
                            size="sm"
                            variant="secondary"
                            onClick={() => handlePurchaseTheme(theme.id, 0)}
                          >
                            Use
                          </PixelButton>
                        )
                      ) : (
                        <PixelButton
                          size="sm"
                          variant={canAfford ? 'primary' : 'ghost'}
                          disabled={!canAfford}
                          onClick={() => handlePurchaseTheme(theme.id, theme.price)}
                        >
                          {theme.price} 🪙
                        </PixelButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {tab === 'powerups' && (
            <>
              {AVAILABLE_POWERUPS.map((powerUp) => {
                const owned = ownedPowerUps[powerUp.id] || 0;
                const canAfford = coins >= powerUp.price;

                return (
                  <div
                    key={powerUp.id}
                    className="flex items-center justify-between p-3 border-2 border-pixel-shadow bg-pixel-shadow/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-pixel text-xs text-white">{powerUp.name}</span>
                        {owned > 0 && (
                          <span className="bg-ocean-blue text-white text-xs px-2 py-0.5 font-pixel">
                            x{owned}
                          </span>
                        )}
                      </div>
                      <p className="font-lcd text-gray-400 text-sm">{powerUp.description}</p>
                    </div>
                    
                    <div className="ml-4">
                      <PixelButton
                        size="sm"
                        variant={canAfford ? 'primary' : 'ghost'}
                        disabled={!canAfford}
                        onClick={() => handlePurchasePowerUp(powerUp.id, powerUp.price)}
                      >
                        {powerUp.price} 🪙
                      </PixelButton>
                    </div>
                  </div>
                );
              })}
              
              <p className="font-lcd text-gray-500 text-sm text-center mt-4">
                Power-ups are used automatically in the background game!
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t-2 border-pixel-shadow text-center">
          <p className="font-lcd text-gray-400 text-sm">
            Earn more coins by solving math problems!
          </p>
        </div>
      </div>
    </div>
  );
}

export default CoinShop;

