'use client';

import { useState, useRef, useEffect } from 'react';
import { LogOut, User, Settings, RefreshCw, Cloud } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export function UserButton() {
  const { user, isLoaded, isSignedIn, signOut, authMethod, isSyncing } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
  const initials = displayName[0]?.toUpperCase() || 'P';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Sync indicator */}
      {isSyncing && (
        <div className="absolute -top-1 -right-1 z-10">
          <RefreshCw size={14} className="text-foamy-green animate-spin" />
        </div>
      )}
      
      {/* Avatar button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-10 h-10
          bg-ocean-blue
          border-4 border-pixel-black
          flex items-center justify-center
          font-pixel text-sm text-white
          hover:bg-[#5ba0e9]
          transition-colors
          cursor-pointer
          ${isSyncing ? 'opacity-75' : ''}
        `}
        style={{ 
          boxShadow: '3px 3px 0px #2d2d2d',
          imageRendering: 'pixelated',
        }}
      >
        {initials}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className="
            absolute right-0 top-full mt-2
            w-48
            bg-pixel-black
            border-4 border-pixel-shadow
            z-50
          "
          style={{ boxShadow: '4px 4px 0px #2d2d2d' }}
        >
          {/* User info */}
          <div className="px-4 py-3 border-b-2 border-pixel-shadow">
            <p className="font-pixel text-xs text-foamy-green truncate">
              {displayName}
            </p>
            <p className="font-lcd text-sm text-gray-400 truncate">
              @{user.username}
            </p>
            {/* Auth method badge */}
            <div className="flex items-center gap-2 mt-1">
              <span className={`
                inline-block px-2 py-0.5
                font-lcd text-xs
                border border-current
                ${authMethod === 'simple' ? 'text-foamy-green' : 'text-ocean-blue'}
              `}>
                {authMethod === 'simple' ? 'QUICK' : 'EMAIL'}
              </span>
              
              {/* Cloud sync status */}
              <span className="flex items-center gap-1 text-gray-500 text-xs">
                <Cloud size={12} />
                {isSyncing ? 'Syncing...' : 'Synced'}
              </span>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                // Could open profile settings
              }}
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
              Profile
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                // Could open settings
              }}
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
            </button>

            <button
              onClick={() => {
                signOut();
                setIsOpen(false);
              }}
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
