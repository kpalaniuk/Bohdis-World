'use client';

import { useEffect, useState } from 'react';
import { Trophy, Target, Clock, RotateCcw, TrendingUp, Award, Star, GraduationCap } from 'lucide-react';
import { PixelButton } from '@/components/ui/PixelButton';
import { PixelCard } from '@/components/ui/PixelCard';
import { LEVEL_NAMES, LEVEL_DESCRIPTIONS } from './AssessmentProblemGenerator';

interface AssessmentResultsProps {
  gradeLevel: number; // e.g., 3.45 = high 3rd grade level
  questionsAnswered: number;
  correctAnswers: number;
  maxLevel: number;
  averageResponseTime: number;
  coinsEarned: number;
  streakBonus?: number;
  currentStreak?: number;
  isNewBest: boolean;
  onPlayAgain: () => void;
}

function getGradeLevelLabel(gradeLevel: number): string {
  const wholeGrade = Math.floor(gradeLevel);
  const decimal = gradeLevel - wholeGrade;
  
  if (decimal < 0.25) return `Early ${LEVEL_NAMES[wholeGrade]}`;
  if (decimal < 0.5) return `Mid ${LEVEL_NAMES[wholeGrade]}`;
  if (decimal < 0.75) return `Late ${LEVEL_NAMES[wholeGrade]}`;
  return `Advanced ${LEVEL_NAMES[wholeGrade]}`;
}

function getGradeLevelColor(gradeLevel: number): string {
  if (gradeLevel >= 9) return '#FF00FF'; // Magenta for advanced
  if (gradeLevel >= 7) return '#FF6B4A'; // Orange for high
  if (gradeLevel >= 5) return '#FFD700'; // Gold for middle
  if (gradeLevel >= 3) return '#4A90D9'; // Blue for early
  return '#98D8AA'; // Green for beginning
}

function getGradeLevelMessage(gradeLevel: number): string {
  if (gradeLevel >= 9) return '🏆 OUTSTANDING! High school math master!';
  if (gradeLevel >= 7) return '⭐ EXCELLENT! Advanced middle school level!';
  if (gradeLevel >= 5) return '🔥 GREAT! Solid 5th-6th grade skills!';
  if (gradeLevel >= 3) return '👍 GOOD! Building strong foundations!';
  if (gradeLevel >= 2) return '📚 Nice work! Keep practicing!';
  return '🌟 Great start! You\'re learning!';
}

