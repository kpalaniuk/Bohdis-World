'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { Lightbulb, RefreshCw, Check, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Problem, GradeLevel, GRADE_CONFIG, generateProblem, checkAnswer } from './ProblemGenerator';
import { PixelButton } from '@/components/ui/PixelButton';
import { useCoinStore } from '@/stores/coinStore';
import { saveUserProgress, saveMathAttempt } from '@/lib/syncProgress';

interface ProblemDisplayProps {
  level: GradeLevel;
  onOpenShop: () => void;
}

export function ProblemDisplay({ level, onOpenShop }: ProblemDisplayProps) {
  const { user, isSignedIn } = useUser();
  const { coins, totalEarned, addCoins } = useCoinStore();
  
  const [problem, setProblem] = useState<Problem | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [streak, setStreak] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const resultTimeoutRef = useRef<NodeJS.Timeout>();

  const config = GRADE_CONFIG[level];

  // Generate initial problem
  useEffect(() => {
    generateNewProblem();
  }, [level]);

  // Focus input when problem changes
  useEffect(() => {
    if (problem && inputRef.current) {
      inputRef.current.focus();
    }
  }, [problem]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (resultTimeoutRef.current) {
        clearTimeout(resultTimeoutRef.current);
      }
    };
  }, []);

  const generateNewProblem = () => {
    setProblem(generateProblem(level));
    setUserAnswer('');
    setShowHint(false);
    setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!problem || !userAnswer.trim()) return;

    const isCorrect = checkAnswer(userAnswer, problem.answer);
    setResult(isCorrect ? 'correct' : 'wrong');
    setTotalAttempts(prev => prev + 1);

    if (isCorrect) {
      setTotalCorrect(prev => prev + 1);
      setStreak(prev => prev + 1);
      
      // Add coins
      addCoins(config.coins);

      // Celebration effects
      if (streak >= 2) {
        confetti({
          particleCount: 50 + streak * 10,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#98D8AA', '#4A90D9', '#FFD700'],
        });
      }

      // Milestone celebrations
      if (totalCorrect + 1 === 10 || totalCorrect + 1 === 50 || totalCorrect + 1 === 100) {
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.6 },
        });
      }

      // Save to cloud
      if (isSignedIn && user?.id) {
        saveUserProgress(user.id, { coins, totalEarned: totalEarned + config.coins });
        saveMathAttempt(user.id, level, problem.question, userAnswer, problem.displayAnswer, true, config.coins);
      }
    } else {
      setStreak(0);
      
      // Save failed attempt
      if (isSignedIn && user?.id) {
        saveMathAttempt(user.id, level, problem.question, userAnswer, problem.displayAnswer, false, 0);
      }
    }

    // Auto-advance after showing result
    resultTimeoutRef.current = setTimeout(() => {
      if (isCorrect) {
        generateNewProblem();
      }
    }, isCorrect ? 1500 : 3000);
  };

  const handleSkip = () => {
    setStreak(0);
    generateNewProblem();
  };

  if (!problem) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="font-pixel text-foamy-green animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-pixel-shadow px-3 py-1 border-2 border-pixel-black">
            <span className="font-lcd text-gray-400 text-sm">Streak: </span>
            <span className="font-pixel text-foamy-green">{streak}</span>
            {streak >= 3 && <span className="ml-1">🔥</span>}
          </div>
          <div className="bg-pixel-shadow px-3 py-1 border-2 border-pixel-black">
            <span className="font-lcd text-gray-400 text-sm">Score: </span>
            <span className="font-pixel text-ocean-blue">{totalCorrect}/{totalAttempts}</span>
          </div>
        </div>
        
        <PixelButton variant="ghost" size="sm" onClick={onOpenShop}>
          🛒 Shop
        </PixelButton>
      </div>

      {/* Problem card */}
      <div 
        className={`
          relative
          bg-pixel-black/90 border-4 p-6 md:p-8
          transition-all duration-300
          ${result === 'correct' ? 'border-foamy-green flash-green' : ''}
          ${result === 'wrong' ? 'border-sunset-orange shake' : ''}
          ${!result ? 'border-pixel-shadow' : ''}
        `}
        style={{ boxShadow: '6px 6px 0px #2d2d2d' }}
      >
        {/* Problem type badge */}
        <div 
          className="absolute -top-3 left-4 px-3 py-1 font-pixel text-xs border-2 border-pixel-black"
          style={{ backgroundColor: config.color, color: '#1a1a1a' }}
        >
          {problem.type.toUpperCase()}
        </div>

        {/* Question */}
        <div className="text-center my-8">
          <p 
            className="font-lcd text-3xl md:text-4xl text-white leading-relaxed"
            style={{ textShadow: '2px 2px 0px #2d2d2d' }}
          >
            {problem.question}
          </p>
        </div>

        {/* Answer input */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Your answer..."
              disabled={result !== null}
              className={`
                w-full sm:w-48
                px-4 py-3
                font-lcd text-2xl text-center
                bg-pixel-black border-4 border-pixel-shadow
                text-white
                focus:border-foamy-green focus:outline-none
                disabled:opacity-50
                ${result === 'correct' ? 'border-foamy-green bg-foamy-green/10' : ''}
                ${result === 'wrong' ? 'border-sunset-orange bg-sunset-orange/10' : ''}
              `}
            />
            
            <PixelButton
              type="submit"
              variant={result === 'correct' ? 'success' : 'primary'}
              size="lg"
              disabled={!userAnswer.trim() || result !== null}
            >
              {result === 'correct' ? <Check size={20} /> : 'Check'}
            </PixelButton>
          </div>
        </form>

        {/* Result feedback */}
        {result === 'correct' && (
          <div className="text-center mt-6 slide-up">
            <p className="font-pixel text-foamy-green text-lg">CORRECT!</p>
            <p className="font-lcd text-foamy-green text-xl">+{config.coins} coins 🪙</p>
          </div>
        )}

        {result === 'wrong' && (
          <div className="text-center mt-6 slide-up">
            <p className="font-pixel text-sunset-orange text-lg">NOT QUITE!</p>
            <p className="font-lcd text-gray-300 text-xl mt-2">
              Answer: <span className="text-foamy-green">{problem.displayAnswer}</span>
            </p>
            <PixelButton 
              variant="secondary" 
              size="sm" 
              onClick={generateNewProblem}
              className="mt-4"
            >
              Try Another
            </PixelButton>
          </div>
        )}

        {/* Hint section */}
        {!result && problem.hint && (
          <div className="mt-6 text-center">
            {showHint ? (
              <div className="bg-pixel-shadow/50 p-3 border-2 border-ocean-blue inline-block">
                <p className="font-lcd text-ocean-blue">
                  💡 {problem.hint}
                </p>
              </div>
            ) : (
              <button
                onClick={() => setShowHint(true)}
                className="text-ocean-blue font-lcd hover:text-foamy-green transition-colors flex items-center gap-2 mx-auto"
              >
                <Lightbulb size={16} />
                Need a hint?
              </button>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!result && (
        <div className="flex justify-center gap-4">
          <PixelButton
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={handleSkip}
          >
            Skip
          </PixelButton>
        </div>
      )}

      {/* Keyboard hint */}
      <p className="text-center font-lcd text-gray-500 text-sm">
        Press Enter to submit your answer
      </p>
    </div>
  );
}

export default ProblemDisplay;

