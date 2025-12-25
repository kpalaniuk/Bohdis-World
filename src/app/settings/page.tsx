'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Volume2, VolumeX, Trash2, LogOut, AlertTriangle, Music, Gamepad2 } from 'lucide-react';
import { PixelCard } from '@/components/ui/PixelCard';
import { PixelButton } from '@/components/ui/PixelButton';
import { useAuth } from '@/contexts/AuthContext';
import { useGameStore } from '@/stores/gameStore';
import { useCoinStore } from '@/stores/coinStore';
import { useUnlockStore } from '@/stores/unlockStore';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn, signOut } = useAuth();
  const { soundEnabled, setSoundEnabled, resetGame } = useGameStore();
  const { resetCoins } = useCoinStore();
  const { resetUnlocks } = useUnlockStore();
  
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  const handleResetProgress = () => {
    // Reset all progress stores
    resetGame();
    resetCoins();
    resetUnlocks();
    setShowResetConfirm(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="font-pixel text-foamy-green animate-pulse">LOADING...</div>
      </div>
    );
  }

  if (!isSignedIn || !user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-20">
      <PixelCard variant="glass" padding="lg" className="max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-400 hover:text-foamy-green transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 
            className="font-pixel text-foamy-green text-lg"
            style={{ textShadow: '2px 2px 0px #2d2d2d' }}
          >
            SETTINGS
          </h1>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Game Settings */}
          <div>
            <h2 
              className="font-pixel text-ocean-blue text-sm mb-4 flex items-center gap-2"
              style={{ textShadow: '2px 2px 0px #2d2d2d' }}
            >
              <Gamepad2 size={16} />
              GAME
            </h2>
            
            <div className="space-y-3">
              {/* Sound Toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="
                  w-full p-4
                  bg-pixel-shadow/50 border-4 border-pixel-shadow
                  flex items-center justify-between
                  hover:bg-pixel-shadow
                  transition-colors
                "
                style={{ boxShadow: '3px 3px 0px #1a1a1a' }}
              >
                <div className="flex items-center gap-3">
                  {soundEnabled ? (
                    <Volume2 size={20} className="text-foamy-green" />
                  ) : (
                    <VolumeX size={20} className="text-gray-500" />
                  )}
                  <span className="font-lcd text-white">Sound Effects</span>
                </div>
                <div className={`
                  w-12 h-6 rounded-full relative
                  transition-colors
                  ${soundEnabled ? 'bg-foamy-green' : 'bg-pixel-shadow'}
                `}>
                  <div className={`
                    absolute top-1 w-4 h-4 bg-white rounded-full
                    transition-transform
                    ${soundEnabled ? 'left-7' : 'left-1'}
                  `} />
                </div>
              </button>

              {/* Music Toggle (placeholder) */}
              <button
                className="
                  w-full p-4
                  bg-pixel-shadow/50 border-4 border-pixel-shadow
                  flex items-center justify-between
                  opacity-50 cursor-not-allowed
                "
                style={{ boxShadow: '3px 3px 0px #1a1a1a' }}
                disabled
              >
                <div className="flex items-center gap-3">
                  <Music size={20} className="text-gray-500" />
                  <span className="font-lcd text-gray-400">Background Music</span>
                </div>
                <span className="font-lcd text-gray-600 text-xs">COMING SOON</span>
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div>
            <h2 
              className="font-pixel text-sunset-orange text-sm mb-4 flex items-center gap-2"
              style={{ textShadow: '2px 2px 0px #2d2d2d' }}
            >
              <AlertTriangle size={16} />
              DANGER ZONE
            </h2>
            
            <div className="space-y-3">
              {/* Reset Progress */}
              {!showResetConfirm ? (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="
                    w-full p-4
                    bg-pixel-shadow/50 border-4 border-red-900/50
                    flex items-center gap-3
                    hover:bg-red-900/30
                    transition-colors
                  "
                  style={{ boxShadow: '3px 3px 0px #1a1a1a' }}
                >
                  <Trash2 size={20} className="text-red-400" />
                  <div className="text-left">
                    <span className="font-lcd text-red-400 block">Reset All Progress</span>
                    <span className="font-lcd text-gray-500 text-xs">Coins, high score, and unlocks</span>
                  </div>
                </button>
              ) : (
                <div 
                  className="p-4 bg-red-900/30 border-4 border-red-500 space-y-3"
                  style={{ boxShadow: '3px 3px 0px #1a1a1a' }}
                >
                  <p className="font-lcd text-red-300 text-sm">
                    Are you sure? This cannot be undone!
                  </p>
                  <div className="flex gap-2">
                    <PixelButton
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowResetConfirm(false)}
                      className="flex-1"
                    >
                      CANCEL
                    </PixelButton>
                    <button
                      onClick={handleResetProgress}
                      className="
                        flex-1 py-2 px-4
                        font-pixel text-xs
                        bg-red-600 text-white
                        border-4 border-pixel-black
                        hover:bg-red-500
                      "
                      style={{ boxShadow: '3px 3px 0px #2d2d2d' }}
                    >
                      RESET
                    </button>
                  </div>
                </div>
              )}

              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className="
                  w-full p-4
                  bg-pixel-shadow/50 border-4 border-pixel-shadow
                  flex items-center gap-3
                  hover:bg-pixel-shadow
                  transition-colors
                "
                style={{ boxShadow: '3px 3px 0px #1a1a1a' }}
              >
                <LogOut size={20} className="text-gray-400" />
                <span className="font-lcd text-white">Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t-2 border-pixel-shadow text-center">
          <p className="font-lcd text-gray-500 text-xs">
            Bohdi&apos;s Web Page v1.0
          </p>
          <p className="font-lcd text-gray-600 text-xs mt-1">
            Made with 💚 in San Diego
          </p>
        </div>
      </PixelCard>
    </div>
  );
}

