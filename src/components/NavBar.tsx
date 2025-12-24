'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calculator, Brain, Menu, X, Gamepad2 } from 'lucide-react';
import { CoinDisplay } from './ui/CoinDisplay';
import { UserButton } from './auth/UserButton';
import { useGameStore } from '@/stores/gameStore';

const navLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/calculator', label: 'Calc', icon: Calculator },
  { href: '/math', label: 'Math', icon: Brain },
  { href: '/game', label: 'Game', icon: Gamepad2 },
];

export function NavBar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { highScore } = useGameStore();

  return (
    <nav 
      className="fixed top-0 left-0 right-0 z-40 bg-pixel-black/95 border-b-4 border-pixel-shadow"
      style={{ backdropFilter: 'blur(8px)' }}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            href="/"
            className="font-pixel text-foamy-green text-sm hover:text-ocean-blue transition-colors"
          >
            BOHDI
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-2">
            {navLinks.map(({ href, label, icon: Icon, disabled }) => {
              const isActive = pathname === href;
              
              if (disabled) {
                return (
                  <span
                    key={href}
                    className="
                      flex items-center gap-2 px-4 py-2
                      font-pixel text-xs
                      text-gray-500 cursor-not-allowed
                      border-4 border-pixel-shadow
                      bg-pixel-shadow/50
                    "
                    title="Coming Soon!"
                  >
                    <Icon size={16} />
                    <span className="hidden lg:inline">{label}</span>
                  </span>
                );
              }

              return (
                <Link
                  key={href}
                  href={href}
                  className={`
                    flex items-center gap-2 px-4 py-2
                    font-pixel text-xs
                    border-4 border-pixel-black
                    transition-all
                    ${isActive 
                      ? 'bg-foamy-green text-pixel-black' 
                      : 'bg-pixel-shadow text-white hover:bg-ocean-blue'
                    }
                  `}
                  style={{ 
                    boxShadow: isActive 
                      ? 'inset 2px 2px 0px rgba(0,0,0,0.2)' 
                      : '3px 3px 0px #1a1a1a',
                  }}
                >
                  <Icon size={16} />
                  <span className="hidden lg:inline">{label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right side: Coins, High Score, User */}
          <div className="flex items-center gap-4">
            {/* High Score */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="font-pixel text-xs text-gray-400">HI:</span>
              <span className="font-pixel text-xs text-ocean-blue">{highScore}m</span>
            </div>

            {/* Coins */}
            <CoinDisplay size="sm" />

            {/* User Button */}
            <UserButton />

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-white hover:text-foamy-green"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-pixel-black border-t-4 border-pixel-shadow">
          <div className="px-4 py-4 space-y-2">
            {navLinks.map(({ href, label, icon: Icon, disabled }) => {
              const isActive = pathname === href;
              
              if (disabled) {
                return (
                  <span
                    key={href}
                    className="
                      flex items-center gap-3 px-4 py-3
                      font-pixel text-xs
                      text-gray-500
                      border-4 border-pixel-shadow
                      bg-pixel-shadow/50
                    "
                  >
                    <Icon size={18} />
                    {label}
                    <span className="ml-auto text-gray-600">(Soon)</span>
                  </span>
                );
              }

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3
                    font-pixel text-xs
                    border-4 border-pixel-black
                    ${isActive 
                      ? 'bg-foamy-green text-pixel-black' 
                      : 'bg-pixel-shadow text-white'
                    }
                  `}
                  style={{ boxShadow: '3px 3px 0px #1a1a1a' }}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              );
            })}

            {/* Mobile High Score */}
            <div className="flex items-center justify-between px-4 py-3 border-t-2 border-pixel-shadow mt-4">
              <span className="font-pixel text-xs text-gray-400">HIGH SCORE:</span>
              <span className="font-pixel text-sm text-ocean-blue">{highScore}m</span>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export default NavBar;

