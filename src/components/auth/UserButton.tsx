'use client';

import { useState, useRef, useEffect } from 'react';
import { LogOut, User, Settings, RefreshCw, Cloud, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCharacterStore, CHARACTERS } from '@/stores/characterStore';

export function UserButton() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn, signOut, isSyncing } = useAuth();
  const { selectedCharacter } = useCharacterStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const character = selectedCharacter ? CHARACTERS[selectedCharacter] : null;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isLoaded) {
    return (
      <div className="w-10 h-10 bg-pixel-shadow border-2 border-pixel-black animate-pulse" />
    );
  }

  if (!isSignedIn || !user) {
    return (
      <Link
        href="/sign-in"
        className="
          font-pixel text-xs
          bg-foamy-green text-pixel-black
          border-4 border-pixel-black
          px-4 py-2
          hover:bg-[#a8e8ba]
          transition-colors
          cursor-pointer
        "
        style={{ boxShadow: '3px 3px 0px #2d2d2d' }}
      >
        LOGIN
      </Link>
    );
  }

  const displayName = user.displayName || user.username || 'Player';

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
    router.push('/');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Sync indicator */}
      {isSyncing && (
        <div className="absolute -top-1 -right-1 z-10">
          <RefreshCw size={14} className="text-foamy-green animate-spin" />
        </div>
      )}
      
      {/* Avatar button - shows character or initial */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-10 h-10
          border-4 border-pixel-black
          flex items-center justify-center
          font-pixel text-sm text-white
          transition-colors
          cursor-pointer
          ${isSyncing ? 'opacity-75' : ''}
        `}
        style={{ 
          boxShadow: '3px 3px 0px #2d2d2d',
          backgroundColor: character?.primaryColor || '#4A90D9',
          imageRendering: 'pixelated',
        }}
      >
        {character ? (
          <span className="text-lg">{character.emoji}</span>
        ) : (
          displayName[0]?.toUpperCase() || 'P'
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className="
            absolute right-0 top-full mt-2
            w-52
            bg-pixel-black
            border-4 border-pixel-shadow
            z-50
          "
          style={{ boxShadow: '4px 4px 0px #2d2d2d' }}
        >
          {/* User info */}
          <div className="px-4 py-3 border-b-2 border-pixel-shadow">
            <div className="flex items-center gap-2">
              {character && (
                <span className="text-xl">{character.emoji}</span>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-pixel text-xs text-foamy-green truncate">
                  {displayName}
                </p>
                <p className="font-lcd text-sm text-gray-400 truncate">
                  @{user.username}
                </p>
              </div>
            </div>
            {/* Sync status */}
            <div className="flex items-center gap-2 mt-2">
              <span className="flex items-center gap-1 text-gray-500 text-xs font-lcd">
                <Cloud size={12} />
                {isSyncing ? 'Syncing...' : 'Synced'}
              </span>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="
                w-full px-4 py-2
                flex items-center gap-3
                font-lcd text-white
                hover:bg-pixel-shadow
                transition-colors
                cursor-pointer
              "
            >
              <User size={16} className="text-foamy-green" />
              Dashboard
            </Link>

            <Link
              href="/shop"
              onClick={() => setIsOpen(false)}
              className="
                w-full px-4 py-2
                flex items-center gap-3
                font-lcd text-white
                hover:bg-pixel-shadow
                transition-colors
                cursor-pointer
              "
            >
              <Sparkles size={16} className="text-yellow-400" />
              Shop
            </Link>

            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="
                w-full px-4 py-2
                flex items-center gap-3
                font-lcd text-white
                hover:bg-pixel-shadow
                transition-colors
                cursor-pointer
              "
            >
              <Settings size={16} className="text-ocean-blue" />
              Settings
            </Link>

            <button
              onClick={handleSignOut}
              className="
                w-full px-4 py-2
                flex items-center gap-3
                font-lcd text-white
                hover:bg-pixel-shadow
                transition-colors
                cursor-pointer
                border-t-2 border-pixel-shadow
              "
            >
              <LogOut size={16} className="text-sunset-orange" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserButton;
