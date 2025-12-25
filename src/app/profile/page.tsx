'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Save, ArrowLeft, Coins, Trophy, Palette, Zap, Cloud, Check } from 'lucide-react';
import { PixelCard } from '@/components/ui/PixelCard';
import { PixelButton } from '@/components/ui/PixelButton';
import { useAuth } from '@/contexts/AuthContext';
import { useCoinStore } from '@/stores/coinStore';
import { useGameStore } from '@/stores/gameStore';
import { useUnlockStore } from '@/stores/unlockStore';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn, authMethod, isSyncing } = useAuth();
  const { coins, totalEarned } = useCoinStore();
  const { highScore } = useGameStore();
  const { unlockedThemes, ownedPowerUps } = useUnlockStore();
  
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  // Load display name when user loads
  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user || !isSupabaseConfigured() || !supabase) {
      setError('Cannot save - database not configured');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      if (authMethod === 'simple') {
        // Update simple user display name
        const { error: updateError } = await supabase
          .from('simple_users')
          .update({ display_name: displayName.trim() || user.username })
          .eq('id', user.id);

        if (updateError) {
          throw updateError;
        }
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
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

  const inputClasses = `
    w-full px-4 py-3
    bg-pixel-black
    border-4 border-pixel-shadow
    text-white font-lcd text-lg
    focus:border-foamy-green focus:outline-none
    placeholder:text-gray-500
    transition-colors
  `;

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
            className="font-pixel text-foamy-green text-lg flex-1"
            style={{ textShadow: '2px 2px 0px #2d2d2d' }}
          >
            PLAYER PROFILE
          </h1>
          {/* Sync status */}
          <div className="flex items-center gap-2 text-gray-500 font-lcd text-sm">
            <Cloud size={16} className={isSyncing ? 'animate-pulse text-foamy-green' : ''} />
            {isSyncing ? 'Syncing...' : 'Synced'}
          </div>
        </div>

        {/* Avatar */}
        <div className="flex justify-center mb-6">
          <div 
            className="w-24 h-24 bg-ocean-blue border-4 border-pixel-black flex items-center justify-center"
            style={{ boxShadow: '4px 4px 0px #2d2d2d' }}
          >
            <span className="font-pixel text-3xl text-white">
              {(displayName || user.username || 'P')[0]?.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Profile Form */}
        <div className="space-y-4">
          {/* Username (read-only) */}
          <div>
            <label className="block font-lcd text-gray-300 mb-2 text-sm">
              USERNAME
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={`@${user.username}`}
                readOnly
                className={`${inputClasses} bg-pixel-shadow/50 text-gray-400 cursor-not-allowed`}
              />
              <span className={`
                px-2 py-1 font-lcd text-xs border
                ${authMethod === 'simple' ? 'text-foamy-green border-foamy-green' : 'text-ocean-blue border-ocean-blue'}
              `}>
                {authMethod === 'simple' ? 'QUICK' : 'EMAIL'}
              </span>
            </div>
          </div>

          {/* Display Name (editable) */}
          <div>
            <label className="block font-lcd text-gray-300 mb-2 text-sm">
              DISPLAY NAME
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your character name..."
              className={inputClasses}
              maxLength={30}
            />
            <p className="mt-1 font-lcd text-gray-500 text-xs">
              This is the name others will see
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-900/50 border-2 border-red-500 text-red-300 font-lcd text-sm">
              ⚠ {error}
            </div>
          )}

          {/* Success Message */}
          {saveSuccess && (
            <div className="p-3 bg-green-900/50 border-2 border-foamy-green text-foamy-green font-lcd text-sm flex items-center gap-2">
              <Check size={16} />
              Profile saved successfully!
            </div>
          )}

          {/* Save Button */}
          <PixelButton
            variant="primary"
            size="lg"
            icon={Save}
            onClick={handleSave}
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? 'SAVING...' : 'SAVE PROFILE'}
          </PixelButton>
        </div>

        {/* Stats Divider */}
        <div className="border-t-4 border-pixel-shadow my-6" />

        {/* Player Stats */}
        <div>
          <h2 
            className="font-pixel text-ocean-blue text-sm mb-4"
            style={{ textShadow: '2px 2px 0px #2d2d2d' }}
          >
            PLAYER STATS
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Coins */}
            <div 
              className="p-4 bg-pixel-shadow/50 border-4 border-pixel-shadow"
              style={{ boxShadow: '3px 3px 0px #1a1a1a' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Coins size={18} className="text-yellow-400" />
                <span className="font-lcd text-gray-400 text-sm">COINS</span>
              </div>
              <div className="font-pixel text-xl text-foamy-green">{coins}</div>
              <div className="font-lcd text-gray-500 text-xs">
                Total earned: {totalEarned}
              </div>
            </div>

            {/* High Score */}
            <div 
              className="p-4 bg-pixel-shadow/50 border-4 border-pixel-shadow"
              style={{ boxShadow: '3px 3px 0px #1a1a1a' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Trophy size={18} className="text-ocean-blue" />
                <span className="font-lcd text-gray-400 text-sm">HIGH SCORE</span>
              </div>
              <div className="font-pixel text-xl text-ocean-blue">{highScore}m</div>
            </div>

            {/* Themes Unlocked */}
            <div 
              className="p-4 bg-pixel-shadow/50 border-4 border-pixel-shadow"
              style={{ boxShadow: '3px 3px 0px #1a1a1a' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Palette size={18} className="text-purple-400" />
                <span className="font-lcd text-gray-400 text-sm">THEMES</span>
              </div>
              <div className="font-pixel text-xl text-purple-400">{unlockedThemes.length}</div>
              <div className="font-lcd text-gray-500 text-xs">unlocked</div>
            </div>

            {/* Power-ups */}
            <div 
              className="p-4 bg-pixel-shadow/50 border-4 border-pixel-shadow"
              style={{ boxShadow: '3px 3px 0px #1a1a1a' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap size={18} className="text-sunset-orange" />
                <span className="font-lcd text-gray-400 text-sm">POWER-UPS</span>
              </div>
              <div className="font-pixel text-xl text-sunset-orange">{ownedPowerUps.length}</div>
              <div className="font-lcd text-gray-500 text-xs">owned</div>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="mt-6 pt-4 border-t-2 border-pixel-shadow">
          <div className="font-lcd text-gray-500 text-xs text-center">
            Account ID: {user.id.slice(0, 8)}...
          </div>
        </div>
      </PixelCard>
    </div>
  );
}

