'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { PixelCard } from '@/components/ui/PixelCard';
import { PixelButton } from '@/components/ui/PixelButton';
import { useGameStore, GameTheme, PowerUp } from '@/stores/gameStore';
import { useSkyClimberStore } from '@/stores/skyClimberStore';
import { useUnlockStore } from '@/stores/unlockStore';
import { useCoinStore } from '@/stores/coinStore';
import { Zap, Shield, Timer, Palette, Trophy, Coins, Star, HelpCircle, Mountain, Waves, ArrowLeft, Square, Rocket } from 'lucide-react';
import confetti from 'canvas-confetti';
import { GameInstructions } from '@/components/game/GameInstructions';

// Dynamic imports for game canvases (client-side only)
const GameCanvas = dynamic(() => import('@/components/game/GameCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] border-4 border-pixel-black bg-ocean-blue flex items-center justify-center">
      <span className="font-pixel text-foamy-green animate-pulse">LOADING...</span>
    </div>
  ),
});

const SkyClimberCanvas = dynamic(() => import('@/components/game/SkyClimberCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] border-4 border-pixel-black bg-sky-400 flex items-center justify-center">
      <span className="font-pixel text-white animate-pulse">LOADING SKY CLIMBER...</span>
    </div>
  ),
});

const BrickBreakerCanvas = dynamic(() => import('@/components/game/BrickBreakerCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] border-4 border-pixel-black bg-purple-900 flex items-center justify-center">
      <span className="font-pixel text-white animate-pulse">LOADING BRICK BREAKER...</span>
    </div>
  ),
});

const AsteroidsCanvas = dynamic(() => import('@/components/game/AsteroidsCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] border-4 border-pixel-black bg-black flex items-center justify-center">
      <span className="font-pixel text-white animate-pulse">LOADING ASTEROIDS...</span>
    </div>
  ),
});

type GameType = 'select' | 'surf-runner' | 'sky-climber' | 'brick-breaker' | 'asteroids';

const THEMES: { id: GameTheme; name: string; price: number; colors: string[] }[] = [
  { id: 'beach', name: 'Beach Day', price: 0, colors: ['#87CEEB', '#4A90D9', '#f5e6c8'] },
  { id: 'sunset', name: 'Sunset Surf', price: 50, colors: ['#FF6B4A', '#FF8FAB', '#4A90D9'] },
  { id: 'night', name: 'Night Waves', price: 75, colors: ['#1a1a4a', '#2d2d6d', '#4A90D9'] },
  { id: 'tropical', name: 'Tropical Paradise', price: 100, colors: ['#00CED1', '#98D8AA', '#FFD700'] },
];

const POWERUPS: { id: PowerUp; name: string; icon: typeof Zap; price: number; description: string }[] = [
  { id: 'double-jump', name: 'Double Jump', icon: Zap, price: 25, description: 'Jump again in mid-air!' },
  { id: 'shield', name: 'Shield', icon: Shield, price: 30, description: 'Block one hit' },
  { id: 'slow-mo', name: 'Slow Motion', icon: Timer, price: 35, description: 'Slow time for 5 seconds' },
];

