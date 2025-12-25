'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import Image from 'next/image';
import { useGameStore } from '@/stores/gameStore';
import { useAuth } from '@/contexts/AuthContext';
import { loadUserProgress, saveUserProgress, createAuthUserId } from '@/lib/syncProgress';
import confetti from 'canvas-confetti';

interface GateOverlayProps {
  onUnlock: () => void;
}

type GatePhase = 'jumping' | 'celebrating' | 'login' | 'unlocked';

export function GateOverlay({ onUnlock }: GateOverlayProps) {
  const { user, isSignedIn, authMethod, signInWithUsername, signUpWithUsername } = useAuth();
  const { 
    jumpCount, 
    unlockSite, 
    hasCompletedGateEver,
    setGateCompleted,
  } = useGameStore();
  
  const [phase, setPhase] = useState<GatePhase>('jumping');
  const [isChecking, setIsChecking] = useState(true);
  const hasUnlockedRef = useRef(false);

  // Login form state
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Create auth user ID for database operations
  const authUserId = useMemo(() => {
    if (user && authMethod) {
      return createAuthUserId(authMethod, user.id);
    }
    return null;
  }, [user, authMethod]);

  // Check if returning user should skip gate
  useEffect(() => {
    async function checkReturningUser() {
      if (isSignedIn && authUserId) {
        try {
          const { profile } = await loadUserProgress(authUserId);
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
  }, [isSignedIn, authUserId, hasCompletedGateEver, setGateCompleted, unlockSite, onUnlock]);

  // Watch for gate completion via jumpCount
  useEffect(() => {
    if (jumpCount >= 3 && !hasUnlockedRef.current && phase === 'jumping') {
      hasUnlockedRef.current = true;
      
      // Celebrate!
      setPhase('celebrating');
      
      // Fire confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#98D8AA', '#4A90D9', '#FFD700'],
      });

      // Show login screen after celebration
      setTimeout(() => {
        setPhase('login');
      }, 1500);
    }
  }, [jumpCount, phase]);

  // Handle login form submit
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (authMode === 'signin') {
        const result = await signInWithUsername(username, password);
        if (result.error) {
          setError(result.error);
        } else {
          // Successfully signed in, save gate completion and unlock
          completeAndUnlock();
        }
      } else {
        const result = await signUpWithUsername(username, password, displayName || undefined);
        if (result.error) {
          setError(result.error);
        } else {
          // Successfully signed up, save gate completion and unlock
          completeAndUnlock();
        }
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle skip (continue as guest)
  const handleSkip = () => {
    completeAndUnlock();
  };

  // Complete gate and unlock site
  const completeAndUnlock = async () => {
    setPhase('unlocked');
    
    // Save to cloud if signed in
    if (isSignedIn && authUserId) {
      await saveUserProgress(authUserId, { hasCompletedGate: true });
    }
    
    // Mark gate as completed
    unlockSite();
    
    // Fire more confetti for final unlock
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.5 },
      colors: ['#98D8AA', '#4A90D9', '#FFD700', '#FF6B6B'],
    });
    
    // Delay unlock for animation
    setTimeout(() => {
      onUnlock();
    }, 1000);
  };

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

  // Celebration phase - just completed 3 jumps
  if (phase === 'celebrating') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-pixel-black/60">
        <div className="text-center slide-up">
          <h1 
            className="font-pixel text-foamy-green text-3xl md:text-5xl mb-4"
            style={{ textShadow: '0 0 20px rgba(152, 216, 170, 0.8)' }}
          >
            NICE JUMPS!
          </h1>
          <p className="font-lcd text-white text-2xl">
            You made it!
          </p>
        </div>
      </div>
    );
  }

  // Login phase - show login form with Bohdi intro
  if (phase === 'login') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-pixel-black/90 p-4 overflow-y-auto">
        <div 
          className="w-full max-w-lg bg-pixel-black border-4 border-foamy-green p-6 md:p-8"
          style={{ boxShadow: '8px 8px 0px #2d2d2d' }}
        >
          {/* Bohdi Intro */}
          <div className="text-center mb-6">
            <div className="mb-4 flex justify-center">
              <div 
                className="relative w-24 h-24 md:w-32 md:h-32 border-4 border-ocean-blue overflow-hidden"
                style={{ boxShadow: '4px 4px 0px #2d2d2d' }}
              >
                <Image
                  src="/bohdi.jpg"
                  alt="Bohdi"
                  fill
                  className="object-cover"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
            </div>
            
            <h1 
              className="font-pixel text-foamy-green text-xl md:text-2xl mb-3"
              style={{ textShadow: '3px 3px 0px #2d2d2d' }}
            >
              HEY, I&apos;M BOHDI!
            </h1>
            
            <p className="font-lcd text-white text-base md:text-lg leading-relaxed mb-2">
              I&apos;m <span className="text-ocean-blue font-bold">8 years old</span> and 
              I live in <span className="text-foamy-green">San Diego</span>.
            </p>
            
            <p className="font-lcd text-gray-300 text-sm md:text-base">
              Sign in to save your progress and coins!
            </p>
          </div>

          {/* Divider */}
          <div className="border-t-4 border-pixel-shadow my-4" />

          {/* Login Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            {/* Username Input */}
            <div>
              <label className="block font-lcd text-gray-300 mb-2 text-sm">
                USERNAME
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="enter username..."
                className="w-full px-4 py-3 bg-pixel-black border-4 border-pixel-shadow text-white font-lcd text-lg focus:border-foamy-green focus:outline-none placeholder:text-gray-500 transition-colors"
                required
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_]+"
                autoComplete="username"
              />
            </div>

            {/* Display Name (signup only) */}
            {authMode === 'signup' && (
              <div>
                <label className="block font-lcd text-gray-300 mb-2 text-sm">
                  DISPLAY NAME <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="your character name..."
                  className="w-full px-4 py-3 bg-pixel-black border-4 border-pixel-shadow text-white font-lcd text-lg focus:border-foamy-green focus:outline-none placeholder:text-gray-500 transition-colors"
                  maxLength={30}
                />
              </div>
            )}

            {/* Password Input */}
            <div>
              <label className="block font-lcd text-gray-300 mb-2 text-sm">
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-pixel-black border-4 border-pixel-shadow text-white font-lcd text-lg focus:border-foamy-green focus:outline-none placeholder:text-gray-500 transition-colors"
                required
                minLength={4}
                autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
              />
              {authMode === 'signup' && (
                <p className="mt-1 font-lcd text-gray-500 text-xs">
                  At least 4 characters
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-900/50 border-2 border-red-500 text-red-300 font-lcd text-sm animate-pulse">
                ⚠ {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-6 font-pixel text-sm border-4 border-pixel-black transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed hover:translate-y-[-2px] active:translate-y-[2px] ${
                authMode === 'signin' 
                  ? 'bg-foamy-green text-pixel-black hover:bg-[#a8e8ba]'
                  : 'bg-ocean-blue text-white hover:bg-[#5aa0e9]'
              }`}
              style={{ boxShadow: '4px 4px 0px #2d2d2d' }}
            >
              {isLoading ? (
                <span className="animate-pulse">LOADING...</span>
              ) : (
                authMode === 'signin' ? 'START GAME' : 'CREATE CHARACTER'
              )}
            </button>

            {/* Mode Switch */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                  setError(null);
                }}
                className="font-lcd text-gray-400 hover:text-foamy-green transition-colors text-sm"
              >
                {authMode === 'signin' ? (
                  <>New player? <span className="text-foamy-green">Create account</span></>
                ) : (
                  <>Already playing? <span className="text-ocean-blue">Sign in</span></>
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="border-t-2 border-pixel-shadow my-4" />

          {/* Skip Button */}
          <button
            type="button"
            onClick={handleSkip}
            className="w-full py-2 px-4 font-lcd text-gray-500 hover:text-gray-300 transition-colors text-sm"
          >
            Continue without signing in →
          </button>
        </div>
      </div>
    );
  }

  // Unlocked phase - brief celebration before showing content
  if (phase === 'unlocked') {
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
            {isSignedIn ? `Hey ${user?.displayName || user?.username}!` : 'Let\'s go!'}
          </p>
        </div>
      </div>
    );
  }

  // Jumping phase - initial gate UI
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
