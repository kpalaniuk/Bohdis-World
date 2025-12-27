'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  User, Save, ArrowLeft, Coins, Trophy, Palette, Zap, Cloud, Check,
  Brain, Calculator, Gamepad2, TrendingUp, Calendar, Star, RefreshCw
} from 'lucide-react';
import { PixelCard } from '@/components/ui/PixelCard';
import { PixelButton } from '@/components/ui/PixelButton';
import { useAuth } from '@/contexts/AuthContext';
import { useCoinStore } from '@/stores/coinStore';
import { useGameStore } from '@/stores/gameStore';
import { useUnlockStore } from '@/stores/unlockStore';
import { useCharacterStore, CHARACTERS, ACCESSORIES } from '@/stores/characterStore';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn, authMethod, isSyncing } = useAuth();
  const { coins, totalEarned } = useCoinStore();
  const { highScore } = useGameStore();
  const { unlockedThemes, ownedPowerUps } = useUnlockStore();
  const { 
    selectedCharacter, 
    ownedAccessories, 
    equippedAccessories,
    getCharacter,
  } = useCharacterStore();
  
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mathStats, setMathStats] = useState({ total: 0, correct: 0, streak: 0 });
  const [recentActivity, setRecentActivity] = useState<{ type: string; description: string; time: string }[]>([]);

  const character = getCharacter();

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, router]);

  // Load display name and stats when user loads
  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }

    // Load math stats from database
    async function loadStats() {
      if (!isSupabaseConfigured() || !supabase || !user) return;

      try {
        // Get user profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('simple_user_id', user.id)
          .single();

        if (profile) {
          // Get math history stats
          const { data: mathHistory } = await supabase
            .from('math_history')
            .select('is_correct, created_at')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(100);

          if (mathHistory) {
            const total = mathHistory.length;
            const correct = mathHistory.filter(h => h.is_correct).length;
            
            // Calculate current streak
            let streak = 0;
            for (const h of mathHistory) {
              if (h.is_correct) streak++;
              else break;
            }

            setMathStats({ total, correct, streak });

            // Build recent activity
            const activity: { type: string; description: string; time: string }[] = [];
            
            if (mathHistory.length > 0) {
              const recentMath = mathHistory.slice(0, 3);
              recentMath.forEach(h => {
                activity.push({
                  type: 'math',
                  description: h.is_correct ? 'Solved math problem correctly!' : 'Attempted math problem',
                  time: new Date(h.created_at).toLocaleDateString(),
                });
              });
            }

            setRecentActivity(activity);
          }
        }
      } catch (err) {
        console.error('Error loading stats:', err);
      }
    }

    loadStats();
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

  const equippedCount = Object.keys(equippedAccessories).length;
  const accuracyPercent = mathStats.total > 0 
    ? Math.round((mathStats.correct / mathStats.total) * 100) 
    : 0;

  return (
    <div className="min-h-screen p-4 pt-20 pb-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Card */}
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
              PLAYER DASHBOARD
            </h1>
            {/* Sync status */}
            <div className="flex items-center gap-2 text-gray-500 font-lcd text-sm">
              {isSyncing ? (
                <RefreshCw size={16} className="animate-spin text-foamy-green" />
              ) : (
                <Cloud size={16} />
              )}
              {isSyncing ? 'Syncing...' : 'Synced'}
            </div>
          </div>

          {/* Profile Header */}
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
            {/* Character Avatar */}
            <div className="flex-shrink-0">
              {character ? (
                <div 
                  className="relative w-28 h-28 flex items-center justify-center border-4 border-pixel-black"
                  style={{ 
                    backgroundColor: character.primaryColor,
                    boxShadow: '4px 4px 0px #2d2d2d'
                  }}
                >
                  <span className="text-6xl">{character.emoji}</span>
                  
                  {/* Equipped accessories preview */}
                  {equippedAccessories.head && (
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-lg">
                      {ACCESSORIES.find(a => a.id === equippedAccessories.head)?.preview}
                    </div>
                  )}
                </div>
              ) : (
                <div 
                  className="w-28 h-28 bg-ocean-blue border-4 border-pixel-black flex items-center justify-center"
                  style={{ boxShadow: '4px 4px 0px #2d2d2d' }}
                >
                  <span className="font-pixel text-4xl text-white">
                    {(displayName || user.username || 'P')[0]?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="font-pixel text-xl text-white mb-1">
                {displayName || user.username}
              </h2>
              <p className="font-lcd text-gray-400 mb-2">@{user.username}</p>
              
              {character && (
                <div className="flex items-center gap-2 justify-center md:justify-start mb-3">
                  <span 
                    className="px-3 py-1 font-pixel text-xs border-2"
                    style={{ 
                      borderColor: character.primaryColor,
                      color: character.primaryColor,
                    }}
                  >
                    {character.name}
                  </span>
                  {equippedCount > 0 && (
                    <span className="font-lcd text-gray-500 text-xs">
                      {equippedCount} accessory equipped
                    </span>
                  )}
                </div>
              )}

              {/* Quick edit display name */}
              <div className="flex gap-2 max-w-xs mx-auto md:mx-0">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name..."
                  className="flex-1 px-3 py-2 bg-pixel-black border-2 border-pixel-shadow text-white font-lcd text-sm focus:border-foamy-green focus:outline-none"
                  maxLength={30}
                />
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`px-3 py-2 border-2 transition-all ${
                    saveSuccess 
                      ? 'bg-foamy-green border-foamy-green text-pixel-black' 
                      : 'bg-pixel-shadow border-pixel-black text-white hover:bg-ocean-blue'
                  }`}
                >
                  {saveSuccess ? <Check size={16} /> : <Save size={16} />}
                </button>
              </div>
              {error && (
                <p className="font-lcd text-red-400 text-xs mt-1">{error}</p>
              )}
            </div>
          </div>
        </PixelCard>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Coins */}
          <PixelCard variant="default" padding="md">
            <div className="text-center">
              <Coins size={24} className="text-yellow-400 mx-auto mb-2" />
              <div className="font-pixel text-2xl text-foamy-green">{coins}</div>
              <div className="font-lcd text-gray-500 text-xs">Coins</div>
              <div className="font-lcd text-gray-600 text-xs">Total: {totalEarned}</div>
            </div>
          </PixelCard>

          {/* High Score */}
          <PixelCard variant="default" padding="md">
            <div className="text-center">
              <Trophy size={24} className="text-ocean-blue mx-auto mb-2" />
              <div className="font-pixel text-2xl text-ocean-blue">{highScore}m</div>
              <div className="font-lcd text-gray-500 text-xs">High Score</div>
            </div>
          </PixelCard>

          {/* Math Accuracy */}
          <PixelCard variant="default" padding="md">
            <div className="text-center">
              <Brain size={24} className="text-purple-400 mx-auto mb-2" />
              <div className="font-pixel text-2xl text-purple-400">{accuracyPercent}%</div>
              <div className="font-lcd text-gray-500 text-xs">Math Accuracy</div>
              <div className="font-lcd text-gray-600 text-xs">{mathStats.correct}/{mathStats.total}</div>
            </div>
          </PixelCard>

          {/* Current Streak */}
          <PixelCard variant="default" padding="md">
            <div className="text-center">
              <Zap size={24} className="text-sunset-orange mx-auto mb-2" />
              <div className="font-pixel text-2xl text-sunset-orange">{mathStats.streak}</div>
              <div className="font-lcd text-gray-500 text-xs">Math Streak</div>
            </div>
          </PixelCard>
        </div>

        {/* Unlocks & Inventory */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Unlocked Items */}
          <PixelCard variant="glass" padding="md">
            <h3 
              className="font-pixel text-ocean-blue text-sm mb-4"
              style={{ textShadow: '2px 2px 0px #2d2d2d' }}
            >
              UNLOCKED ITEMS
            </h3>
            
            <div className="space-y-3">
              {/* Themes */}
              <div className="flex items-center justify-between p-3 bg-pixel-shadow/50 border-2 border-pixel-shadow">
                <div className="flex items-center gap-2">
                  <Palette size={18} className="text-purple-400" />
                  <span className="font-lcd text-white text-sm">Themes</span>
                </div>
                <span className="font-pixel text-sm text-purple-400">{unlockedThemes.length}</span>
              </div>

              {/* Power-ups */}
              <div className="flex items-center justify-between p-3 bg-pixel-shadow/50 border-2 border-pixel-shadow">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-sunset-orange" />
                  <span className="font-lcd text-white text-sm">Power-ups</span>
                </div>
                <span className="font-pixel text-sm text-sunset-orange">
                  {Object.values(ownedPowerUps).reduce((sum, count) => sum + count, 0)}
                </span>
              </div>

              {/* Accessories */}
              <div className="flex items-center justify-between p-3 bg-pixel-shadow/50 border-2 border-pixel-shadow">
                <div className="flex items-center gap-2">
                  <Star size={18} className="text-foamy-green" />
                  <span className="font-lcd text-white text-sm">Accessories</span>
                </div>
                <span className="font-pixel text-sm text-foamy-green">{ownedAccessories.length}</span>
              </div>
            </div>

            <Link href="/shop" className="block mt-4">
              <PixelButton variant="ghost" size="sm" className="w-full">
                VISIT SHOP
              </PixelButton>
            </Link>
          </PixelCard>

          {/* Character Strengths */}
          {character && (
            <PixelCard variant="glass" padding="md">
              <h3 
                className="font-pixel text-sm mb-4"
                style={{ color: character.primaryColor, textShadow: '2px 2px 0px #2d2d2d' }}
              >
                {character.name.toUpperCase()}&apos;S STRENGTHS
              </h3>
              
              <div className="space-y-3">
                <StrengthRow 
                  label="Math Speed Bonus" 
                  value={character.strengths.mathSpeed > 0 ? `+${character.strengths.mathSpeed}s` : '-'}
                  active={character.strengths.mathSpeed > 0}
                />
                <StrengthRow 
                  label="Jump Height" 
                  value={`${Math.round(character.strengths.jumpHeight * 100)}%`}
                  active={character.strengths.jumpHeight > 1}
                />
                <StrengthRow 
                  label="Coin Bonus" 
                  value={character.strengths.coinBonus > 0 ? `+${Math.round(character.strengths.coinBonus * 100)}%` : '-'}
                  active={character.strengths.coinBonus > 0}
                />
                <StrengthRow 
                  label="Shield Duration" 
                  value={`${Math.round(character.strengths.shieldDuration * 100)}%`}
                  active={character.strengths.shieldDuration > 1}
                />
              </div>
            </PixelCard>
          )}
        </div>

        {/* Quick Actions */}
        <PixelCard variant="glass" padding="md">
          <h3 
            className="font-pixel text-ocean-blue text-sm mb-4"
            style={{ textShadow: '2px 2px 0px #2d2d2d' }}
          >
            QUICK ACTIONS
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/math" className="block">
              <PixelButton variant="secondary" size="md" icon={Brain} className="w-full">
                Math
              </PixelButton>
            </Link>
            <Link href="/game" className="block">
              <PixelButton variant="ghost" size="md" icon={Gamepad2} className="w-full">
                Game
              </PixelButton>
            </Link>
            <Link href="/calculator" className="block">
              <PixelButton variant="primary" size="md" icon={Calculator} className="w-full">
                Calc
              </PixelButton>
            </Link>
            <Link href="/settings" className="block">
              <PixelButton variant="ghost" size="md" icon={User} className="w-full">
                Settings
              </PixelButton>
            </Link>
          </div>
        </PixelCard>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <PixelCard variant="glass" padding="md">
            <h3 
              className="font-pixel text-foamy-green text-sm mb-4"
              style={{ textShadow: '2px 2px 0px #2d2d2d' }}
            >
              RECENT ACTIVITY
            </h3>
            
            <div className="space-y-2">
              {recentActivity.map((activity, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-3 p-2 bg-pixel-shadow/30 border border-pixel-shadow"
                >
                  <div className="w-8 h-8 flex items-center justify-center bg-pixel-shadow border border-pixel-black">
                    {activity.type === 'math' && <Brain size={16} className="text-purple-400" />}
                    {activity.type === 'game' && <Gamepad2 size={16} className="text-ocean-blue" />}
                    {activity.type === 'calc' && <Calculator size={16} className="text-foamy-green" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-lcd text-white text-sm">{activity.description}</p>
                    <p className="font-lcd text-gray-500 text-xs">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </PixelCard>
        )}

        {/* Account Info Footer */}
        <div className="text-center">
          <p className="font-lcd text-gray-600 text-xs">
            Account ID: {user.id.slice(0, 8)}... | Joined with {authMethod === 'simple' ? 'Quick Login' : 'Email'}
          </p>
        </div>
      </div>
    </div>
  );
}

function StrengthRow({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between p-2 bg-pixel-shadow/30 border border-pixel-shadow">
      <span className="font-lcd text-gray-400 text-sm">{label}</span>
      <span className={`font-pixel text-sm ${active ? 'text-foamy-green' : 'text-gray-600'}`}>
        {value}
      </span>
    </div>
  );
}
