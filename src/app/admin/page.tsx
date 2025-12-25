'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  Users, 
  Coins, 
  Gift, 
  Crown, 
  ArrowLeft, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Palette,
  Zap,
  Key,
  AlertTriangle
} from 'lucide-react';
import { PixelCard } from '@/components/ui/PixelCard';
import { PixelButton } from '@/components/ui/PixelButton';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getAllUsers, 
  giftCoins, 
  updateUserRole, 
  resetUserPassword,
  unlockItemForUser,
  AdminUserView,
  UserRole,
  SimpleUser
} from '@/lib/simpleAuth';

// Available themes and powerups for gifting
const AVAILABLE_THEMES = [
  { id: 'default', name: 'Beach', cost: 0 },
  { id: 'sunset', name: 'Sunset', cost: 100 },
  { id: 'night', name: 'Night', cost: 200 },
  { id: 'space', name: 'Space', cost: 500 },
  { id: 'candy', name: 'Candy Land', cost: 300 },
  { id: 'retro', name: 'Retro', cost: 250 },
];

const AVAILABLE_POWERUPS = [
  { id: 'magnet', name: 'Coin Magnet', cost: 150 },
  { id: 'shield', name: 'Shield', cost: 200 },
  { id: 'slowmo', name: 'Slow Motion', cost: 250 },
  { id: 'doublecoins', name: 'Double Coins', cost: 300 },
  { id: 'jetpack', name: 'Jetpack', cost: 500 },
];

