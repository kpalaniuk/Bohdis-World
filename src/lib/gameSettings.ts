export interface GameSettings {
  id?: string; user_id: string; game_name: string; settings: Record<string, unknown>; created_at?: string; updated_at?: string;
  bohdi_user_profiles?: { simple_user_id?: string };
}
export interface GameSettingsConfig {
  surfrider?: { startingLives?: number; obstacleSpeed?: number; obstacleSpawnRate?: number; coinValue?: number; powerUpChance?: number };
  brickBreaker?: { startingLives?: number; ballSpeed?: number; paddleSpeed?: number; brickRows?: number; brickCols?: number; powerUpChance?: number };
  asteroids?: { startingLives?: number; shipSpeed?: number; asteroidSpeed?: number; asteroidCount?: number; bulletSpeed?: number; powerUpChance?: number };
  skyClimber?: { startingLives?: number; jumpStrength?: number; gravity?: number; spikeFrequency?: number; coinFrequency?: number };
}
async function api<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, { ...init, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...init?.headers } });
    return response.ok ? await response.json() : null;
  } catch { return null; }
}
export async function getUserGameSettings(_userId: string, gameName?: string): Promise<GameSettings[]> {
  const query = gameName ? `?gameName=${encodeURIComponent(gameName)}` : '';
  return (await api<{ settings: GameSettings[] }>(`/api/game-settings${query}`))?.settings || [];
}
export async function setUserGameSettings(userId: string, gameName: string, settings: Record<string, unknown>): Promise<boolean> {
  return !!(await api<{ success: boolean }>('/api/admin/game-settings', {
    method: 'PUT', body: JSON.stringify({ targetUserId: userId, gameName, settings }),
  }))?.success;
}
export async function getAllGameSettings(): Promise<Array<GameSettings & { username: string; display_name: string | null }>> {
  return (await api<{ settings: Array<GameSettings & { username: string; display_name: string | null }> }>('/api/admin/game-settings'))?.settings || [];
}
export async function getGameSettingsForUser(userId: string, gameName: string): Promise<GameSettingsConfig | null> {
  const own = await getUserGameSettings(userId, gameName);
  return own.length ? own[0].settings as GameSettingsConfig : null;
}
export async function getAdminGameSettingsForUser(userId: string, gameName: string): Promise<GameSettingsConfig | null> {
  const all = await getAllGameSettings();
  const selected = all.find(item => item.bohdi_user_profiles?.simple_user_id === userId && item.game_name === gameName);
  return selected ? selected.settings as GameSettingsConfig : null;
}
