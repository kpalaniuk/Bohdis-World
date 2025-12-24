'use client';

import { PixelCard } from '@/components/ui/PixelCard';
import { X, Space, MousePointer, Zap, Shield, Timer, Trophy, Coins, Heart } from 'lucide-react';

interface GameInstructionsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GameInstructions({ isOpen, onClose }: GameInstructionsProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-pixel-black/90 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <PixelCard 
        variant="default" 
        padding="lg" 
        className="max-w-3xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-pixel text-foamy-green text-lg">HOW TO PLAY</h2>
          <button
            onClick={onClose}
            className="font-pixel text-sunset-orange text-xl hover:text-coral-pink transition-colors"
            aria-label="Close instructions"
          >
            ✕
          </button>
        </div>

        {/* Instructions Content */}
        <div className="space-y-6 font-lcd text-gray-300">
          {/* Objective */}
          <section>
            <h3 className="font-pixel text-ocean-blue text-sm mb-3">OBJECTIVE</h3>
            <p className="text-sm leading-relaxed">
              Ride the waves and dodge obstacles! Survive as long as you can to earn coins and beat your high score.
            </p>
          </section>

          {/* Controls */}
          <section>
            <h3 className="font-pixel text-ocean-blue text-sm mb-3 flex items-center gap-2">
              <Space className="w-4 h-4" /> CONTROLS
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-3">
                <span className="bg-pixel-shadow px-3 py-1 border border-gray-600 font-pixel text-xs whitespace-nowrap">SPACE</span>
                <span>Jump over obstacles / Start game</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-pixel-shadow px-3 py-1 border border-gray-600 font-pixel text-xs whitespace-nowrap">P</span>
                <span>Pause / Resume game</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-pixel-shadow px-3 py-1 border border-gray-600 font-pixel text-xs whitespace-nowrap">R</span>
                <span>Retry after game over</span>
              </div>
              <div className="flex items-start gap-3">
                <MousePointer className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Click or tap the screen to jump (mobile)</span>
              </div>
            </div>
          </section>

          {/* Gameplay */}
          <section>
            <h3 className="font-pixel text-ocean-blue text-sm mb-3">GAMEPLAY</h3>
            <ul className="space-y-2 text-sm list-none">
              <li className="flex items-start gap-2">
                <span className="text-foamy-green font-pixel">•</span>
                <span>Obstacles spawn randomly: <strong className="text-foamy-green">rocks</strong>, <strong className="text-foamy-green">seaweed</strong>, and <strong className="text-foamy-green">crabs</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-foamy-green font-pixel">•</span>
                <span>You have <strong className="text-sunset-orange">3 lives</strong> - lose them all and it's game over!</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-foamy-green font-pixel">•</span>
                <span>The game speeds up as you progress - stay focused!</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-foamy-green font-pixel">•</span>
                <span>Earn <strong className="text-yellow-400">1 coin</strong> every 100 meters traveled</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-foamy-green font-pixel">•</span>
                <span>Your score is measured in meters - see how far you can surf!</span>
              </li>
            </ul>
          </section>

          {/* Power-ups */}
          <section>
            <h3 className="font-pixel text-ocean-blue text-sm mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" /> POWER-UPS
            </h3>
            <div className="space-y-3 text-sm">
              <div className="border-l-4 border-foamy-green pl-3">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <strong className="text-foamy-green">Double Jump</strong>
                  <span className="text-gray-400 text-xs">(25 coins)</span>
                </div>
                <p className="text-gray-400">Jump again while in mid-air! Perfect for tricky obstacle patterns.</p>
              </div>
              <div className="border-l-4 border-ocean-blue pl-3">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-ocean-blue" />
                  <strong className="text-ocean-blue">Shield</strong>
                  <span className="text-gray-400 text-xs">(30 coins)</span>
                </div>
                <p className="text-gray-400">Block one collision automatically. Great for emergency saves!</p>
              </div>
              <div className="border-l-4 border-coral-pink pl-3">
                <div className="flex items-center gap-2 mb-1">
                  <Timer className="w-4 h-4 text-coral-pink" />
                  <strong className="text-coral-pink">Slow Motion</strong>
                  <span className="text-gray-400 text-xs">(35 coins)</span>
                </div>
                <p className="text-gray-400">Slow down time for 5 seconds. Makes dodging obstacles much easier!</p>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                💡 <strong>Tip:</strong> Power-ups are consumed when used. Buy them from the shop and activate them during gameplay!
              </p>
            </div>
          </section>

          {/* Themes */}
          <section>
            <h3 className="font-pixel text-ocean-blue text-sm mb-3">THEMES</h3>
            <p className="text-sm text-gray-400 mb-2">
              Unlock new visual themes to change the look of your game! Each theme has unique colors and atmosphere.
            </p>
            <ul className="space-y-1 text-sm text-gray-400">
              <li>• <strong className="text-foamy-green">Beach Day</strong> - Free starter theme</li>
              <li>• <strong className="text-sunset-orange">Sunset Surf</strong> - 50 coins</li>
              <li>• <strong className="text-ocean-blue">Night Waves</strong> - 75 coins</li>
              <li>• <strong className="text-yellow-400">Tropical Paradise</strong> - 100 coins</li>
            </ul>
          </section>

          {/* Scoring */}
          <section>
            <h3 className="font-pixel text-ocean-blue text-sm mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4" /> SCORING
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span>Earn <strong className="text-yellow-400">1 coin</strong> every 100 meters</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span>Your <strong className="text-yellow-400">high score</strong> is saved automatically</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-sunset-orange" />
                <span>Start with <strong className="text-sunset-orange">3 lives</strong> - use them wisely!</span>
              </div>
            </div>
          </section>

          {/* Tips */}
          <section>
            <h3 className="font-pixel text-ocean-blue text-sm mb-3">PRO TIPS</h3>
            <ul className="space-y-2 text-sm list-none">
              <li className="flex items-start gap-2">
                <span className="text-foamy-green font-pixel">💡</span>
                <span>Time your jumps carefully - don't jump too early or too late!</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-foamy-green font-pixel">💡</span>
                <span>Save your power-ups for when you really need them - they're valuable!</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-foamy-green font-pixel">💡</span>
                <span>Practice makes perfect - the more you play, the better you'll get!</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-foamy-green font-pixel">💡</span>
                <span>Earn coins in Math Challenge to buy power-ups and themes faster!</span>
              </li>
            </ul>
          </section>

          {/* Footer */}
          <div className="pt-4 border-t border-pixel-shadow text-center">
            <p className="text-xs text-gray-500">
              Have fun surfing! 🏄‍♂️
            </p>
          </div>
        </div>
      </PixelCard>
    </div>
  );
}

export default GameInstructions;

