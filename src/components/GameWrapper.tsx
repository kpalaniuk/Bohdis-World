'use client';

import { useState, useCallback, useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { RunnerGame } from './game/RunnerGame';
import { GateOverlay } from './game/GateOverlay';
import { NavBar } from './NavBar';

interface GameWrapperProps {
  children: React.ReactNode;
}

export function GameWrapper({ children }: GameWrapperProps) {
  const { isUnlocked, jumpCount, incrementJumpCount, hasCompletedGateEver } = useGameStore();
  const [siteUnlocked, setSiteUnlocked] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Hydration fix
  useEffect(() => {
    setIsClient(true);
    // Check if already unlocked from localStorage
    if (hasCompletedGateEver) {
      setSiteUnlocked(true);
    }
  }, [hasCompletedGateEver]);

  const handleObstacleCleared = useCallback(() => {
    // This is called from RunnerGame when an obstacle is passed
    // Only increment if gate is still active (not unlocked)
    if (!siteUnlocked && !isUnlocked) {
      incrementJumpCount();
    }
  }, [siteUnlocked, isUnlocked, incrementJumpCount]);

  // GateOverlay now controls the unlock flow (including login screen)
  // No automatic unlock here - let GateOverlay handle it via onUnlock callback

  const handleUnlock = useCallback(() => {
    setSiteUnlocked(true);
  }, []);

  // Check if already unlocked (from store)
  const showContent = isUnlocked || siteUnlocked;

  // Prevent hydration mismatch
  if (!isClient) {
    return (
      <div className="min-h-screen bg-pixel-black flex items-center justify-center">
        <div className="font-pixel text-foamy-green animate-pulse">LOADING...</div>
      </div>
    );
  }

  return (
    <>
      {/* Background Game - always running */}
      <RunnerGame onObstacleCleared={handleObstacleCleared} />

      {/* Gate Overlay - shown until unlocked */}
      {!showContent && <GateOverlay onUnlock={handleUnlock} />}

      {/* Main Content - only shown after unlock */}
      {showContent && (
        <>
          <NavBar />
          <main className="relative z-10 pt-16 min-h-screen">
            {children}
          </main>
        </>
      )}
    </>
  );
}

export default GameWrapper;

