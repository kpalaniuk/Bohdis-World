'use client';

import { useState } from 'react';
import { PixelCard } from '@/components/ui/PixelCard';
import { GradeSelector } from '@/components/math/GradeSelector';
import { ProblemDisplay } from '@/components/math/ProblemDisplay';
import { CoinShop } from '@/components/math/CoinShop';
import { CoinDisplay } from '@/components/ui/CoinDisplay';
import { MathAssessment } from '@/components/math/MathAssessment';
import { GradeLevel } from '@/components/math/ProblemGenerator';
import { BookOpen, Timer } from 'lucide-react';

type MathMode = 'practice' | 'assessment';

export default function MathPage() {
  const [selectedLevel, setSelectedLevel] = useState<GradeLevel>('easy');
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [mode, setMode] = useState<MathMode>('practice');

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
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

        {/* Mode Toggle */}
        <div className="flex justify-center mb-6">
          <div 
            className="inline-flex border-4 border-pixel-black bg-pixel-shadow"
            style={{ boxShadow: '4px 4px 0px #1a1a1a' }}
          >
            <button
              onClick={() => setMode('practice')}
              className={`
                flex items-center gap-2 px-4 py-3 font-pixel text-xs
                transition-all border-r-4 border-pixel-black
                ${mode === 'practice' 
                  ? 'bg-foamy-green text-pixel-black' 
                  : 'bg-transparent text-gray-400 hover:text-white'
                }
              `}
            >
              <BookOpen size={16} />
              PRACTICE
            </button>
            <button
              onClick={() => setMode('assessment')}
              className={`
                flex items-center gap-2 px-4 py-3 font-pixel text-xs
                transition-all
                ${mode === 'assessment' 
                  ? 'bg-ocean-blue text-white' 
                  : 'bg-transparent text-gray-400 hover:text-white'
                }
              `}
            >
              <Timer size={16} />
              ASSESSMENT
            </button>
          </div>
        </div>

        {mode === 'practice' ? (
          <>
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
          </>
        ) : (
          /* Assessment Mode */
          <PixelCard variant="glass" padding="lg">
            <MathAssessment />
          </PixelCard>
        )}

        {/* Assessment mode info card */}
        {mode === 'practice' && (
          <PixelCard variant="glass" padding="md" className="mt-4">
            <div className="flex items-start gap-4">
              <Timer className="w-8 h-8 text-ocean-blue flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-pixel text-ocean-blue text-xs mb-2">
                  TRY TIMED ASSESSMENT MODE!
                </h3>
                <p className="font-lcd text-gray-400 text-sm">
                  Take a 60-second challenge with progressive difficulty! 
                  Answer fast for bonus points, level up with streaks, 
                  and get a grade score at the end. Your starting level is saved!
                </p>
                <button
                  onClick={() => setMode('assessment')}
                  className="mt-3 font-pixel text-xs text-ocean-blue hover:text-foamy-green transition-colors"
                >
                  → TRY IT NOW
                </button>
              </div>
            </div>
          </PixelCard>
        )}
      </div>

      {/* Coin Shop Modal */}
      <CoinShop isOpen={isShopOpen} onClose={() => setIsShopOpen(false)} />
    </div>
  );
}
