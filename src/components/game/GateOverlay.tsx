'use client';

import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useUser } from '@clerk/nextjs';
import { loadUserProgress, saveUserProgress } from '@/lib/syncProgress';
import confetti from 'canvas-confetti';

interface GateOverlayProps {
  onUnlock: () => void;
}

export function GateOverlay({ onUnlock }: GateOverlayProps) {
  const { user, isSignedIn } = useUser();
  const { 
    jumpCount, 
    unlockSite, 
    hasCompletedGateEver,
    setGateCompleted,
  } = useGameStore();
  
  const [isChecking, setIsChecking] = useState(true);
  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);
  const hasUnlockedRef = useRef(false);

  // Check if returning user should skip gate
  useEffect(() => {
    async function checkReturningUser() {
      if (isSignedIn && user?.id) {
        try {
          const { profile } = await loadUserProgress(user.id);
          if (profile?.has_completed_gate) {
            setGateCompleted(true);
            onUnlock();
            return;
          }
        } catch (error) {
          console.error('Error checking gate status:', error);
        }
      }
      
      // Also check local storage for returning guests
      if (hasCompletedGateEver) {
        unlockSite();
        onUnlock();
        return;
      }
      
      setIsChecking(false);
    }

    checkReturningUser();
  }, [isSignedIn, user?.id, hasCompletedGateEver, setGateCompleted, unlockSite, onUnlock]);

  // Watch for gate completion via jumpCount
  useEffect(() => {
    if (jumpCount >= 3 && !hasUnlockedRef.current) {
      hasUnlockedRef.current = true;
      
      // Celebrate!
      setShowUnlockAnimation(true);
      
      // Fire confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#98D8AA', '#4A90D9', '#FFD700'],
      });

      // Save to cloud if signed in
      if (isSignedIn && user?.id) {
        saveUserProgress(user.id, { hasCompletedGate: true });
      }

      // Delay unlock for animation
      setTimeout(() => {
        unlockSite();
        onUnlock();
      }, 1500);
    }
  }, [jumpCount, isSignedIn, user?.id, unlockSite, onUnlock]);

  if (isChecking) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-pixel-black/80">
        <div className="text-center">
          <div className="font-pixel text-foamy-green text-xl animate-pulse">
            LOADING...
          </div>
        </div>
      </div>
    );
  }

  if (showUnlockAnimation) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-pixel-black/60">
        <div className="text-center slide-up">
          <h1 
            className="font-pixel text-foamy-green text-3xl md:text-5xl mb-4"
            style={{ textShadow: '0 0 20px rgba(152, 216, 170, 0.8)' }}
          >
            WELCOME!
          </h1>
          <p className="font-lcd text-white text-2xl">
            Site Unlocked!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Semi-transparent overlay - allows clicking through to game */}
      <div className="absolute inset-0 bg-gradient-to-b from-pixel-black/40 to-transparent" />
      
      {/* Gate UI */}
      <div className="relative text-center p-8">
        {/* Title */}
        <h1 
          className="font-pixel text-foamy-green text-2xl md:text-4xl mb-6"
          style={{ textShadow: '4px 4px 0px #2d2d2d' }}
        >
          BOHDI&apos;S WORLD
        </h1>

        {/* Instructions */}
        <div 
          className="bg-pixel-black/90 border-4 border-foamy-green p-6 mb-6"
          style={{ boxShadow: '6px 6px 0px #2d2d2d' }}
        >
          <p className="font-lcd text-white text-xl md:text-2xl mb-4">
            Jump over 3 obstacles to enter!
          </p>
          
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="font-pixel text-ocean-blue text-sm">PRESS</span>
            <kbd 
              className="px-4 py-2 bg-ocean-blue text-white font-pixel text-sm border-4 border-pixel-black"
              style={{ boxShadow: '3px 3px 0px #2d2d2d' }}
            >
              SPACE
            </kbd>
            <span className="font-pixel text-ocean-blue text-sm">TO JUMP</span>
          </div>
          
          <p className="font-lcd text-gray-400 text-lg">
            (or tap the screen on mobile)
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-4">
          <span className="font-pixel text-white text-sm">PROGRESS:</span>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`
                  w-8 h-8 border-4 border-pixel-black
                  flex items-center justify-center
                  font-pixel text-xs
                  transition-all duration-300
                  ${i < jumpCount 
                    ? 'bg-foamy-green text-pixel-black' 
                    : 'bg-pixel-shadow text-gray-500'
                  }
                `}
                style={{ 
                  boxShadow: i < jumpCount 
                    ? '0 0 10px rgba(152, 216, 170, 0.6)' 
                    : '2px 2px 0px #1a1a1a',
                }}
              >
                {i < jumpCount ? '✓' : i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GateOverlay;

