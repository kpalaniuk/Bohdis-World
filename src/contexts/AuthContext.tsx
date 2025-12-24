'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useUser as useClerkUser, useClerk } from '@clerk/nextjs';
import { 
  SimpleUser, 
  getSession, 
  saveSession, 
  clearSession,
  signInSimple,
  signUpSimple
} from '@/lib/simpleAuth';

interface AuthUser {
  id: string;
  username: string | null;
  displayName: string | null;
  authMethod: 'clerk' | 'simple';
}

interface AuthContextType {
  user: AuthUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  authMethod: 'clerk' | 'simple' | null;
  
  // Simple auth methods
  signInWithUsername: (username: string, password: string) => Promise<{ error: string | null }>;
  signUpWithUsername: (username: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded: clerkLoaded, isSignedIn: clerkSignedIn, user: clerkUser } = useClerkUser();
  const { signOut: clerkSignOut } = useClerk();
  
  const [simpleUser, setSimpleUser] = useState<SimpleUser | null>(null);
  const [simpleLoaded, setSimpleLoaded] = useState(false);

  // Load simple session on mount
  useEffect(() => {
    const session = getSession();
    if (session) {
      setSimpleUser(session);
    }
    setSimpleLoaded(true);
  }, []);

  // Determine current auth state
  const isLoaded = clerkLoaded && simpleLoaded;
  const isSignedIn = clerkSignedIn || !!simpleUser;
  
  const authMethod = clerkSignedIn ? 'clerk' : simpleUser ? 'simple' : null;

  // Build unified user object
  const user: AuthUser | null = React.useMemo(() => {
    if (clerkSignedIn && clerkUser) {
      return {
        id: clerkUser.id,
        username: clerkUser.username,
        displayName: clerkUser.firstName || clerkUser.username || null,
        authMethod: 'clerk' as const,
      };
    }
    if (simpleUser) {
      return {
        id: simpleUser.id,
        username: simpleUser.username,
        displayName: simpleUser.display_name || simpleUser.username,
        authMethod: 'simple' as const,
      };
    }
    return null;
  }, [clerkSignedIn, clerkUser, simpleUser]);

  const signInWithUsername = useCallback(async (username: string, password: string) => {
    const result = await signInSimple(username, password);
    if (result.user) {
      saveSession(result.user);
      setSimpleUser(result.user);
      return { error: null };
    }
    return { error: result.error || 'Failed to sign in' };
  }, []);

  const signUpWithUsername = useCallback(async (username: string, password: string, displayName?: string) => {
    const result = await signUpSimple(username, password, displayName);
    if (result.user) {
      saveSession(result.user);
      setSimpleUser(result.user);
      return { error: null };
    }
    return { error: result.error || 'Failed to sign up' };
  }, []);

  const signOut = useCallback(async () => {
    if (clerkSignedIn) {
      await clerkSignOut();
    }
    if (simpleUser) {
      clearSession();
      setSimpleUser(null);
    }
  }, [clerkSignedIn, clerkSignOut, simpleUser]);

  return (
    <AuthContext.Provider value={{
      user,
      isLoaded,
      isSignedIn,
      authMethod,
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