export function AssessmentResults({
  gradeLevel,
  questionsAnswered,
  correctAnswers,
  maxLevel,
  averageResponseTime,
  coinsEarned,
  streakBonus = 0,
  currentStreak = 0,
  isNewBest,
  onPlayAgain,
}: AssessmentResultsProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [animatedGrade, setAnimatedGrade] = useState(1.0);

  const accuracy = questionsAnswered > 0 
    ? Math.round((correctAnswers / questionsAnswered) * 100) 
    : 0;
  const avgTimeSeconds = (averageResponseTime / 1000).toFixed(1);
  const gradeColor = getGradeLevelColor(gradeLevel);
  const gradeLevelLabel = getGradeLevelLabel(gradeLevel);

  // Animate grade level counting up
  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = (gradeLevel - 1) / steps;
    let current = 1;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= gradeLevel) {
        setAnimatedGrade(gradeLevel);
        clearInterval(timer);
      } else {
        setAnimatedGrade(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [gradeLevel]);

  // Show details after grade animation
  useEffect(() => {
    const timer = setTimeout(() => setShowDetails(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const wholeGrade = Math.floor(gradeLevel);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 
          className="font-pixel text-foamy-green text-lg md:text-xl mb-2"
          style={{ textShadow: '2px 2px 0px #2d2d2d' }}
        >
          📊 ASSESSMENT COMPLETE
        </h2>
        {isNewBest && (
          <div className="inline-block px-4 py-2 bg-sunset-orange text-white font-pixel text-xs animate-pulse border-4 border-pixel-black">
            🎉 NEW PERSONAL BEST!
          </div>
        )}
      </div>

      {/* Main grade level display */}
      <PixelCard variant="glass" padding="lg" glow glowColor="green">
        <div className="text-center">
          {/* Grade level circle */}
          <div 
            className="relative inline-block w-44 h-44 md:w-52 md:h-52 rounded-full border-8 mb-4"
            style={{ 
              borderColor: gradeColor,
              boxShadow: `0 0 30px ${gradeColor}40, inset 0 0 20px ${gradeColor}20`
            }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <GraduationCap 
                className="w-8 h-8 mb-1" 
                style={{ color: gradeColor }} 
              />
              <div 
                className="font-pixel text-4xl md:text-5xl"
                style={{ color: gradeColor, textShadow: `0 0 10px ${gradeColor}` }}
              >
                {animatedGrade.toFixed(2)}
              </div>
              <div 
                className="font-lcd text-sm mt-1 px-2 text-center"
                style={{ color: gradeColor }}
              >
                {LEVEL_NAMES[wholeGrade]}
              </div>
            </div>
          </div>

          {/* Level description */}
          <p 
            className="font-pixel text-sm mb-2"
            style={{ color: gradeColor }}
          >
            {gradeLevelLabel}
          </p>

          {/* Message */}
          <p className="font-lcd text-lg text-white mb-2">
            {getGradeLevelMessage(gradeLevel)}
          </p>
          
          {/* Skill description */}
          <p className="font-lcd text-gray-400 text-sm">
            Current Skills: {LEVEL_DESCRIPTIONS[wholeGrade]}
          </p>
        </div>
      </PixelCard>

      {/* Stats grid */}
      {showDetails && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 slide-up">
          <PixelCard variant="glass" padding="sm" className="text-center">
            <Target className="w-5 h-5 mx-auto mb-1 text-ocean-blue" />
            <p className="font-lcd text-gray-400 text-xs">Accuracy</p>
            <p className="font-pixel text-ocean-blue text-lg">{accuracy}%</p>
          </PixelCard>
          
          <PixelCard variant="glass" padding="sm" className="text-center">
            <Award className="w-5 h-5 mx-auto mb-1 text-foamy-green" />
            <p className="font-lcd text-gray-400 text-xs">Answered</p>
            <p className="font-pixel text-foamy-green text-lg">
              {correctAnswers}/{questionsAnswered}
            </p>
          </PixelCard>
          
          <PixelCard variant="glass" padding="sm" className="text-center">
            <Clock className="w-5 h-5 mx-auto mb-1 text-sunset-orange" />
            <p className="font-lcd text-gray-400 text-xs">Avg Time</p>
            <p className="font-pixel text-sunset-orange text-lg">{avgTimeSeconds}s</p>
          </PixelCard>
          
          <PixelCard variant="glass" padding="sm" className="text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-coral-pink" />
            <p className="font-lcd text-gray-400 text-xs">Max Level</p>
            <p className="font-pixel text-coral-pink text-lg">{maxLevel}</p>
          </PixelCard>
        </div>
      )}

      {/* Level reached */}
      {showDetails && (
        <PixelCard variant="glass" padding="md" className="slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-lcd text-gray-400 text-sm">Highest Level Reached</p>
              <p className="font-pixel text-white text-lg">{LEVEL_NAMES[maxLevel]}</p>
              <p className="font-lcd text-gray-500 text-xs">{LEVEL_DESCRIPTIONS[maxLevel]}</p>
            </div>
            <div className="flex">
              {Array.from({ length: maxLevel }, (_, i) => (
                <Star 
                  key={i} 
                  className="w-4 h-4 text-foamy-green fill-foamy-green" 
                />
              ))}
              {Array.from({ length: 10 - maxLevel }, (_, i) => (
                <Star 
                  key={i + maxLevel} 
                  className="w-4 h-4 text-gray-600" 
                />
              ))}
            </div>
          </div>
        </PixelCard>
      )}

      {/* Coins earned */}
      {showDetails && coinsEarned > 0 && (
        <PixelCard variant="glass" padding="md" className="slide-up">
          <h3 className="font-pixel text-foamy-green text-xs mb-3 text-center">🪙 COINS EARNED</h3>
          <div className="space-y-2">
            <div className="flex justify-between font-lcd text-gray-400 text-sm">
              <span>Correct answers</span>
              <span className="text-foamy-green">+{correctAnswers}</span>
            </div>
            <div className="flex justify-between font-lcd text-gray-400 text-sm">
              <span>Level bonus</span>
              <span className="text-foamy-green">+{Math.floor(gradeLevel)}</span>
            </div>
            {questionsAnswered > 0 && correctAnswers / questionsAnswered >= 0.8 && (
              <div className="flex justify-between font-lcd text-gray-400 text-sm">
                <span>Accuracy bonus (80%+)</span>
                <span className="text-foamy-green">+5</span>
              </div>
            )}
            {streakBonus > 0 && (
              <div className="flex justify-between font-lcd text-gray-400 text-sm">
                <span>🔥 Daily streak ({currentStreak} days)</span>
                <span className="text-sunset-orange">+{streakBonus}</span>
              </div>
            )}
            <div className="border-t border-pixel-shadow pt-2 flex justify-between font-pixel">
              <span className="text-white">Total</span>
              <span className="text-foamy-green text-lg">+{coinsEarned}🪙</span>
            </div>
          </div>
        </PixelCard>
      )}

      {/* Actions */}
      {showDetails && (
        <div className="flex justify-center gap-4 slide-up">
          <PixelButton
            variant="success"
            size="lg"
            icon={RotateCcw}
            onClick={onPlayAgain}
          >
            PLAY AGAIN
          </PixelButton>
        </div>
      )}

      {/* Tips based on performance */}
      {showDetails && (
        <PixelCard variant="glass" padding="md" className="slide-up">
          <h3 className="font-pixel text-ocean-blue text-xs mb-2">💡 TIPS TO IMPROVE</h3>
          <div className="font-lcd text-gray-400 text-sm space-y-1">
            {accuracy < 70 && (
              <p>• Take your time - accuracy matters more than speed for grade placement!</p>
            )}
            {averageResponseTime > 8000 && (
              <p>• Practice more to build speed and confidence!</p>
            )}
            {gradeLevel < 3 && (
              <p>• Practice addition and subtraction basics to build a strong foundation.</p>
            )}
            {gradeLevel >= 3 && gradeLevel < 5 && (
              <p>• Work on multiplication tables - they're key to advancing!</p>
            )}
            {gradeLevel >= 5 && gradeLevel < 7 && (
              <p>• Great progress! Focus on algebra concepts to reach the next level.</p>
            )}
            {gradeLevel >= 7 && (
              <p>• Excellent skills! Keep challenging yourself with advanced topics.</p>
            )}
            {accuracy >= 80 && averageResponseTime < 5000 && (
              <p>• Great speed and accuracy! You're on fire! 🔥</p>
            )}
          </div>
        </PixelCard>
      )}

      {/* Grade scale reference */}
      {showDetails && (
        <PixelCard variant="glass" padding="md" className="slide-up">
          <h3 className="font-pixel text-ocean-blue text-xs mb-3">📊 GRADE SCALE</h3>
          <div className="grid grid-cols-5 gap-1 text-center">
            {[1, 3, 5, 7, 9].map(level => (
              <div 
                key={level}
                className={`p-2 border-2 border-pixel-black ${wholeGrade >= level ? 'opacity-100' : 'opacity-40'}`}
                style={{ 
                  backgroundColor: wholeGrade >= level ? getGradeLevelColor(level) + '40' : 'transparent',
                }}
              >
                <p className="font-pixel text-xs" style={{ color: getGradeLevelColor(level) }}>
                  {level}-{level + 1}
                </p>
                <p className="font-lcd text-gray-400 text-xs">
                  {level <= 2 ? 'K-2' : level <= 4 ? '3-5' : level <= 6 ? '6-7' : level <= 8 ? '8-9' : '10+'}
                </p>
              </div>
            ))}
          </div>
          <p className="font-lcd text-gray-500 text-xs text-center mt-2">
            Your level: {gradeLevel.toFixed(2)} ({gradeLevelLabel})
          </p>
        </PixelCard>
      )}
    </div>
  );
}

export default AssessmentResults;
