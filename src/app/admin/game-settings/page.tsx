'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings, 
  Users, 
  Gamepad2,
  Save,
  ArrowLeft,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PixelCard } from '@/components/ui/PixelCard';
import { PixelButton } from '@/components/ui/PixelButton';
import { useAuth } from '@/contexts/AuthContext';
import { getAllUsers, AdminUserView, UserRole } from '@/lib/simpleAuth';
import { getUserGameSettings, setUserGameSettings, getGameSettingsForUser, GameSettingsConfig } from '@/lib/gameSettings';

const GAMES = [
  { id: 'surfrider', name: 'Surfrider', icon: '🏄' },
  { id: 'brickBreaker', name: 'Brick Breaker', icon: '🧱' },
  { id: 'asteroids', name: 'Asteroids', icon: '🌌' },
  { id: 'skyClimber', name: 'Sky Climber', icon: '⛰️' },
];

export default function GameSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<string>('surfrider');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  
  // Settings state
  const [settings, setSettings] = useState<GameSettingsConfig>({});

  useEffect(() => {
    if (!user || user.role !== 'superuser') {
      router.push('/admin');
      return;
    }

    loadUsers();
  }, [user, router]);

  useEffect(() => {
    if (selectedUserId && selectedGame) {
      loadSettings();
    }
  }, [selectedUserId, selectedGame]);

  const loadUsers = async () => {
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    if (!selectedUserId) return;
    
    try {
      const gameSettings = await getGameSettingsForUser(selectedUserId, selectedGame);
      if (gameSettings) {
        setSettings(gameSettings as GameSettingsConfig);
      } else {
        // Set defaults
        setSettings(getDefaultSettings(selectedGame));
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setSettings(getDefaultSettings(selectedGame));
    }
  };

  const getDefaultSettings = (gameName: string): GameSettingsConfig => {
    switch (gameName) {
      case 'surfrider':
        return {
          surfrider: {
            startingLives: 3,
            obstacleSpeed: 1,
            obstacleSpawnRate: 1,
            coinValue: 1,
            powerUpChance: 0.1,
          },
        };
      case 'brickBreaker':
        return {
          brickBreaker: {
            startingLives: 3,
            ballSpeed: 1,
            paddleSpeed: 1,
            brickRows: 5,
            brickCols: 10,
            powerUpChance: 0.1,
          },
        };
      case 'asteroids':
        return {
          asteroids: {
            startingLives: 3,
            shipSpeed: 1,
            asteroidSpeed: 1,
            asteroidCount: 2,
            bulletSpeed: 1,
            powerUpChance: 0.1,
          },
        };
      case 'skyClimber':
        return {
          skyClimber: {
            startingLives: 3,
            jumpStrength: 1,
            gravity: 1,
            spikeFrequency: 1,
            coinFrequency: 1,
          },
        };
      default:
        return {};
    }
  };

  const handleSave = async () => {
    if (!selectedUserId) return;
    
    setSaving(true);
    try {
      const success = await setUserGameSettings(selectedUserId, selectedGame, settings as Record<string, unknown>);
      if (success) {
        alert('Settings saved successfully!');
      } else {
        alert('Failed to save settings');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (game: string, key: string, value: number) => {
    setSettings(prev => ({
      ...prev,
      [game]: {
        ...prev[game as keyof GameSettingsConfig],
        [key]: value,
      },
    }));
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  if (loading) {
    return (
      <div className="min-h-screen bg-pixel-black p-4">
        <div className="max-w-6xl mx-auto">
          <PixelCard>
            <div className="p-8 text-center">
              <RefreshCw className="animate-spin mx-auto mb-4 text-ocean-blue" size={48} />
              <p className="font-lcd text-gray-300">Loading...</p>
            </div>
          </PixelCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pixel-black p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <PixelCard>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ArrowLeft 
                className="text-gray-300 cursor-pointer hover:text-ocean-blue transition-colors" 
                size={24}
                onClick={() => router.push('/admin')}
              />
              <Settings className="text-ocean-blue" size={24} />
              <h1 className="font-pixel text-2xl text-white">Game Settings</h1>
            </div>
          </div>
        </PixelCard>

        {/* User Selection */}
        <PixelCard>
          <div className="p-4">
            <h2 className="font-pixel text-lg text-white mb-4 flex items-center gap-2">
              <Users className="text-foamy-green" size={20} />
              Select User
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {users.map((targetUser) => (
                <div key={targetUser.id}>
                  <button
                    onClick={() => {
                      setSelectedUserId(targetUser.id);
                      setExpandedUserId(expandedUserId === targetUser.id ? null : targetUser.id);
                    }}
                    className={`
                      w-full p-3 flex items-center justify-between
                      border-4 transition-colors
                      ${selectedUserId === targetUser.id
                        ? 'border-ocean-blue bg-ocean-blue/20'
                        : 'border-pixel-shadow hover:border-gray-600'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-pixel text-white">
                          {targetUser.display_name || targetUser.username}
                        </div>
                        <div className="font-lcd text-gray-400 text-xs">
                          @{targetUser.username}
                        </div>
                      </div>
                    </div>
                    {expandedUserId === targetUser.id ? (
                      <ChevronUp className="text-gray-400" size={20} />
                    ) : (
                      <ChevronDown className="text-gray-400" size={20} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </PixelCard>

        {/* Game Settings */}
        {selectedUserId && (
          <PixelCard>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-pixel text-lg text-white flex items-center gap-2">
                  <Gamepad2 className="text-purple-400" size={20} />
                  Settings for {selectedUser?.display_name || selectedUser?.username}
                </h2>
                <PixelButton
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save size={16} className="mr-2" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </PixelButton>
              </div>

              {/* Game Selector */}
              <div className="mb-6 flex flex-wrap gap-2">
                {GAMES.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => setSelectedGame(game.id)}
                    className={`
                      px-4 py-2 font-lcd border-4 transition-colors
                      ${selectedGame === game.id
                        ? 'border-ocean-blue bg-ocean-blue/20 text-white'
                        : 'border-pixel-shadow text-gray-300 hover:border-gray-600'
                      }
                    `}
                  >
                    {game.icon} {game.name}
                  </button>
                ))}
              </div>

              {/* Settings Forms */}
              <div className="space-y-6">
                {selectedGame === 'surfrider' && (
                  <div className="space-y-4">
                    <h3 className="font-pixel text-white text-lg border-b-4 border-pixel-shadow pb-2">
                      Surfrider Settings
                    </h3>
                    <SettingSlider
                      label="Starting Lives"
                      value={settings.surfrider?.startingLives || 3}
                      min={1}
                      max={10}
                      onChange={(v) => updateSetting('surfrider', 'startingLives', v)}
                    />
                    <SettingSlider
                      label="Obstacle Speed (multiplier)"
                      value={settings.surfrider?.obstacleSpeed || 1}
                      min={0.5}
                      max={3}
                      step={0.1}
                      onChange={(v) => updateSetting('surfrider', 'obstacleSpeed', v)}
                    />
                    <SettingSlider
                      label="Obstacle Spawn Rate (multiplier)"
                      value={settings.surfrider?.obstacleSpawnRate || 1}
                      min={0.5}
                      max={3}
                      step={0.1}
                      onChange={(v) => updateSetting('surfrider', 'obstacleSpawnRate', v)}
                    />
                    <SettingSlider
                      label="Coin Value (multiplier)"
                      value={settings.surfrider?.coinValue || 1}
                      min={0.5}
                      max={5}
                      step={0.1}
                      onChange={(v) => updateSetting('surfrider', 'coinValue', v)}
                    />
                    <SettingSlider
                      label="Power-up Chance"
                      value={(settings.surfrider?.powerUpChance || 0.1) * 100}
                      min={0}
                      max={50}
                      step={1}
                      onChange={(v) => updateSetting('surfrider', 'powerUpChance', v / 100)}
                      suffix="%"
                    />
                  </div>
                )}

                {selectedGame === 'brickBreaker' && (
                  <div className="space-y-4">
                    <h3 className="font-pixel text-white text-lg border-b-4 border-pixel-shadow pb-2">
                      Brick Breaker Settings
                    </h3>
                    <SettingSlider
                      label="Starting Lives"
                      value={settings.brickBreaker?.startingLives || 3}
                      min={1}
                      max={10}
                      onChange={(v) => updateSetting('brickBreaker', 'startingLives', v)}
                    />
                    <SettingSlider
                      label="Ball Speed (multiplier)"
                      value={settings.brickBreaker?.ballSpeed || 1}
                      min={0.5}
                      max={3}
                      step={0.1}
                      onChange={(v) => updateSetting('brickBreaker', 'ballSpeed', v)}
                    />
                    <SettingSlider
                      label="Paddle Speed (multiplier)"
                      value={settings.brickBreaker?.paddleSpeed || 1}
                      min={0.5}
                      max={3}
                      step={0.1}
                      onChange={(v) => updateSetting('brickBreaker', 'paddleSpeed', v)}
                    />
                    <SettingSlider
                      label="Brick Rows"
                      value={settings.brickBreaker?.brickRows || 5}
                      min={3}
                      max={10}
                      onChange={(v) => updateSetting('brickBreaker', 'brickRows', v)}
                    />
                    <SettingSlider
                      label="Brick Columns"
                      value={settings.brickBreaker?.brickCols || 10}
                      min={5}
                      max={15}
                      onChange={(v) => updateSetting('brickBreaker', 'brickCols', v)}
                    />
                    <SettingSlider
                      label="Power-up Chance"
                      value={(settings.brickBreaker?.powerUpChance || 0.1) * 100}
                      min={0}
                      max={50}
                      step={1}
                      onChange={(v) => updateSetting('brickBreaker', 'powerUpChance', v / 100)}
                      suffix="%"
                    />
                  </div>
                )}

                {selectedGame === 'asteroids' && (
                  <div className="space-y-4">
                    <h3 className="font-pixel text-white text-lg border-b-4 border-pixel-shadow pb-2">
                      Asteroids Settings
                    </h3>
                    <SettingSlider
                      label="Starting Lives"
                      value={settings.asteroids?.startingLives || 3}
                      min={1}
                      max={10}
                      onChange={(v) => updateSetting('asteroids', 'startingLives', v)}
                    />
                    <SettingSlider
                      label="Ship Speed (multiplier)"
                      value={settings.asteroids?.shipSpeed || 1}
                      min={0.5}
                      max={3}
                      step={0.1}
                      onChange={(v) => updateSetting('asteroids', 'shipSpeed', v)}
                    />
                    <SettingSlider
                      label="Asteroid Speed (multiplier)"
                      value={settings.asteroids?.asteroidSpeed || 1}
                      min={0.5}
                      max={3}
                      step={0.1}
                      onChange={(v) => updateSetting('asteroids', 'asteroidSpeed', v)}
                    />
                    <SettingSlider
                      label="Asteroid Count (Level 1)"
                      value={settings.asteroids?.asteroidCount || 2}
                      min={1}
                      max={10}
                      onChange={(v) => updateSetting('asteroids', 'asteroidCount', v)}
                    />
                    <SettingSlider
                      label="Bullet Speed (multiplier)"
                      value={settings.asteroids?.bulletSpeed || 1}
                      min={0.5}
                      max={3}
                      step={0.1}
                      onChange={(v) => updateSetting('asteroids', 'bulletSpeed', v)}
                    />
                    <SettingSlider
                      label="Power-up Chance"
                      value={(settings.asteroids?.powerUpChance || 0.1) * 100}
                      min={0}
                      max={50}
                      step={1}
                      onChange={(v) => updateSetting('asteroids', 'powerUpChance', v / 100)}
                      suffix="%"
                    />
                  </div>
                )}

                {selectedGame === 'skyClimber' && (
                  <div className="space-y-4">
                    <h3 className="font-pixel text-white text-lg border-b-4 border-pixel-shadow pb-2">
                      Sky Climber Settings
                    </h3>
                    <SettingSlider
                      label="Starting Lives"
                      value={settings.skyClimber?.startingLives || 3}
                      min={1}
                      max={10}
                      onChange={(v) => updateSetting('skyClimber', 'startingLives', v)}
                    />
                    <SettingSlider
                      label="Jump Strength (multiplier)"
                      value={settings.skyClimber?.jumpStrength || 1}
                      min={0.5}
                      max={3}
                      step={0.1}
                      onChange={(v) => updateSetting('skyClimber', 'jumpStrength', v)}
                    />
                    <SettingSlider
                      label="Gravity (multiplier)"
                      value={settings.skyClimber?.gravity || 1}
                      min={0.5}
                      max={3}
                      step={0.1}
                      onChange={(v) => updateSetting('skyClimber', 'gravity', v)}
                    />
                    <SettingSlider
                      label="Spike Frequency (multiplier)"
                      value={settings.skyClimber?.spikeFrequency || 1}
                      min={0.1}
                      max={3}
                      step={0.1}
                      onChange={(v) => updateSetting('skyClimber', 'spikeFrequency', v)}
                    />
                    <SettingSlider
                      label="Coin Frequency (multiplier)"
                      value={settings.skyClimber?.coinFrequency || 1}
                      min={0.1}
                      max={3}
                      step={0.1}
                      onChange={(v) => updateSetting('skyClimber', 'coinFrequency', v)}
                    />
                  </div>
                )}
              </div>
            </div>
          </PixelCard>
        )}
      </div>
    </div>
  );
}

interface SettingSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}

function SettingSlider({ label, value, min, max, step = 1, suffix = '', onChange }: SettingSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="font-lcd text-gray-300 text-sm">{label}</label>
        <span className="font-pixel text-ocean-blue">
          {value.toFixed(step < 1 ? 1 : 0)}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-pixel-shadow rounded-lg appearance-none cursor-pointer accent-ocean-blue"
      />
      <div className="flex justify-between text-xs font-lcd text-gray-500">
        <span>{min}{suffix}</span>
        <span>{max}{suffix}</span>
      </div>
    </div>
  );
}

