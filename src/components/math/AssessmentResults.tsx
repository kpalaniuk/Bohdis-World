'use client';

import { useEffect, useState } from 'react';
import { Trophy, Target, Clock, Zap, RotateCcw, TrendingUp, Award, Star } from 'lucide-react';
import { PixelButton } from '@/components/ui/PixelButton';
import { PixelCard } from '@/components/ui/PixelCard';
import { LEVEL_NAMES } from './AssessmentProblemGenerator';

interface AssessmentResultsProps {
  score: number;
  grade: number;
  questionsAnswered: number;
  correctAnswers: number;
  maxLevel: number;
  averageResponseTime: number;
  coinsEarned: number;
  isNewHighScore: boolean;
  onPlayAgain: () => void;
}

function getGradeLetter(grade: number): string {
  if (grade >= 97) return 'A+';
  if (grade >= 93) return 'A';
  if (grade >= 90) return 'A-';
  if (grade >= 87) return 'B+';
  if (grade >= 83) return 'B';
  if (grade >= 80) return 'B-';
  if (grade >= 77) return 'C+';
  if (grade >= 73) return 'C';
  if (grade >= 70) return 'C-';
  if (grade >= 67) return 'D+';
  if (grade >= 63) return 'D';
  if (grade >= 60) return 'D-';
  return 'F';
}

function getGradeColor(grade: number): string {
  if (grade >= 90) return '#98D8AA'; // Green
  if (grade >= 80) return '#4A90D9'; // Blue
  if (grade >= 70) return '#FFD700'; // Gold
  if (grade >= 60) return '#FF8FAB'; // Pink
  return '#FF6B4A'; // Orange/Red
}

function getGradeMessage(grade: number): string {
  if (grade >= 95) return '🏆 OUTSTANDING! Math genius level!';
  if (grade >= 90) return '⭐ EXCELLENT! You crushed it!';
  if (grade >= 80) return '🔥 GREAT JOB! Keep it up!';
  if (grade >= 70) return '👍 GOOD WORK! Room to grow!';
  if (grade >= 60) return '💪 NICE TRY! Practice makes perfect!';
  return '📚 Keep practicing! You got this!';
}

export function AssessmentResults({
  score,
  grade,
  questionsAnswered,
  correctAnswers,
  maxLevel,
  averageResponseTime,
  coinsEarned,
  isNewHighScore,
  onPlayAgain,
}: AssessmentResultsProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [animatedGrade, setAnimatedGrade] = useState(0);
  const [animatedScore, setAnimatedScore] = useState(0);

  const accuracy = questionsAnswered > 0 
    ? Math.round((correctAnswers / questionsAnswered) * 100) 
    : 0;
  const avgTimeSeconds = (averageResponseTime / 1000).toFixed(1);
  const gradeColor = getGradeColor(grade);
  const gradeLetter = getGradeLetter(grade);

  // Animate grade counting up
  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = grade / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= grade) {
        setAnimatedGrade(grade);
        clearInterval(timer);
      } else {
        setAnimatedGrade(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [grade]);

  // Animate score counting up
  useEffect(() => {
    const duration = 1200;
    const steps = 50;
    const increment = score / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setAnimatedScore(score);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.round(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score]);

  // Show details after grade animation
  useEffect(() => {
    const timer = setTimeout(() => setShowDetails(true), 1000);
    return () => clearTimeout(timer);
  }, []);

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
        {isNewHighScore && (
          <div className="inline-block px-4 py-2 bg-sunset-orange text-white font-pixel text-xs animate-pulse border-4 border-pixel-black">
            🎉 NEW HIGH SCORE!
          </div>
        )}
      </div>

      {/* Main grade display */}
      <PixelCard variant="glass" padding="lg" glow glowColor="green">
        <div className="text-center">
          {/* Grade circle */}
          <div 
            className="relative inline-block w-40 h-40 md:w-48 md:h-48 rounded-full border-8 mb-4"
            style={{ 
              borderColor: gradeColor,
              boxShadow: `0 0 30px ${gradeColor}40, inset 0 0 20px ${gradeColor}20`
            }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div 
                className="font-pixel text-4xl md:text-5xl"
                style={{ color: gradeColor, textShadow: `0 0 10px ${gradeColor}` }}
              >
                {animatedGrade.toFixed(2)}
              </div>
              <div 
                className="font-pixel text-2xl mt-1"
                style={{ color: gradeColor }}
              >
                {gradeLetter}
              </div>
            </div>
          </div>

          {/* Message */}
          <p className="font-lcd text-xl text-white mb-2">
            {getGradeMessage(grade)}
          </p>
          
          {/* Score */}
          <div className="flex items-center justify-center gap-2 text-foamy-green">
            <Zap className="w-5 h-5" />
            <span className="font-pixel text-xl">{animatedScore} pts</span>
          </div>
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
        <PixelCard variant="glass" padding="md" className="text-center slide-up">
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl">🪙</span>
            <div>
              <p className="font-lcd text-gray-400 text-sm">Coins Earned</p>
              <p className="font-pixel text-foamy-green text-xl">+{coinsEarned}</p>
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
          <h3 className="font-pixel text-ocean-blue text-xs mb-2">💡 TIPS</h3>
          <div className="font-lcd text-gray-400 text-sm space-y-1">
            {accuracy < 70 && (
              <p>• Focus on accuracy over speed - correct answers are worth more!</p>
            )}
            {averageResponseTime > 8000 && (
              <p>• Try to answer faster - speed bonuses can double your points!</p>
            )}
            {maxLevel < 5 && (
              <p>• Practice at your current level to build confidence before leveling up.</p>
            )}
            {grade >= 90 && (
              <p>• Amazing work! Try starting at a higher level for an extra challenge.</p>
            )}
            {accuracy >= 80 && averageResponseTime < 5000 && (
              <p>• Great speed and accuracy! You're on fire! 🔥</p>
            )}
          </div>
        </PixelCard>
      )}
    </div>
  );
}

export default AssessmentResults;

