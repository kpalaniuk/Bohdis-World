export type ActivityType = 'login' | 'signup' | 'game_played' | 'math_problem' | 'calculator_used' | 'shop_purchase' | 'level_complete' | 'high_score';
export interface UserActivity { id: string; user_id: string; activity_type: ActivityType; activity_data: Record<string, unknown>; created_at: string }
async function api<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, { ...init, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...init?.headers } });
    return response.ok ? await response.json() : null;
  } catch { return null; }
}
export async function logActivity(_userId: string, activityType: ActivityType, activityData: Record<string, unknown> = {}): Promise<boolean> {
  return !!(await api<{ success: boolean }>('/api/activity', { method: 'POST', body: JSON.stringify({ activityType, activityData }) }))?.success;
}
export async function getUserActivities(_userId: string, limit = 50): Promise<UserActivity[]> {
  return (await api<{ activities: UserActivity[] }>(`/api/activity?limit=${encodeURIComponent(limit)}`))?.activities || [];
}
export async function getAllUserActivities(limit = 100): Promise<Array<UserActivity & { username: string; display_name: string | null }>> {
  return (await api<{ activities: Array<UserActivity & { username: string; display_name: string | null }> }>(`/api/admin/activities?limit=${encodeURIComponent(limit)}`))?.activities || [];
}