export default function GamePage() {
  const [currentGame, setCurrentGame] = useState<GameType>('select');
  const [highScore, setHighScore] = useState(0);
  const [lastScore, setLastScore] = useState(0);
  const [showShop, setShowShop] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const { currentTheme, setTheme, activePowerUps, activatePowerUp, deactivatePowerUp, highScore: storeHighScore, setHighScore: setStoreHighScore } = useGameStore();
  const { highestAltitude, timesReachedTop } = useSkyClimberStore();
  const { unlockedThemes, unlockedPowerUps, unlockTheme, buyPowerUp, getPowerUpCount } = useUnlockStore();
  const { coins, spendCoins } = useCoinStore();

  useEffect(() => {
    setHighScore(storeHighScore);
  }, [storeHighScore]);

  const handleGameOver = (score: number) => {
    setLastScore(score);
    if (score > highScore) {
      setHighScore(score);
      setStoreHighScore(score);
      // Confetti for new high score!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  const handleBuyTheme = (theme: GameTheme, price: number) => {
    if (coins >= price && !unlockedThemes.includes(theme)) {
      spendCoins(price);
      unlockTheme(theme);
      setTheme(theme);
    }
  };

  const handleBuyPowerUp = (powerUp: PowerUp, price: number) => {
    if (coins >= price) {
      spendCoins(price);
      buyPowerUp(powerUp);
    }
  };

  const handleUsePowerUp = (powerUp: PowerUp) => {
    const count = getPowerUpCount(powerUp);
    if (count > 0 && !activePowerUps.includes(powerUp)) {
      // Use from inventory
      useUnlockStore.getState().usePowerUp(powerUp);
      activatePowerUp(powerUp);
      
      // Auto-deactivate after duration
      const duration = powerUp === 'slow-mo' ? 5000 : powerUp === 'shield' ? 10000 : 15000;
      setTimeout(() => {
        deactivatePowerUp(powerUp);
      }, duration);
    }
  };

  // Game Selection Screen
  if (currentGame === 'select') {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 
              className="font-pixel text-foamy-green text-2xl md:text-3xl mb-4"
              style={{ textShadow: '4px 4px 0px #2d2d2d' }}
            >
              🎮 GAME ARCADE 🎮
            </h1>
            <p 
              className="font-lcd text-sand-beige text-lg"
              style={{ textShadow: '2px 2px 0px #2d2d2d' }}
            >
              Choose your adventure!
            </p>
          </div>

          {/* Coin Display */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2 bg-pixel-black/80 px-6 py-3 border-2 border-yellow-500">
              <span className="text-yellow-400 text-2xl">🪙</span>
              <span className="font-pixel text-yellow-400 text-lg">{coins}</span>
            </div>
          </div>

          {/* Game Cards */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Surf Runner Card */}
            <button
              onClick={() => setCurrentGame('surf-runner')}
              className="group"
            >
              <PixelCard 
                variant="solid" 
                padding="lg" 
                className="h-full transition-all hover:scale-105 hover:border-ocean-blue cursor-pointer"
              >
                <div className="text-center">
                  {/* Game Icon */}
                  <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-ocean-blue to-foamy-green rounded-lg flex items-center justify-center border-4 border-pixel-black">
                    <Waves className="w-12 h-12 text-white" />
                  </div>
                  
                  <h2 className="font-pixel text-ocean-blue text-lg mb-2">SURF RUNNER</h2>
                  <p className="font-lcd text-gray-400 text-sm mb-4">
                    Dodge obstacles and ride the waves! Jump over rocks, seaweed, and crabs.
                  </p>
                  
                  {/* Stats */}
                  <div className="flex justify-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                      <span className="font-pixel text-yellow-400">{highScore}m</span>
                    </div>
                  </div>
                  
                  {/* Play indicator */}
                  <div className="mt-4 font-pixel text-foamy-green text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    ▶ PLAY
                  </div>
                </div>
              </PixelCard>
            </button>

            {/* Sky Climber Card */}
            <button
              onClick={() => setCurrentGame('sky-climber')}
              className="group relative"
            >
              <PixelCard 
                variant="solid" 
                padding="lg" 
                className="h-full transition-all hover:scale-105 hover:border-purple-400 cursor-pointer"
              >
                <div className="text-center">
                  {/* Game Icon */}
                  <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-sky-400 to-purple-500 rounded-lg flex items-center justify-center border-4 border-pixel-black">
                    <Mountain className="w-12 h-12 text-white" />
                  </div>
                  
                  <h2 className="font-pixel text-purple-400 text-lg mb-2">SKY CLIMBER</h2>
                  <p className="font-lcd text-gray-400 text-sm mb-4">
                    Jump up floating islands to reach 5000m! Avoid spikes and collect coins.
                  </p>
                  
                  {/* Stats */}
                  <div className="flex justify-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Mountain className="w-4 h-4 text-foamy-green" />
                      <span className="font-pixel text-foamy-green">{highestAltitude}m</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                      <span className="font-pixel text-yellow-400">{timesReachedTop}x</span>
                    </div>
                  </div>
                  
                  {/* Play indicator */}
                  <div className="mt-4 font-pixel text-purple-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    ▶ PLAY
                  </div>
                </div>
              </PixelCard>
            </button>

            {/* Brick Breaker Card */}
            <button
              onClick={() => setCurrentGame('brick-breaker')}
              className="group"
            >
              <PixelCard 
                variant="solid" 
                padding="lg" 
                className="h-full transition-all hover:scale-105 hover:border-pink-400 cursor-pointer"
              >
                <div className="text-center">
                  {/* Game Icon */}
                  <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center border-4 border-pixel-black">
                    <Square className="w-12 h-12 text-white" />
                  </div>
                  
                  <h2 className="font-pixel text-pink-400 text-lg mb-2">BRICK BREAKER</h2>
                  <p className="font-lcd text-gray-400 text-sm mb-4">
                    Break all the colorful bricks! 10 levels of fun!
                  </p>
                  
                  {/* Play indicator */}
                  <div className="mt-4 font-pixel text-pink-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    ▶ PLAY
                  </div>
                </div>
              </PixelCard>
            </button>

            {/* Asteroids Card */}
            <button
              onClick={() => setCurrentGame('asteroids')}
              className="group"
            >
              <PixelCard 
                variant="solid" 
                padding="lg" 
                className="h-full transition-all hover:scale-105 hover:border-cyan-400 cursor-pointer"
              >
                <div className="text-center">
                  {/* Game Icon */}
                  <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-cyan-600 to-blue-800 rounded-lg flex items-center justify-center border-4 border-pixel-black">
                    <Rocket className="w-12 h-12 text-white" />
                  </div>
                  
                  <h2 className="font-pixel text-cyan-400 text-lg mb-2">ASTEROIDS</h2>
                  <p className="font-lcd text-gray-400 text-sm mb-4">
                    Classic space shooter! Destroy asteroids across 10 levels!
                  </p>
                  
                  {/* Play indicator */}
                  <div className="mt-4 font-pixel text-cyan-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    ▶ PLAY
                  </div>
                </div>
              </PixelCard>
            </button>
          </div>

          {/* Shop Button */}
          <div className="flex justify-center mt-8">
            <PixelButton onClick={() => setShowShop(true)} variant="secondary" size="lg">
              <Coins className="w-5 h-5 mr-2" />
              VISIT SHOP
            </PixelButton>
          </div>
        </div>

        {/* Shop Modal */}
        {showShop && (
          <ShopModal
            coins={coins}
            currentTheme={currentTheme}
            unlockedThemes={unlockedThemes}
            activePowerUps={activePowerUps}
            onClose={() => setShowShop(false)}
            onBuyTheme={handleBuyTheme}
            onBuyPowerUp={handleBuyPowerUp}
            onSelectTheme={setTheme}
            getPowerUpCount={getPowerUpCount}
          />
        )}
      </div>
    );
  }

  // Surf Runner Game
  if (currentGame === 'surf-runner') {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Back Button & Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setCurrentGame('select')}
              className="flex items-center gap-2 bg-pixel-shadow px-4 py-2 border-2 border-ocean-blue hover:border-foamy-green hover:text-foamy-green transition-colors font-pixel text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              BACK
            </button>
            <div className="flex-1 text-center">
              <h1 
                className="font-pixel text-foamy-green text-xl md:text-2xl"
                style={{ textShadow: '3px 3px 0px #2d2d2d' }}
              >
                SURF RUNNER
              </h1>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex justify-center gap-4 mb-6">
            <div className="flex items-center gap-2 bg-pixel-black/80 px-4 py-2 border-2 border-pixel-shadow">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="font-pixel text-yellow-400 text-xs">HI: {highScore}m</span>
            </div>
            <div className="flex items-center gap-2 bg-pixel-black/80 px-4 py-2 border-2 border-pixel-shadow">
              <Star className="w-4 h-4 text-foamy-green" />
              <span className="font-pixel text-foamy-green text-xs">LAST: {lastScore}m</span>
            </div>
            <button
              onClick={() => setShowShop(!showShop)}
              className="flex items-center gap-2 bg-ocean-blue px-4 py-2 border-2 border-pixel-shadow hover:bg-foamy-green hover:text-pixel-black transition-colors"
            >
              <Coins className="w-4 h-4" />
              <span className="font-pixel text-xs">SHOP</span>
            </button>
            <button
              onClick={() => setShowInstructions(true)}
              className="flex items-center gap-2 bg-pixel-shadow px-4 py-2 border-2 border-ocean-blue hover:border-foamy-green hover:text-foamy-green transition-colors"
              title="How to Play"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="font-pixel text-xs">HELP</span>
            </button>
          </div>

          {/* Game Canvas */}
          <div className="flex justify-center mb-6">
            <GameCanvas onGameOver={handleGameOver} />
          </div>

          {/* Power-up Quick Bar */}
          <div className="flex justify-center gap-4 mb-6">
            {POWERUPS.map((powerUp) => {
              const count = getPowerUpCount(powerUp.id);
              const isActive = activePowerUps.includes(powerUp.id);
              const Icon = powerUp.icon;

              return (
                <button
                  key={powerUp.id}
                  onClick={() => handleUsePowerUp(powerUp.id)}
                  disabled={count === 0 || isActive}
                  className={`
                    relative flex flex-col items-center gap-1 px-4 py-3 border-2 transition-all
                    ${isActive 
                      ? 'bg-foamy-green border-foamy-green text-pixel-black animate-pulse' 
                      : count > 0 
                        ? 'bg-pixel-black border-ocean-blue text-ocean-blue hover:border-foamy-green hover:text-foamy-green cursor-pointer'
                        : 'bg-pixel-black border-pixel-shadow text-gray-600 cursor-not-allowed'
                    }
                  `}
                  style={{ boxShadow: '3px 3px 0px #1a1a1a' }}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-pixel text-xs">{powerUp.name.split(' ')[0]}</span>
                  {count > 0 && (
                    <span className="absolute -top-2 -right-2 bg-sunset-orange text-pixel-white font-pixel text-xs w-6 h-6 flex items-center justify-center border border-pixel-black">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Controls Info */}
          <PixelCard variant="glass" padding="md" className="max-w-2xl mx-auto mb-6">
            <h3 className="font-pixel text-ocean-blue text-xs mb-3 text-center">CONTROLS</h3>
            <div className="flex justify-center gap-8 font-lcd text-gray-300 text-sm">
              <div className="flex items-center gap-2">
                <span className="bg-pixel-shadow px-3 py-1 border border-gray-600 font-pixel text-xs">SPACE</span>
                <span>Jump</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-pixel-shadow px-3 py-1 border border-gray-600 font-pixel text-xs">P</span>
                <span>Pause</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-pixel-shadow px-3 py-1 border border-gray-600 font-pixel text-xs">R</span>
                <span>Retry</span>
              </div>
            </div>
          </PixelCard>

          {/* Shop Modal */}
          {showShop && (
            <ShopModal
              coins={coins}
              currentTheme={currentTheme}
              unlockedThemes={unlockedThemes}
              activePowerUps={activePowerUps}
              onClose={() => setShowShop(false)}
              onBuyTheme={handleBuyTheme}
              onBuyPowerUp={handleBuyPowerUp}
              onSelectTheme={setTheme}
              getPowerUpCount={getPowerUpCount}
            />
          )}

          {/* Instructions Modal */}
          <GameInstructions 
            isOpen={showInstructions} 
            onClose={() => setShowInstructions(false)} 
          />
        </div>
      </div>
    );
  }

  // Sky Climber Game
  if (currentGame === 'sky-climber') {
    return (
      <div className="min-h-screen p-4 md:p-8 bg-gradient-to-b from-sky-900 to-purple-900">
        <div className="max-w-5xl mx-auto">
          {/* Back Button & Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setCurrentGame('select')}
              className="flex items-center gap-2 bg-pixel-shadow px-4 py-2 border-2 border-purple-400 hover:border-foamy-green hover:text-foamy-green transition-colors font-pixel text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              BACK
            </button>
            <div className="flex-1 text-center">
              <h1 
                className="font-pixel text-purple-300 text-xl md:text-2xl"
                style={{ textShadow: '3px 3px 0px #2d2d2d' }}
              >
                SKY CLIMBER
              </h1>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex justify-center gap-4 mb-6">
            <div className="flex items-center gap-2 bg-pixel-black/80 px-4 py-2 border-2 border-pixel-shadow">
              <Mountain className="w-4 h-4 text-foamy-green" />
              <span className="font-pixel text-foamy-green text-xs">BEST: {highestAltitude}m</span>
            </div>
            <div className="flex items-center gap-2 bg-pixel-black/80 px-4 py-2 border-2 border-pixel-shadow">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="font-pixel text-yellow-400 text-xs">WINS: {timesReachedTop}</span>
            </div>
            <div className="flex items-center gap-2 bg-pixel-black/80 px-4 py-2 border-2 border-pixel-shadow">
              <span className="text-yellow-400">🪙</span>
              <span className="font-pixel text-yellow-400 text-xs">{coins}</span>
            </div>
          </div>

          {/* Game Canvas */}
          <div className="flex justify-center mb-6">
            <SkyClimberCanvas />
          </div>

          {/* Controls Info */}
          <PixelCard variant="glass" padding="md" className="max-w-2xl mx-auto mb-6">
            <h3 className="font-pixel text-purple-400 text-xs mb-3 text-center">CONTROLS</h3>
            <div className="flex flex-wrap justify-center gap-6 font-lcd text-gray-300 text-sm">
              <div className="flex items-center gap-2">
                <span className="bg-pixel-shadow px-3 py-1 border border-gray-600 font-pixel text-xs">← →</span>
                <span>Move</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-pixel-shadow px-3 py-1 border border-gray-600 font-pixel text-xs">↑ / SPACE</span>
                <span>Jump</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-pixel-shadow px-3 py-1 border border-gray-600 font-pixel text-xs">P</span>
                <span>Pause</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-pixel-shadow px-3 py-1 border border-gray-600 font-pixel text-xs">R</span>
                <span>Respawn</span>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="font-lcd text-gray-400 text-xs">
                🎯 Reach 5000m! • 🚩 Checkpoints save progress • 💜 Collect power-ups for double jump!
              </p>
            </div>
          </PixelCard>
        </div>
      </div>
    );
  }

  // Brick Breaker Game
  if (currentGame === 'brick-breaker') {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Back Button & Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setCurrentGame('select')}
              className="flex items-center gap-2 bg-pixel-shadow px-4 py-2 border-2 border-pink-400 hover:border-foamy-green hover:text-foamy-green transition-colors font-pixel text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              BACK
            </button>
            <div className="flex-1 text-center">
              <h1 
                className="font-pixel text-pink-400 text-xl md:text-2xl"
                style={{ textShadow: '3px 3px 0px #2d2d2d' }}
              >
                BRICK BREAKER
              </h1>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex justify-center gap-4 mb-6">
            <div className="flex items-center gap-2 bg-pixel-black/80 px-4 py-2 border-2 border-pixel-shadow">
              <span className="text-yellow-400">🪙</span>
              <span className="font-pixel text-yellow-400 text-xs">{coins}</span>
            </div>
          </div>

          {/* Game Canvas */}
          <div className="flex justify-center mb-6">
            <BrickBreakerCanvas onGameOver={handleGameOver} />
          </div>

          {/* Controls Info */}
          <PixelCard variant="glass" padding="md" className="max-w-2xl mx-auto mb-6">
            <h3 className="font-pixel text-pink-400 text-xs mb-3 text-center">CONTROLS</h3>
            <div className="flex flex-wrap justify-center gap-6 font-lcd text-gray-300 text-sm">
              <div className="flex items-center gap-2">
                <span className="bg-pixel-shadow px-3 py-1 border border-gray-600 font-pixel text-xs">← →</span>
                <span>Move Paddle</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-pixel-shadow px-3 py-1 border border-gray-600 font-pixel text-xs">SPACE</span>
                <span>Start/Pause</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-pixel-shadow px-3 py-1 border border-gray-600 font-pixel text-xs">P</span>
                <span>Pause</span>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="font-lcd text-gray-400 text-xs">
                💡 Type "bohdiiscool" during gameplay for a special surprise!
              </p>
            </div>
          </PixelCard>
        </div>
      </div>
    );
  }

  // Asteroids Game
  if (currentGame === 'asteroids') {
    return (
      <div className="min-h-screen p-4 md:p-8 bg-black">
        <div className="max-w-5xl mx-auto">
          {/* Back Button & Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setCurrentGame('select')}
              className="flex items-center gap-2 bg-pixel-shadow px-4 py-2 border-2 border-cyan-400 hover:border-foamy-green hover:text-foamy-green transition-colors font-pixel text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              BACK
            </button>
            <div className="flex-1 text-center">
              <h1 
                className="font-pixel text-cyan-400 text-xl md:text-2xl"
                style={{ textShadow: '3px 3px 0px #2d2d2d' }}
              >
                ASTEROIDS
              </h1>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex justify-center gap-4 mb-6">
            <div className="flex items-center gap-2 bg-pixel-black/80 px-4 py-2 border-2 border-pixel-shadow">
              <span className="text-yellow-400">🪙</span>
              <span className="font-pixel text-yellow-400 text-xs">{coins}</span>
            </div>
          </div>

          {/* Game Canvas */}
          <div className="flex justify-center mb-6">
            <AsteroidsCanvas onGameOver={handleGameOver} />
          </div>

          {/* Controls Info */}
          <PixelCard variant="glass" padding="md" className="max-w-2xl mx-auto mb-6">
            <h3 className="font-pixel text-cyan-400 text-xs mb-3 text-center">CONTROLS</h3>
            <div className="flex flex-wrap justify-center gap-6 font-lcd text-gray-300 text-sm">
              <div className="flex items-center gap-2">
                <span className="bg-pixel-shadow px-3 py-1 border border-gray-600 font-pixel text-xs">← →</span>
                <span>Rotate</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-pixel-shadow px-3 py-1 border border-gray-600 font-pixel text-xs">↑</span>
                <span>Thrust</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-pixel-shadow px-3 py-1 border border-gray-600 font-pixel text-xs">SPACE</span>
                <span>Shoot</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-pixel-shadow px-3 py-1 border border-gray-600 font-pixel text-xs">P</span>
                <span>Pause</span>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="font-lcd text-gray-400 text-xs">
                🎯 Destroy all asteroids to advance! • 💥 Large asteroids break into smaller pieces!
              </p>
            </div>
          </PixelCard>
        </div>
      </div>
    );
  }

  return null;
}

// Shop Modal Component
function ShopModal({
  coins,
  currentTheme,
  unlockedThemes,
  activePowerUps,
  onClose,
  onBuyTheme,
  onBuyPowerUp,
  onSelectTheme,
  getPowerUpCount,
}: {
  coins: number;
  currentTheme: GameTheme;
  unlockedThemes: GameTheme[];
  activePowerUps: PowerUp[];
  onClose: () => void;
  onBuyTheme: (theme: GameTheme, price: number) => void;
  onBuyPowerUp: (powerUp: PowerUp, price: number) => void;
  onSelectTheme: (theme: GameTheme) => void;
  getPowerUpCount: (powerUp: PowerUp) => number;
}) {
  return (
    <div className="fixed inset-0 bg-pixel-black/80 flex items-center justify-center z-50 p-4">
      <PixelCard variant="solid" padding="lg" className="max-w-3xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-pixel text-foamy-green text-lg">GAME SHOP</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 text-xl">🪙</span>
              <span className="font-pixel text-yellow-400">{coins}</span>
            </div>
            <button
              onClick={onClose}
              className="font-pixel text-sunset-orange text-lg hover:text-coral-pink"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Themes Section */}
        <div className="mb-8">
          <h3 className="font-pixel text-ocean-blue text-sm mb-4 flex items-center gap-2">
            <Palette className="w-4 h-4" /> THEMES (Surf Runner)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {THEMES.map((theme) => {
              const isOwned = theme.price === 0 || unlockedThemes.includes(theme.id);
              const isActive = currentTheme === theme.id;

              return (
                <button
                  key={theme.id}
                  onClick={() => {
                    if (isOwned) {
                      onSelectTheme(theme.id);
                    } else {
                      onBuyTheme(theme.id, theme.price);
                    }
                  }}
                  disabled={!isOwned && coins < theme.price}
                  className={`
                    p-4 border-2 transition-all text-center
                    ${isActive 
                      ? 'border-foamy-green bg-foamy-green/20' 
                      : isOwned 
                        ? 'border-pixel-shadow hover:border-ocean-blue'
                        : coins >= theme.price
                          ? 'border-yellow-500 hover:border-yellow-400'
                          : 'border-pixel-shadow opacity-50'
                    }
                  `}
                  style={{ boxShadow: '3px 3px 0px #1a1a1a' }}
                >
                  {/* Color preview */}
                  <div className="flex justify-center gap-1 mb-2">
                    {theme.colors.map((color, i) => (
                      <div 
                        key={i}
                        className="w-5 h-5 border border-pixel-black"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span className="font-pixel text-xs text-pixel-white block mb-1">
                    {theme.name}
                  </span>
                  {isOwned ? (
                    <span className="font-lcd text-foamy-green text-sm">
                      {isActive ? '✓ Active' : 'Owned'}
                    </span>
                  ) : (
                    <span className="font-lcd text-yellow-400 text-sm">
                      🪙 {theme.price}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Power-ups Section */}
        <div>
          <h3 className="font-pixel text-ocean-blue text-sm mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4" /> POWER-UPS
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {POWERUPS.map((powerUp) => {
              const count = getPowerUpCount(powerUp.id);
              const Icon = powerUp.icon;
              const canBuy = coins >= powerUp.price;

              return (
                <div
                  key={powerUp.id}
                  className="p-4 border-2 border-pixel-shadow bg-pixel-shadow/30"
                  style={{ boxShadow: '3px 3px 0px #1a1a1a' }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className="w-6 h-6 text-ocean-blue" />
                    <div>
                      <span className="font-pixel text-xs text-pixel-white block">
                        {powerUp.name}
                      </span>
                      <span className="font-lcd text-gray-400 text-sm">
                        {powerUp.description}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="font-pixel text-xs text-foamy-green">
                      Owned: {count}
                    </span>
                    <PixelButton
                      onClick={() => onBuyPowerUp(powerUp.id, powerUp.price)}
                      disabled={!canBuy}
                      size="sm"
                      variant={canBuy ? 'primary' : 'secondary'}
                    >
                      🪙 {powerUp.price}
                    </PixelButton>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tip */}
        <div className="mt-6 text-center">
          <p className="font-lcd text-gray-400 text-sm">
            Earn coins by playing math challenges or collecting them in games!
          </p>
        </div>
      </PixelCard>
    </div>
  );
}
