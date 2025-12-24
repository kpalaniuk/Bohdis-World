'use client';

import { useState, useEffect } from 'react';
import { useCoinStore } from '@/stores/coinStore';

interface CoinDisplayProps {
  size?: 'sm' | 'md' | 'lg';
  showTotal?: boolean;
  className?: string;
}

export function CoinDisplay({ size = 'md', showTotal = false, className = '' }: CoinDisplayProps) {
  const { coins, totalEarned, lastEarned } = useCoinStore();
  const [showPlusAnimation, setShowPlusAnimation] = useState(false);
  const [animationAmount, setAnimationAmount] = useState(0);

  useEffect(() => {
    if (lastEarned > 0) {
      setAnimationAmount(lastEarned);
      setShowPlusAnimation(true);
      const timer = setTimeout(() => {
        setShowPlusAnimation(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [lastEarned, coins]);

  const sizeStyles = {
    sm: { coin: 'w-5 h-5', text: 'text-sm', container: 'gap-1.5' },
    md: { coin: 'w-7 h-7', text: 'text-lg', container: 'gap-2' },
    lg: { coin: 'w-10 h-10', text: 'text-2xl', container: 'gap-3' },
  };

  const styles = sizeStyles[size];

  return (
    <div className={`relative flex items-center ${styles.container} ${className}`}>
      {/* Pixel art coin */}
      <div className={`relative ${styles.coin}`}>
        <svg
          viewBox="0 0 16 16"
          className="w-full h-full coin-bounce"
          style={{ imageRendering: 'pixelated' }}
        >
          {/* Gold coin base */}
          <rect x="4" y="1" width="8" height="1" fill="#FFD700" />
          <rect x="2" y="2" width="12" height="1" fill="#FFD700" />
          <rect x="1" y="3" width="14" height="1" fill="#FFD700" />
          <rect x="1" y="4" width="14" height="8" fill="#FFD700" />
          <rect x="1" y="12" width="14" height="1" fill="#FFD700" />
          <rect x="2" y="13" width="12" height="1" fill="#FFD700" />
          <rect x="4" y="14" width="8" height="1" fill="#FFD700" />
          
          {/* Highlight */}
          <rect x="3" y="3" width="2" height="1" fill="#FFF8DC" />
          <rect x="2" y="4" width="2" height="2" fill="#FFF8DC" />
          
          {/* Shadow */}
          <rect x="12" y="5" width="2" height="6" fill="#DAA520" />
          <rect x="11" y="11" width="3" height="1" fill="#DAA520" />
          <rect x="10" y="12" width="4" height="1" fill="#B8860B" />
          
          {/* Dollar sign or star */}
          <rect x="7" y="4" width="2" height="1" fill="#B8860B" />
          <rect x="6" y="5" width="1" height="1" fill="#B8860B" />
          <rect x="7" y="6" width="2" height="1" fill="#B8860B" />
          <rect x="9" y="7" width="1" height="1" fill="#B8860B" />
          <rect x="7" y="8" width="2" height="1" fill="#B8860B" />
          <rect x="6" y="9" width="1" height="1" fill="#B8860B" />
          <rect x="7" y="10" width="2" height="1" fill="#B8860B" />
        </svg>
      </div>

      {/* Coin count */}
      <div className="flex flex-col">
        <span 
          className={`font-pixel ${styles.text} text-foamy-green leading-none`}
          style={{ textShadow: '0 0 8px rgba(152, 216, 170, 0.5)' }}
        >
          {coins.toLocaleString()}
        </span>
        {showTotal && (
          <span className="text-xs text-gray-400 font-lcd">
            Total: {totalEarned.toLocaleString()}
          </span>
        )}
      </div>

      {/* Plus coins animation */}
      {showPlusAnimation && (
        <span 
          className="absolute -top-2 left-1/2 -translate-x-1/2 font-pixel text-foamy-green plus-coins whitespace-nowrap"
          style={{ textShadow: '0 0 10px rgba(152, 216, 170, 0.8)' }}
        >
          +{animationAmount}
        </span>
      )}
    </div>
  );
}

export default CoinDisplay;

