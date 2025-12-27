'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  SimpleUser, 
  UserRole,
  getSession, 
  saveSession, 
  clearSession,
  signInSimple,
  signUpSimple,
  isAdmin as checkIsAdmin,
  isSuperuser as checkIsSuperuser,
} from '@/lib/simpleAuth';
import { 
  loadUserProgress, 
  saveUserProgress, 
  mergeProgress, 
  createAuthUserId,
  LocalProgress 
} from '@/lib/syncProgress';
import { useCoinStore } from '@/stores/coinStore';
import { useGameStore, GameTheme, PowerUp } from '@/stores/gameStore';
import { useUnlockStore } from '@/stores/unlockStore';

interface AuthUser {
  id: string;
  username: string | null;
  displayName: string | null;
  authMethod: 'simple';
  role: UserRole;
  canGiftItems: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  authMethod: 'simple' | null;
  isSyncing: boolean;
  
  // Role helpers
  isAdmin: boolean;
  isSuperuser: boolean;
  
  // Simple auth methods
  signInWithUsername: (username: string, password: string) => Promise<{ error: string | null }>;
  signUpWithUsername: (username: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [simpleUser, setSimpleUser] = useState<SimpleUser | null>(null);
  const [simpleLoaded, setSimpleLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const hasSyncedRef = useRef<string | null>(null);

  // Store setters
  const { coins, totalEarned, setCoins } = useCoinStore();
  const { highScore, hasCompletedGateEver, setHighScore, setGateCompleted } = useGameStore();
  const { unlockedThemes, ownedPowerUps, setUnlockedThemes, setOwnedPowerUps } = useUnlockStore();

  // Load simple session on mount
  useEffect(() => {
    const session = getSession();
    if (session) {
      setSimpleUser(session);
    }
    setSimpleLoaded(true);
  }, []);

  // Determine current auth state
  const isLoaded = simpleLoaded;
  const isSignedIn = !!simpleUser;
  
  const authMethod = simpleUser ? 'simple' : null;

  // Build unified user object
  const user: AuthUser | null = React.useMemo(() => {
    if (simpleUser) {
      return {
        id: simpleUser.id,
        username: simpleUser.username,
        displayName: simpleUser.display_name || simpleUser.username,
        authMethod: 'simple' as const,
        role: simpleUser.role,
        canGiftItems: simpleUser.can_gift_items,
      };
    }
    return null;
  }, [simpleUser]);

  // Sync progress when user signs in
  useEffect(() => {
    async function syncUserProgress() {
      if (!user || !authMethod || !isLoaded) return;
      
      // Only sync once per user session
      if (hasSyncedRef.current === user.id) return;
      hasSyncedRef.current = user.id;
      
      setIsSyncing(true);
      
      try {
        const authUserId = createAuthUserId(authMethod, user.id);
        if (!authUserId) return;
        
        // Load cloud progress
        const { profile, progress } = await loadUserProgress(authUserId);
        
        if (progress && profile) {
          // Get local progress from stores
          const localProgress: LocalProgress = {
            coins,
            totalEarned,
            highScore,
            unlockedThemes: unlockedThemes as GameTheme[],
            ownedPowerUps,
            hasCompletedGate: hasCompletedGateEver,
          };
          
          // Merge local and cloud progress
          const cloudProgress = {
            coins: progress.coins || 0,
            total_earned: progress.total_earned || 0,
            high_score: progress.high_score || 0,
            unlocked_themes: progress.unlocked_themes || ['beach'],
            unlocked_powerups: progress.unlocked_powerups || [],
            has_completed_gate: profile.has_completed_gate || false,
          };
          
          const merged = mergeProgress(localProgress, cloudProgress);
          
          // Update all stores with merged data
          setCoins(merged.coins, merged.totalEarned);
          setHighScore(merged.highScore);
          setUnlockedThemes(merged.unlockedThemes);
          setOwnedPowerUps(merged.ownedPowerUps);
          if (merged.hasCompletedGate) {
            setGateCompleted(true);
          }
          
          // Save merged data back to cloud
          await saveUserProgress(authUserId, {
            coins: merged.coins,
            totalEarned: merged.totalEarned,
            highScore: merged.highScore,
            unlockedThemes: merged.unlockedThemes,
            ownedPowerUps: merged.ownedPowerUps,
            hasCompletedGate: merged.hasCompletedGate,
          });
          
          console.log('✅ User progress synced successfully');
        }
      } catch (error) {
        console.error('Error syncing user progress:', error);
      } finally {
        setIsSyncing(false);
      }
    }
    
    syncUserProgress();
  }, [user, authMethod, isLoaded]);

  const signInWithUsername = useCallback(async (username: string, password: string) => {
    const result = await signInSimple(username, password);
    if (result.user) {
      saveSession(result.user);
      setSimpleUser(result.user);
      // Reset sync ref to trigger sync for new user
      hasSyncedRef.current = null;
      return { error: null };
    }
    return { error: result.error || 'Failed to sign in' };
  }, []);

  const signUpWithUsername = useCallback(async (username: string, password: string, displayName?: string) => {
    const result = await signUpSimple(username, password, displayName);
    if (result.user) {
      saveSession(result.user);
      setSimpleUser(result.user);
      // Reset sync ref to trigger sync for new user
      hasSyncedRef.current = null;
      return { error: null };
    }
    return { error: result.error || 'Failed to sign up' };
  }, []);

  const signOut = useCallback(async () => {
    // Reset sync ref on sign out
    hasSyncedRef.current = null;
    
    if (simpleUser) {
      clearSession();
      setSimpleUser(null);
    }
  }, [simpleUser]);

  // Role helpers
  const isAdmin = checkIsAdmin(simpleUser);
  const isSuperuser = checkIsSuperuser(simpleUser);

  return (
    <AuthContext.Provider value={{
      user,
      isLoaded,
      isSignedIn,
      authMethod,
      isSyncing,
      isAdmin,
      isSuperuser,
      signInWithUsername,
      signUpWithUsername,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
