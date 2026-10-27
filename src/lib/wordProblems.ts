import type { CustomWords, GeneratedNumbers } from '@/components/math/WordProblemGenerator';
import type { AuthUserId } from './syncProgress';

export interface UserProblem { id: string; user_id: string; template_id: string | null; custom_words: CustomWords; difficulty_level: number; created_at: string; updated_at: string }
export interface ForumProblem extends UserProblem { is_active: boolean; username?: string; display_name?: string; attempt_count?: number; correct_count?: number }
export interface ProblemAttempt {
  id: string; problem_id: string; user_id: string; user_answer: number | null; correct_answer: number;
  is_correct: boolean; generated_numbers: GeneratedNumbers; created_at: string; username?: string; display_name?: string;
}
async function api<T>(url: string, init?: RequestInit): Promise<{ data: T | null; error?: string }> {
  try {
    const response = await fetch(url, { ...init, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...init?.headers } });
    const data = await response.json().catch(() => ({}));
    return response.ok ? { data } : { data: null, error: data.error || 'Request failed' };
  } catch { return { data: null, error: 'Request failed' }; }
}
export async function saveUserProblem(_userId: AuthUserId, templateId: string | null, customWords: CustomWords, difficultyLevel: number): Promise<{ success: boolean; problemId?: string; error?: string }> {
  const result = await api<{ success: boolean; problemId?: string }>('/api/word-problems', { method: 'POST', body: JSON.stringify({ templateId, customWords, difficultyLevel }) });
  return result.data || { success: false, error: result.error };
}
export async function loadUserProblems(_userId: AuthUserId): Promise<{ success: boolean; problems?: UserProblem[]; error?: string }> {
  const result = await api<{ success: boolean; problems: UserProblem[] }>('/api/word-problems');
  return result.data || { success: false, error: result.error };
}
export async function deleteUserProblem(_userId: AuthUserId, problemId: string) {
  const result = await api<{ success: boolean }>('/api/word-problems', { method: 'DELETE', body: JSON.stringify({ problemId }) });
  return result.data || { success: false, error: result.error };
}
export async function postToForum(_userId: AuthUserId, templateId: string | null, customWords: CustomWords, difficultyLevel: number): Promise<{ success: boolean; problemId?: string; error?: string }> {
  const result = await api<{ success: boolean; problemId?: string }>('/api/forum', { method: 'POST', body: JSON.stringify({ templateId, customWords, difficultyLevel }) });
  return result.data || { success: false, error: result.error };
}
export async function loadForumProblems(difficultyLevel?: number, limit = 50): Promise<{ success: boolean; problems?: ForumProblem[]; error?: string }> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (difficultyLevel !== undefined) query.set('difficultyLevel', String(difficultyLevel));
  const result = await api<{ success: boolean; problems: ForumProblem[] }>(`/api/forum?${query}`);
  return result.data || { success: false, error: result.error };
}
export async function getProblemStats(problemId: string): Promise<{ attemptCount: number; correctCount: number }> {
  return (await api<{ attemptCount: number; correctCount: number }>(`/api/forum/stats?problemId=${encodeURIComponent(problemId)}`)).data || { attemptCount: 0, correctCount: 0 };
}
export async function submitProblemAttempt(_userId: AuthUserId, problemId: string, userAnswer: number, correctAnswer: number, generatedNumbers: GeneratedNumbers): Promise<{ success: boolean; isCorrect?: boolean; error?: string }> {
  const result = await api<{ success: boolean; isCorrect?: boolean }>('/api/forum/attempts', { method: 'POST', body: JSON.stringify({ problemId, userAnswer, correctAnswer, generatedNumbers }) });
  return result.data || { success: false, error: result.error };
}
export async function deleteForumProblem(problemId: string): Promise<{ success: boolean; error?: string }> {
  const result = await api<{ success: boolean }>('/api/forum', { method: 'DELETE', body: JSON.stringify({ problemId }) });
  return result.data || { success: false, error: result.error };
}
export async function getProblemAttempts(problemId: string): Promise<{ success: boolean; attempts?: ProblemAttempt[]; error?: string }> {
  const result = await api<{ success: boolean; attempts: ProblemAttempt[] }>(`/api/forum/attempts?problemId=${encodeURIComponent(problemId)}`);
  return result.data || { success: false, error: result.error };
}
