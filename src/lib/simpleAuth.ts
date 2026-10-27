export type UserRole = 'user' | 'admin' | 'superuser';

export interface SimpleUser {
  id: string;
  username: string;
  display_name: string | null;
  created_at: string;
  role: UserRole;
  can_gift_items: boolean;
}

export interface AdminUserView extends SimpleUser {
  last_login_at: string | null;
  profile?: { id: string; has_completed_gate: boolean };
  progress?: { coins: number; total_earned: number; high_score: number; unlocked_themes: string[]; unlocked_powerups: string[] };
  recentActivities?: Array<{ activity_type: string; activity_data: Record<string, unknown>; created_at: string }>;
}

async function request<T>(url: string, init?: RequestInit): Promise<{ data: T | null; error: string | null }> {
  try {
    const response = await fetch(url, { ...init, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...init?.headers } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { data: null, error: data.error || 'Something went wrong' };
    return { data, error: null };
  } catch {
    return { data: null, error: 'Something went wrong' };
  }
}

export function isAdmin(user: SimpleUser | null): boolean {
  return user?.role === 'admin' || user?.role === 'superuser';
}
export function isSuperuser(user: SimpleUser | null): boolean { return user?.role === 'superuser'; }

export async function signUpSimple(username: string, password: string, displayName?: string, code?: string) {
  const result = await request<{ user: SimpleUser }>('/api/auth/signup', { method: 'POST', body: JSON.stringify({ username, password, displayName, code }) });
  return { user: result.data?.user || null, error: result.error };
}
export async function getAuthConfig(): Promise<{ signupCodeRequired: boolean }> {
  return (await request<{ signupCodeRequired: boolean }>('/api/auth/config')).data || { signupCodeRequired: false };
}
export async function signInSimple(username: string, password: string) {
  const result = await request<{ user: SimpleUser }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
  return { user: result.data?.user || null, error: result.error };
}
export async function getCurrentUser(): Promise<SimpleUser | null> {
  return (await request<{ user: SimpleUser | null }>('/api/auth/me')).data?.user || null;
}
export async function signOutSimple(): Promise<void> { await request('/api/auth/logout', { method: 'POST' }); }
export async function getSimpleUserProfile(_userId: string) {
  return (await request<{ profile: unknown }>('/api/progress')).data?.profile || null;
}

// Compatibility no-ops: the httpOnly cookie is the sole auth source of truth.
export function saveSession(_user: SimpleUser): void {}
export function getSession(): SimpleUser | null { return null; }
export function clearSession(): void {}

export async function getAllUsers(): Promise<AdminUserView[]> {
  return (await request<{ users: AdminUserView[] }>('/api/admin/users')).data?.users || [];
}
export async function giftCoins(_adminUser: SimpleUser, targetUserId: string, amount: number, reason?: string) {
  const result = await request<{ success: boolean; newBalance?: number }>('/api/admin/gift-coins', { method: 'POST', body: JSON.stringify({ targetUserId, amount, reason }) });
  return { success: !!result.data?.success, error: result.error, newBalance: result.data?.newBalance };
}
export async function updateUserRole(_adminUser: SimpleUser, targetUserId: string, newRole: UserRole) {
  const result = await request<{ success: boolean }>('/api/admin/role', { method: 'PUT', body: JSON.stringify({ targetUserId, role: newRole }) });
  return { success: !!result.data?.success, error: result.error };
}
export async function resetUserPassword(_adminUser: SimpleUser, targetUserId: string, newPassword: string) {
  const result = await request<{ success: boolean }>('/api/admin/reset-password', { method: 'POST', body: JSON.stringify({ targetUserId, newPassword }) });
  return { success: !!result.data?.success, error: result.error };
}
export async function updateDisplayName(_userId: string, newDisplayName: string) {
  const result = await request<{ success: boolean }>('/api/auth/display-name', { method: 'PUT', body: JSON.stringify({ displayName: newDisplayName }) });
  return { success: !!result.data?.success, error: result.error };
}
export async function changePassword(_userId: string, currentPassword: string, newPassword: string) {
  const result = await request<{ success: boolean }>('/api/auth/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) });
  return { success: !!result.data?.success, error: result.error };
}
export async function unlockItemForUser(_adminUser: SimpleUser, targetUserId: string, itemType: 'theme' | 'powerup', itemId: string) {
  const result = await request<{ success: boolean }>('/api/admin/unlock-item', { method: 'POST', body: JSON.stringify({ targetUserId, itemType, itemId }) });
  return { success: !!result.data?.success, error: result.error };
}
export async function deleteUser(_adminUser: SimpleUser, targetUserId: string) {
  const result = await request<{ success: boolean }>('/api/admin/delete-user', { method: 'DELETE', body: JSON.stringify({ targetUserId }) });
  return { success: !!result.data?.success, error: result.error };
}
