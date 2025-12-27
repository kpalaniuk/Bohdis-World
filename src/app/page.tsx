'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calculator, Brain, Gamepad2, AlertTriangle, User, Sparkles } from 'lucide-react';
import { PixelCard } from '@/components/ui/PixelCard';
import { PixelButton } from '@/components/ui/PixelButton';
import { PixelFrame } from '@/components/ui/PixelFrame';
import { SimpleAuthForm } from '@/components/auth/SimpleAuthForm';
import { CharacterSelector } from '@/components/character/CharacterSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useCharacterStore } from '@/stores/characterStore';

export default function Home() {
  const { isLoaded, isSignedIn, user } = useAuth();
  const { hasSelectedCharacter, getCharacter } = useCharacterStore();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showGuestWarning, setShowGuestWarning] = useState(false);
  const [continueAsGuest, setContinueAsGuest] = useState(false);

  const character = getCharacter();

  // Show loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="font-pixel text-foamy-green animate-pulse text-xl">LOADING...</div>
      </div>
    );
  }

  // Show character selection if logged in but no character selected
  if (isSignedIn && !hasSelectedCharacter) {
    return <CharacterSelector />;
  }

  // If not signed in and hasn't chosen to continue as guest, show welcome with login
  if (!isSignedIn && !continueAsGuest) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
        <PixelCard 
          variant="glass" 
          padding="lg" 
          className="max-w-xl w-full mx-auto"
        >
          {/* Hero Section */}
          <div className="flex flex-col items-center gap-6 mb-6">
            {/* Profile Image */}
            <PixelFrame
              src="/bohdi.jpg"
              alt="Bohdi"
              width={150}
              height={150}
              frameColor="green"
              frameWidth="thick"
            />

            {/* Bio */}
            <div className="text-center">
              <h1 
                className="font-pixel text-foamy-green text-xl md:text-2xl mb-3"
                style={{ textShadow: '3px 3px 0px #2d2d2d' }}
              >
                WELCOME TO BOHDI&apos;S WORLD!
              </h1>
              
              <p className="font-lcd text-gray-300 text-lg leading-relaxed">
                Play math games, earn coins, and compete with friends!
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t-4 border-pixel-shadow my-6" />

          {/* Login Form */}
          <div className="flex flex-col items-center">
            <h2 
              className="font-pixel text-ocean-blue text-sm mb-4"
              style={{ textShadow: '2px 2px 0px #2d2d2d' }}
            >
              {authMode === 'signin' ? 'SIGN IN TO PLAY' : 'CREATE YOUR ACCOUNT'}
            </h2>

            <SimpleAuthForm 
              mode={authMode} 
              onModeChange={setAuthMode}
            />
          </div>

          {/* Guest Warning Section */}
          <div className="border-t-4 border-pixel-shadow mt-6 pt-6">
            {!showGuestWarning ? (
              <button
                onClick={() => setShowGuestWarning(true)}
                className="w-full font-lcd text-gray-400 hover:text-gray-300 text-sm transition-colors text-center"
              >
                Or continue without an account →
              </button>
            ) : (
              <div className="space-y-4">
                <div 
                  className="p-4 bg-yellow-900/30 border-4 border-yellow-600 flex items-start gap-3"
                  style={{ boxShadow: '3px 3px 0px #2d2d2d' }}
                >
                  <AlertTriangle className="text-yellow-400 flex-shrink-0 mt-0.5" size={24} />
                  <div>
                    <p className="font-pixel text-yellow-400 text-xs mb-2">WARNING!</p>
                    <p className="font-lcd text-yellow-200 text-sm leading-relaxed">
                      Playing as a guest means your <span className="text-white font-bold">coins</span>, 
                      <span className="text-white font-bold"> progress</span>, and 
                      <span className="text-white font-bold"> high scores</span> won&apos;t be saved!
                    </p>
                    <p className="font-lcd text-yellow-300/80 text-xs mt-2">
                      Create an account to save your progress and compete with friends.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <PixelButton
                    variant="ghost"
                    size="md"
                    onClick={() => setShowGuestWarning(false)}
                    className="flex-1"
                  >
                    Back
                  </PixelButton>
                  <PixelButton
                    variant="secondary"
                    size="md"
                    onClick={() => setContinueAsGuest(true)}
                    className="flex-1"
                  >
                    Continue Anyway
                  </PixelButton>
                </div>
              </div>
            )}
          </div>
        </PixelCard>
      </div>
    );
  }

  // Main dashboard view (logged in or guest)
  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
      <PixelCard 
        variant="glass" 
        padding="lg" 
        className="max-w-2xl w-full mx-auto"
      >
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
          {/* Profile Image or Character */}
          <div className="flex-shrink-0">
            {isSignedIn && character ? (
              <div 
                className="w-[180px] h-[180px] flex items-center justify-center border-4 border-pixel-black relative overflow-hidden"
                style={{ 
                  backgroundColor: character.primaryColor,
                  boxShadow: '6px 6px 0px #2d2d2d'
                }}
              >
                <span className="text-8xl">{character.emoji}</span>
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-1 px-2">
                  <p className="font-pixel text-xs text-white text-center truncate">
                    {user?.displayName || character.name}
                  </p>
                </div>
              </div>
            ) : (
              <PixelFrame
                src="/bohdi.jpg"
                alt="Bohdi"
                width={180}
                height={180}
                frameColor="green"
                frameWidth="thick"
              />
            )}
          </div>

          {/* Bio */}
          <div className="text-center md:text-left">
            <h1 
              className="font-pixel text-foamy-green text-xl md:text-2xl mb-4"
              style={{ textShadow: '3px 3px 0px #2d2d2d' }}
            >
              {isSignedIn ? (
                <>HEY, {(user?.displayName || user?.username || 'PLAYER').toUpperCase()}!</>
              ) : (
                <>HEY, I&apos;M BOHDI!</>
              )}
            </h1>
            
            {isSignedIn && character ? (
              <p className="font-lcd text-white text-lg leading-relaxed">
                You&apos;re playing as <span className="text-ocean-blue font-bold">{character.name}</span>!{' '}
                {character.description}
              </p>
            ) : (
              <p className="font-lcd text-white text-lg md:text-xl leading-relaxed">
                I&apos;m <span className="text-ocean-blue font-bold">8 years old</span> and 
                I live in <span className="text-foamy-green">San Diego</span>. I&apos;m into 
                soccer, piano, gymnastics, Jiu Jitsu, and making stuff with my dad.
              </p>
            )}
            
            <p className="font-lcd text-gray-300 text-lg mt-4">
              {isSignedIn ? (
                <>Earn coins by solving math problems and spend them in the shop!</>
              ) : (
                <>
                  Try jumping over the obstacles in the background with{' '}
                  <kbd className="px-2 py-1 bg-ocean-blue text-white font-pixel text-xs border-2 border-pixel-black">
                    SPACE
                  </kbd>{' '}
                  while you&apos;re here!
                </>
              )}
            </p>

            {/* Guest warning banner */}
            {!isSignedIn && (
              <div className="mt-4 p-2 bg-yellow-900/20 border-2 border-yellow-600/50 flex items-center gap-2">
                <AlertTriangle size={14} className="text-yellow-400" />
                <span className="font-lcd text-yellow-300 text-xs">
                  Guest mode - progress won&apos;t be saved
                </span>
                <Link 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setContinueAsGuest(false); }}
                  className="font-lcd text-foamy-green text-xs hover:underline ml-auto"
                >
                  Sign in
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t-4 border-pixel-shadow my-6" />

        {/* Quick Links */}
        <div className="space-y-4">
          <h2 
            className="font-pixel text-ocean-blue text-sm text-center mb-6"
            style={{ textShadow: '2px 2px 0px #2d2d2d' }}
          >
            {isSignedIn ? 'CHOOSE YOUR ADVENTURE' : 'CHECK OUT MY STUFF'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Calculator */}
            <Link href="/calculator" className="block">
              <PixelButton
                variant="primary"
                size="lg"
                icon={Calculator}
                className="w-full"
              >
                Calculator
              </PixelButton>
            </Link>

            {/* Math Challenge */}
            <Link href="/math" className="block">
              <PixelButton
                variant="secondary"
                size="lg"
                icon={Brain}
                className="w-full"
              >
                Math
              </PixelButton>
            </Link>

            {/* Game */}
            <Link href="/game" className="block">
              <PixelButton
                variant="ghost"
                size="lg"
                icon={Gamepad2}
                className="w-full"
              >
                Game
              </PixelButton>
            </Link>
          </div>

          {/* Profile & Shop links for signed-in users */}
          {isSignedIn && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Link href="/profile" className="block">
                <PixelButton
                  variant="ghost"
                  size="md"
                  icon={User}
                  className="w-full"
                >
                  My Profile
                </PixelButton>
              </Link>
              <Link href="/shop" className="block">
                <PixelButton
                  variant="ghost"
                  size="md"
                  icon={Sparkles}
                  className="w-full"
                >
                  Shop
                </PixelButton>
              </Link>
            </div>
          )}

          <p className="text-center font-lcd text-gray-500 text-sm mt-4">
            Earn coins by solving math problems and spend them on accessories!
          </p>
        </div>

        {/* Fun stats */}
        <div className="mt-8 pt-6 border-t-4 border-pixel-shadow">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="font-pixel text-foamy-green text-lg">8</div>
              <div className="font-lcd text-gray-400 text-sm">Years Old</div>
            </div>
            <div>
              <div className="font-pixel text-ocean-blue text-lg">5+</div>
              <div className="font-lcd text-gray-400 text-sm">Hobbies</div>
            </div>
            <div>
              <div className="font-pixel text-sunset-orange text-lg">∞</div>
              <div className="font-lcd text-gray-400 text-sm">Fun Level</div>
            </div>
          </div>
        </div>
      </PixelCard>
    </div>
  );
}
