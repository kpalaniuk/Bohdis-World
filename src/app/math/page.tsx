'use client';

import { useState } from 'react';
import { PixelCard } from '@/components/ui/PixelCard';
import { GradeSelector } from '@/components/math/GradeSelector';
import { ProblemDisplay } from '@/components/math/ProblemDisplay';
import { CoinShop } from '@/components/math/CoinShop';
import { CoinDisplay } from '@/components/ui/CoinDisplay';
import { GradeLevel } from '@/components/math/ProblemGenerator';

export default function MathPage() {
  const [selectedLevel, setSelectedLevel] = useState<GradeLevel>('easy');
  const [isShopOpen, setIsShopOpen] = useState(false);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 
            className="font-pixel text-foamy-green text-xl md:text-2xl mb-2"
            style={{ textShadow: '3px 3px 0px #2d2d2d' }}
          >
            MATH CHALLENGE
          </h1>
          <p className="font-lcd text-gray-400 text-lg">
            Solve problems, earn coins, unlock rewards!
          </p>
          
          {/* Coin display */}
          <div className="flex justify-center mt-4">
            <CoinDisplay size="lg" showTotal />
          </div>
        </div>

        {/* Grade Selector */}
        <PixelCard variant="glass" padding="md" className="mb-8">
          <h3 className="font-pixel text-ocean-blue text-xs text-center mb-4">
            SELECT DIFFICULTY
          </h3>
          <GradeSelector 
            selected={selectedLevel} 
            onSelect={setSelectedLevel} 
          />
        </PixelCard>

        {/* Problem Display */}
        <PixelCard variant="glass" padding="lg">
          <ProblemDisplay 
            level={selectedLevel} 
            onOpenShop={() => setIsShopOpen(true)}
          />
        </PixelCard>

        {/* Tips */}
        <PixelCard variant="glass" padding="md" className="mt-8">
          <h3 className="font-pixel text-ocean-blue text-xs mb-3">HOW IT WORKS</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-lcd text-gray-300 text-sm">
            <div>
              <p className="text-foamy-green mb-1">✓ Correct Answer</p>
              <p>Earn coins based on difficulty level</p>
            </div>
            <div>
              <p className="text-sunset-orange mb-1">✗ Wrong Answer</p>
              <p>See the solution and try again</p>
            </div>
            <div>
              <p className="text-ocean-blue mb-1">🔥 Streak Bonus</p>
              <p>Get multiple right for celebrations!</p>
            </div>
            <div>
              <p className="text-coral-pink mb-1">🛒 Coin Shop</p>
              <p>Buy themes and power-ups!</p>
            </div>
          </div>
        </PixelCard>
      </div>

      {/* Coin Shop Modal */}
      <CoinShop isOpen={isShopOpen} onClose={() => setIsShopOpen(false)} />
    </div>
  );
}

