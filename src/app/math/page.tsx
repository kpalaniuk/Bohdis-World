'use client';

import { useState } from 'react';
import { PixelCard } from '@/components/ui/PixelCard';
import { GradeSelector } from '@/components/math/GradeSelector';
import { ProblemDisplay } from '@/components/math/ProblemDisplay';
import { CoinShop } from '@/components/math/CoinShop';
import { CoinDisplay } from '@/components/ui/CoinDisplay';
import { MathAssessment } from '@/components/math/MathAssessment';
import { GradeLevel } from '@/components/math/ProblemGenerator';
import { BookOpen, Timer, PenTool, Globe } from 'lucide-react';
import { WordProblemCreator } from '@/components/math/WordProblemCreator';
import { WordProblemForum } from '@/components/math/WordProblemForum';

type MathMode = 'practice' | 'assessment' | 'word-problems' | 'word-problems-forum';

export default function MathPage() {
  const [selectedLevel, setSelectedLevel] = useState<GradeLevel>('easy');
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [mode, setMode] = useState<MathMode>('practice');

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className={`${mode === 'word-problems-forum' ? 'max-w-6xl' : 'max-w-3xl'} mx-auto`}>
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
                transition-all border-r-4 border-pixel-black
                ${mode === 'assessment' 
                  ? 'bg-ocean-blue text-white' 
                  : 'bg-transparent text-gray-400 hover:text-white'
                }
              `}
            >
              <Timer size={16} />
              ASSESSMENT
            </button>
            <button
              onClick={() => setMode('word-problems')}
              className={`
                flex items-center gap-2 px-4 py-3 font-pixel text-xs
                transition-all
                ${mode === 'word-problems' || mode === 'word-problems-forum'
                  ? 'bg-coral-pink text-white' 
                  : 'bg-transparent text-gray-400 hover:text-white'
                }
              `}
            >
              <PenTool size={16} />
              WORD PROBLEMS
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
        ) : mode === 'assessment' ? (
          /* Assessment Mode */
          <PixelCard variant="glass" padding="lg">
            <MathAssessment />
          </PixelCard>
        ) : (
          <>
            {/* Word Problems Sub-mode Toggle */}
            {(mode === 'word-problems' || mode === 'word-problems-forum') && (
              <div className="flex justify-center mb-4">
                <div 
                  className="inline-flex border-4 border-pixel-black bg-pixel-shadow"
                  style={{ boxShadow: '4px 4px 0px #1a1a1a' }}
                >
                  <button
                    onClick={() => setMode('word-problems')}
                    className={`
                      flex items-center gap-2 px-4 py-2 font-pixel text-xs
                      transition-all border-r-4 border-pixel-black
                      ${mode === 'word-problems'
                        ? 'bg-coral-pink text-white' 
                        : 'bg-transparent text-gray-400 hover:text-white'
                      }
                    `}
                  >
                    <PenTool size={14} />
                    CREATE
                  </button>
                  <button
                    onClick={() => setMode('word-problems-forum')}
                    className={`
                      flex items-center gap-2 px-4 py-2 font-pixel text-xs
                      transition-all
                      ${mode === 'word-problems-forum'
                        ? 'bg-coral-pink text-white' 
                        : 'bg-transparent text-gray-400 hover:text-white'
                      }
                    `}
                  >
                    <Globe size={14} />
                    FORUM
                  </button>
                </div>
              </div>
            )}

            {mode === 'word-problems' ? (
              /* Word Problems Create Mode */
              <PixelCard variant="glass" padding="lg">
                <WordProblemCreator />
              </PixelCard>
            ) : mode === 'word-problems-forum' ? (
              /* Word Problems Forum Mode */
              <WordProblemForum />
            ) : null}
          </>
        )}

        {/* Info cards */}
        {mode === 'practice' && (
          <>
            <PixelCard variant="glass" padding="md" className="mt-4">
              <div className="flex items-start gap-4">
                <Timer className="w-8 h-8 text-ocean-blue flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-pixel text-ocean-blue text-xs mb-2">
                    📐 FIND YOUR MATH GRADE LEVEL!
                  </h3>
                  <p className="font-lcd text-gray-400 text-sm">
                    Take an adaptive assessment that finds your true math level! 
                    Start with 90 seconds, earn extra time for correct answers, 
                    and get placed from 1st grade to 10th grade+. All multiple choice!
                  </p>
                  <button
                    onClick={() => setMode('assessment')}
                    className="mt-3 font-pixel text-xs text-ocean-blue hover:text-foamy-green transition-colors"
                  >
                    → TAKE ASSESSMENT
                  </button>
                </div>
              </div>
            </PixelCard>
            <PixelCard variant="glass" padding="md" className="mt-4">
              <div className="flex items-start gap-4">
                <PenTool className="w-8 h-8 text-coral-pink flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-pixel text-coral-pink text-xs mb-2">
                    📝 CREATE YOUR OWN WORD PROBLEMS!
                  </h3>
                  <p className="font-lcd text-gray-400 text-sm">
                    Make word problems in Mad Libs style! Fill in names, nouns, and adjectives, 
                    and we'll generate the numbers. Share them on the forum for others to solve!
                  </p>
                  <button
                    onClick={() => setMode('word-problems')}
                    className="mt-3 font-pixel text-xs text-coral-pink hover:text-foamy-green transition-colors"
                  >
                    → CREATE WORD PROBLEMS
                  </button>
                </div>
              </div>
            </PixelCard>
          </>
        )}
      </div>

      {/* Coin Shop Modal */}
      <CoinShop isOpen={isShopOpen} onClose={() => setIsShopOpen(false)} />
    </div>
  );
}
