import type { UserProfile, UserProgress } from './supabase';
import type { GameTheme, PowerUp } from '@/stores/gameStore';

export interface AuthUserId { type: 'clerk' | 'simple'; id: string }

async function api<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, { ...init, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...init?.headers } });
    return response.ok ? await response.json() : null;
  } catch { return null; }
}

export async function getOrCreateUserProfile(userId: AuthUserId, _username?: string): Promise<UserProfile | null> {
  return (await loadUserProgress(userId)).profile;
}
export async function getOrCreateUserProfileByClerkId(clerkId: string, username?: string) {
  return getOrCreateUserProfile({ type: 'clerk', id: clerkId }, username);
}
export async function loadUserProgress(_userId: AuthUserId): Promise<{ profile: UserProfile | null; progress: UserProgress | null }> {
  return await api<{ profile: UserProfile | null; progress: UserProgress | null }>('/api/progress') || { profile: null, progress: null };
}
export async function saveUserProgress(_userId: AuthUserId, data: {
  coins?: number; totalEarned?: number; highScore?: number; unlockedThemes?: GameTheme[];
  ownedPowerUps?: Record<PowerUp, number>; hasCompletedGate?: boolean;
}): Promise<boolean> {
  return !!(await api<{ success: boolean }>('/api/progress', { method: 'PUT', body: JSON.stringify(data) }))?.success;
}

export interface LocalProgress { coins: number; totalEarned: number; highScore: number; unlockedThemes: GameTheme[]; ownedPowerUps: Record<PowerUp, number>; hasCompletedGate: boolean }
export interface CloudProgress { coins: number; total_earned: number; high_score: number; unlocked_themes: string[]; unlocked_powerups: string[]; has_completed_gate: boolean }
export function mergeProgress(local: LocalProgress, cloud: CloudProgress): LocalProgress {
  const cloudPowerUps = countPowerUps(cloud.unlocked_powerups as PowerUp[]);
  return {
    coins: Math.max(local.coins, cloud.coins), totalEarned: Math.max(local.totalEarned, cloud.total_earned),
    highScore: Math.max(local.highScore, cloud.high_score),
    unlockedThemes: [...new Set([...local.unlockedThemes, ...(cloud.unlocked_themes as GameTheme[])])],
    ownedPowerUps: {
      'double-jump': Math.max(local.ownedPowerUps['double-jump'], cloudPowerUps['double-jump']),
      shield: Math.max(local.ownedPowerUps.shield, cloudPowerUps.shield),
      'slow-mo': Math.max(local.ownedPowerUps['slow-mo'], cloudPowerUps['slow-mo']),
    },
    hasCompletedGate: local.hasCompletedGate || cloud.has_completed_gate,
  };
}
function countPowerUps(powerUps: PowerUp[]): Record<PowerUp, number> {
  const counts: Record<PowerUp, number> = { 'double-jump': 0, shield: 0, 'slow-mo': 0 };
  for (const powerUp of powerUps) if (powerUp in counts) counts[powerUp]++;
  return counts;
}
export async function saveCalculation(_userId: AuthUserId, expression: string, result: string): Promise<boolean> {
  return !!(await api<{ success: boolean }>('/api/calculations', { method: 'POST', body: JSON.stringify({ expression, result }) }))?.success;
}
export async function getCalculationHistory(_userId: AuthUserId, limit = 5): Promise<Array<{ expression: string; result: string; created_at?: string }>> {
  return (await api<{ calculations: Array<{ expression: string; result: string; created_at?: string }> }>(`/api/calculations?limit=${encodeURIComponent(limit)}`))?.calculations || [];
}
export async function saveMathAttempt(_userId: AuthUserId, gradeLevel: string, problem: string, userAnswer: string | null,
  correctAnswer: string, isCorrect: boolean, coinsEarned: number): Promise<boolean> {
  return !!(await api<{ success: boolean }>('/api/math-attempts', { method: 'POST', body: JSON.stringify({ gradeLevel, problem, userAnswer, correctAnswer, isCorrect, coinsEarned }) }))?.success;
}
export async function getMathAttempts(limit = 100): Promise<Array<{ is_correct: boolean; created_at: string }>> {
  return (await api<{ attempts: Array<{ is_correct: boolean; created_at: string }> }>(`/api/math-attempts?limit=${encodeURIComponent(limit)}`))?.attempts || [];
}
export function createAuthUserId(authMethod: 'clerk' | 'simple' | null, userId: string): AuthUserId | null {
  return authMethod && userId ? { type: authMethod, id: userId } : null;
}