export default function AdminPage() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn, isAdmin, isSuperuser } = useAuth();
  
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Action states
  const [giftAmount, setGiftAmount] = useState<{ [key: string]: number }>({});
  const [newPasswords, setNewPasswords] = useState<{ [key: string]: string }>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Check admin access
  useEffect(() => {
    if (isLoaded && (!isSignedIn || !isAdmin)) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, isAdmin, router]);

  // Load users
  useEffect(() => {
    async function loadUsers() {
      if (!isAdmin) return;
      
      setIsLoading(true);
      const allUsers = await getAllUsers();
      setUsers(allUsers);
      setIsLoading(false);
    }
    
    if (isLoaded && isAdmin) {
      loadUsers();
    }
  }, [isLoaded, isAdmin]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    const allUsers = await getAllUsers();
    setUsers(allUsers);
    setIsLoading(false);
    showMessage('success', 'User list refreshed!');
  };

  const handleGiftCoins = async (targetUserId: string) => {
    const amount = giftAmount[targetUserId] || 0;
    if (amount === 0) {
      showMessage('error', 'Enter an amount to gift');
      return;
    }
    
    setActionLoading(`gift-${targetUserId}`);
    
    const adminUser: SimpleUser = {
      id: user!.id,
      username: user!.username!,
      display_name: user!.displayName,
      created_at: '',
      role: user!.role,
      can_gift_items: user!.canGiftItems,
    };
    
    const result = await giftCoins(adminUser, targetUserId, amount, 'Admin gift');
    
    if (result.success) {
      showMessage('success', `Gifted ${amount} coins! New balance: ${result.newBalance}`);
      setGiftAmount({ ...giftAmount, [targetUserId]: 0 });
      await handleRefresh();
    } else {
      showMessage('error', result.error || 'Failed to gift coins');
    }
    
    setActionLoading(null);
  };

  const handleRoleChange = async (targetUserId: string, newRole: UserRole) => {
    if (!isSuperuser) {
      showMessage('error', 'Only superusers can change roles');
      return;
    }
    
    setActionLoading(`role-${targetUserId}`);
    
    const adminUser: SimpleUser = {
      id: user!.id,
      username: user!.username!,
      display_name: user!.displayName,
      created_at: '',
      role: user!.role,
      can_gift_items: user!.canGiftItems,
    };
    
    const result = await updateUserRole(adminUser, targetUserId, newRole);
    
    if (result.success) {
      showMessage('success', `Role updated to ${newRole}`);
      await handleRefresh();
    } else {
      showMessage('error', result.error || 'Failed to update role');
    }
    
    setActionLoading(null);
  };

  const handleResetPassword = async (targetUserId: string) => {
    const newPassword = newPasswords[targetUserId];
    if (!newPassword || newPassword.length < 4) {
      showMessage('error', 'Password must be at least 4 characters');
      return;
    }
    
    setActionLoading(`password-${targetUserId}`);
    
    const adminUser: SimpleUser = {
      id: user!.id,
      username: user!.username!,
      display_name: user!.displayName,
      created_at: '',
      role: user!.role,
      can_gift_items: user!.canGiftItems,
    };
    
    const result = await resetUserPassword(adminUser, targetUserId, newPassword);
    
    if (result.success) {
      showMessage('success', 'Password reset successfully!');
      setNewPasswords({ ...newPasswords, [targetUserId]: '' });
    } else {
      showMessage('error', result.error || 'Failed to reset password');
    }
    
    setActionLoading(null);
  };

  const handleUnlockItem = async (targetUserId: string, itemType: 'theme' | 'powerup', itemId: string) => {
    setActionLoading(`unlock-${targetUserId}-${itemId}`);
    
    const adminUser: SimpleUser = {
      id: user!.id,
      username: user!.username!,
      display_name: user!.displayName,
      created_at: '',
      role: user!.role,
      can_gift_items: user!.canGiftItems,
    };
    
    const result = await unlockItemForUser(adminUser, targetUserId, itemType, itemId);
    
    if (result.success) {
      showMessage('success', `Unlocked ${itemId}!`);
      await handleRefresh();
    } else {
      showMessage('error', result.error || 'Failed to unlock item');
    }
    
    setActionLoading(null);
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'superuser': return 'bg-purple-600 text-white';
      case 'admin': return 'bg-yellow-500 text-black';
      default: return 'bg-gray-600 text-white';
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'superuser': return <Crown size={12} />;
      case 'admin': return <Shield size={12} />;
      default: return null;
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="font-pixel text-foamy-green animate-pulse">LOADING...</div>
      </div>
    );
  }

  if (!isSignedIn || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <PixelCard variant="glass" padding="lg">
          <div className="text-center">
            <AlertTriangle className="mx-auto text-sunset-orange mb-4" size={48} />
            <p className="font-pixel text-sunset-orange">ACCESS DENIED</p>
            <p className="font-lcd text-gray-400 mt-2">You don't have permission to view this page.</p>
          </div>
        </PixelCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pt-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-400 hover:text-foamy-green transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 
              className="font-pixel text-foamy-green text-xl"
              style={{ textShadow: '3px 3px 0px #2d2d2d' }}
            >
              🛡️ ADMIN PANEL
            </h1>
            <p className="font-lcd text-gray-400 text-sm">
              Welcome, {user?.displayName || user?.username}!
            </p>
          </div>
          <PixelButton
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={handleRefresh}
            disabled={isLoading}
          >
            Refresh
          </PixelButton>
        </div>

        {/* Action Message */}
        {actionMessage && (
          <div className={`
            mb-4 p-3 border-4 font-lcd text-sm flex items-center gap-2
            ${actionMessage.type === 'success' 
              ? 'bg-green-900/50 border-foamy-green text-foamy-green' 
              : 'bg-red-900/50 border-red-500 text-red-300'}
          `}>
            {actionMessage.type === 'success' ? <Check size={16} /> : <X size={16} />}
            {actionMessage.text}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <PixelCard variant="solid" padding="md">
            <div className="flex items-center gap-3">
              <Users className="text-ocean-blue" size={24} />
              <div>
                <div className="font-pixel text-lg text-ocean-blue">{users.length}</div>
                <div className="font-lcd text-gray-400 text-xs">TOTAL USERS</div>
              </div>
            </div>
          </PixelCard>
          
          <PixelCard variant="solid" padding="md">
            <div className="flex items-center gap-3">
              <Crown className="text-purple-400" size={24} />
              <div>
                <div className="font-pixel text-lg text-purple-400">
                  {users.filter(u => u.role === 'superuser').length}
                </div>
                <div className="font-lcd text-gray-400 text-xs">SUPERUSERS</div>
              </div>
            </div>
          </PixelCard>
          
          <PixelCard variant="solid" padding="md">
            <div className="flex items-center gap-3">
              <Shield className="text-yellow-400" size={24} />
              <div>
                <div className="font-pixel text-lg text-yellow-400">
                  {users.filter(u => u.role === 'admin').length}
                </div>
                <div className="font-lcd text-gray-400 text-xs">ADMINS</div>
              </div>
            </div>
          </PixelCard>
          
          <PixelCard variant="solid" padding="md">
            <div className="flex items-center gap-3">
              <Coins className="text-foamy-green" size={24} />
              <div>
                <div className="font-pixel text-lg text-foamy-green">
                  {users.reduce((sum, u) => sum + (u.progress?.coins || 0), 0)}
                </div>
                <div className="font-lcd text-gray-400 text-xs">TOTAL COINS</div>
              </div>
            </div>
          </PixelCard>
        </div>

        {/* Users List */}
        <PixelCard variant="glass" padding="lg">
          <h2 
            className="font-pixel text-ocean-blue text-lg mb-4 flex items-center gap-2"
            style={{ textShadow: '2px 2px 0px #2d2d2d' }}
          >
            <Users size={20} />
            USER MANAGEMENT
          </h2>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="font-pixel text-gray-400 animate-pulse">LOADING USERS...</div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <div className="font-lcd text-gray-400">No users found</div>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((targetUser) => (
                <div 
                  key={targetUser.id}
                  className="border-4 border-pixel-shadow bg-pixel-black/50"
                >
                  {/* User Header */}
                  <button
                    onClick={() => setExpandedUserId(
                      expandedUserId === targetUser.id ? null : targetUser.id
                    )}
                    className="w-full p-4 flex items-center gap-4 hover:bg-pixel-shadow/30 transition-colors"
                  >
                    {/* Avatar */}
                    <div 
                      className="w-10 h-10 bg-ocean-blue border-2 border-pixel-black flex items-center justify-center flex-shrink-0"
                      style={{ boxShadow: '2px 2px 0px #1a1a1a' }}
                    >
                      <span className="font-pixel text-white text-sm">
                        {(targetUser.display_name || targetUser.username)[0]?.toUpperCase()}
                      </span>
                    </div>
                    
                    {/* User Info */}
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-pixel text-white text-sm">
                          {targetUser.display_name || targetUser.username}
                        </span>
                        <span className={`
                          px-2 py-0.5 font-lcd text-xs rounded flex items-center gap-1
                          ${getRoleBadgeColor(targetUser.role)}
                        `}>
                          {getRoleIcon(targetUser.role)}
                          {targetUser.role.toUpperCase()}
                        </span>
                      </div>
                      <div className="font-lcd text-gray-400 text-xs">
                        @{targetUser.username}
                      </div>
                    </div>
                    
                    {/* Stats Preview */}
                    <div className="hidden sm:flex items-center gap-4">
                      <div className="text-center">
                        <div className="font-pixel text-foamy-green text-sm">
                          {targetUser.progress?.coins || 0}
                        </div>
                        <div className="font-lcd text-gray-500 text-xs">COINS</div>
                      </div>
                      <div className="text-center">
                        <div className="font-pixel text-ocean-blue text-sm">
                          {targetUser.progress?.high_score || 0}m
                        </div>
                        <div className="font-lcd text-gray-500 text-xs">HIGH</div>
                      </div>
                    </div>
                    
                    {/* Expand Icon */}
                    {expandedUserId === targetUser.id ? (
                      <ChevronUp className="text-gray-400" size={20} />
                    ) : (
                      <ChevronDown className="text-gray-400" size={20} />
                    )}
                  </button>

                  {/* Expanded Actions */}
                  {expandedUserId === targetUser.id && (
                    <div className="border-t-4 border-pixel-shadow p-4 space-y-4">
                      {/* Stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-pixel-shadow/30">
                        <div>
                          <div className="font-lcd text-gray-400 text-xs">COINS</div>
                          <div className="font-pixel text-foamy-green">{targetUser.progress?.coins || 0}</div>
                        </div>
                        <div>
                          <div className="font-lcd text-gray-400 text-xs">TOTAL EARNED</div>
                          <div className="font-pixel text-yellow-400">{targetUser.progress?.total_earned || 0}</div>
                        </div>
                        <div>
                          <div className="font-lcd text-gray-400 text-xs">HIGH SCORE</div>
                          <div className="font-pixel text-ocean-blue">{targetUser.progress?.high_score || 0}m</div>
                        </div>
                        <div>
                          <div className="font-lcd text-gray-400 text-xs">GATE</div>
                          <div className="font-pixel text-purple-400">
                            {targetUser.profile?.has_completed_gate ? '✓ PASSED' : '✗ LOCKED'}
                          </div>
                        </div>
                      </div>

                      {/* Gift Coins */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Gift className="text-foamy-green" size={18} />
                        <span className="font-lcd text-gray-300 text-sm">Gift Coins:</span>
                        <input
                          type="number"
                          value={giftAmount[targetUser.id] || ''}
                          onChange={(e) => setGiftAmount({
                            ...giftAmount,
                            [targetUser.id]: parseInt(e.target.value) || 0
                          })}
                          className="w-24 px-2 py-1 bg-pixel-black border-2 border-pixel-shadow text-white font-lcd focus:border-foamy-green outline-none"
                          placeholder="Amount"
                        />
                        <PixelButton
                          variant="primary"
                          size="sm"
                          onClick={() => handleGiftCoins(targetUser.id)}
                          disabled={actionLoading === `gift-${targetUser.id}`}
                        >
                          {actionLoading === `gift-${targetUser.id}` ? '...' : 'GIFT'}
                        </PixelButton>
                        
                        {/* Quick gift buttons */}
                        <div className="flex gap-1 ml-2">
                          {[10, 50, 100, 500].map(amount => (
                            <button
                              key={amount}
                              onClick={() => setGiftAmount({ ...giftAmount, [targetUser.id]: amount })}
                              className="px-2 py-1 bg-pixel-shadow text-gray-300 font-lcd text-xs hover:bg-ocean-blue transition-colors"
                            >
                              +{amount}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Unlock Themes */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Palette className="text-purple-400" size={18} />
                          <span className="font-lcd text-gray-300 text-sm">Unlock Themes:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {AVAILABLE_THEMES.map(theme => {
                            const isUnlocked = targetUser.progress?.unlocked_themes?.includes(theme.id);
                            return (
                              <button
                                key={theme.id}
                                onClick={() => !isUnlocked && handleUnlockItem(targetUser.id, 'theme', theme.id)}
                                disabled={isUnlocked || actionLoading === `unlock-${targetUser.id}-${theme.id}`}
                                className={`
                                  px-3 py-1 font-lcd text-xs border-2 transition-colors
                                  ${isUnlocked 
                                    ? 'bg-foamy-green/20 border-foamy-green text-foamy-green cursor-default' 
                                    : 'bg-pixel-shadow border-pixel-shadow text-gray-300 hover:border-purple-400 hover:text-purple-400'}
                                `}
                              >
                                {isUnlocked ? '✓ ' : ''}{theme.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Unlock Powerups */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="text-yellow-400" size={18} />
                          <span className="font-lcd text-gray-300 text-sm">Unlock Power-ups:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {AVAILABLE_POWERUPS.map(powerup => {
                            const isUnlocked = targetUser.progress?.unlocked_powerups?.includes(powerup.id);
                            return (
                              <button
                                key={powerup.id}
                                onClick={() => !isUnlocked && handleUnlockItem(targetUser.id, 'powerup', powerup.id)}
                                disabled={isUnlocked || actionLoading === `unlock-${targetUser.id}-${powerup.id}`}
                                className={`
                                  px-3 py-1 font-lcd text-xs border-2 transition-colors
                                  ${isUnlocked 
                                    ? 'bg-foamy-green/20 border-foamy-green text-foamy-green cursor-default' 
                                    : 'bg-pixel-shadow border-pixel-shadow text-gray-300 hover:border-yellow-400 hover:text-yellow-400'}
                                `}
                              >
                                {isUnlocked ? '✓ ' : ''}{powerup.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Role Change (Superuser only) */}
                      {isSuperuser && targetUser.id !== user?.id && (
                        <div className="flex flex-wrap items-center gap-2">
                          <Crown className="text-purple-400" size={18} />
                          <span className="font-lcd text-gray-300 text-sm">Change Role:</span>
                          {(['user', 'admin', 'superuser'] as UserRole[]).map(role => (
                            <button
                              key={role}
                              onClick={() => handleRoleChange(targetUser.id, role)}
                              disabled={targetUser.role === role || actionLoading === `role-${targetUser.id}`}
                              className={`
                                px-3 py-1 font-lcd text-xs border-2 transition-colors
                                ${targetUser.role === role 
                                  ? getRoleBadgeColor(role) + ' border-white' 
                                  : 'bg-pixel-shadow border-pixel-shadow text-gray-300 hover:border-purple-400'}
                              `}
                            >
                              {role.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Reset Password */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Key className="text-sunset-orange" size={18} />
                        <span className="font-lcd text-gray-300 text-sm">Reset Password:</span>
                        <input
                          type="text"
                          value={newPasswords[targetUser.id] || ''}
                          onChange={(e) => setNewPasswords({
                            ...newPasswords,
                            [targetUser.id]: e.target.value
                          })}
                          className="w-32 px-2 py-1 bg-pixel-black border-2 border-pixel-shadow text-white font-lcd focus:border-sunset-orange outline-none"
                          placeholder="New password"
                        />
                        <PixelButton
                          variant="secondary"
                          size="sm"
                          onClick={() => handleResetPassword(targetUser.id)}
                          disabled={actionLoading === `password-${targetUser.id}`}
                        >
                          {actionLoading === `password-${targetUser.id}` ? '...' : 'RESET'}
                        </PixelButton>
                      </div>

                      {/* User Meta */}
                      <div className="pt-3 border-t-2 border-pixel-shadow font-lcd text-gray-500 text-xs flex flex-wrap gap-4">
                        <span>ID: {targetUser.id.slice(0, 8)}...</span>
                        <span>Created: {new Date(targetUser.created_at).toLocaleDateString()}</span>
                        {targetUser.last_login_at && (
                          <span>Last login: {new Date(targetUser.last_login_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </PixelCard>

        {/* Footer */}
        <div className="mt-6 text-center font-lcd text-gray-500 text-xs">
          Admin Panel v1.0 • {isSuperuser ? 'Superuser Access' : 'Admin Access'}
        </div>
      </div>
    </div>
  );
}

