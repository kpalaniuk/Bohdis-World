'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Lightbulb, RefreshCw, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Problem, GradeLevel, GRADE_CONFIG, generateProblem, checkAnswer } from './ProblemGenerator';
import { PixelButton } from '@/components/ui/PixelButton';
import { useCoinStore } from '@/stores/coinStore';
import { saveUserProgress, saveMathAttempt, createAuthUserId } from '@/lib/syncProgress';
import { useAuth } from '@/contexts/AuthContext';

interface ProblemDisplayProps {
  level: GradeLevel;
  onOpenShop: () => void;
}

// Generate multiple choice options for a problem
function generateChoices(correctAnswer: number | string): { choices: string[]; correctIndex: number } {
  const correct = typeof correctAnswer === 'string' ? parseFloat(correctAnswer) : correctAnswer;
  
  if (isNaN(correct)) {
    // For non-numeric answers (like trig values), return simple wrong answers
    const wrongs = ['1', '0', '-1', '2'].filter(w => w !== String(correctAnswer));
    const allChoices = [String(correctAnswer), ...wrongs.slice(0, 3)];
    const shuffled = shuffleArray(allChoices);
    return {
      choices: shuffled,
      correctIndex: shuffled.indexOf(String(correctAnswer)),
    };
  }

  // Generate plausible wrong answers
  const wrongs: Set<number> = new Set();
  
  // Common mistake patterns
  const offsets = [1, -1, 2, -2, 5, -5, 10, -10];
  for (const offset of offsets) {
    const wrong = correct + offset;
    if (wrong !== correct && wrong >= 0) {
      wrongs.add(wrong);
    }
    if (wrongs.size >= 5) break;
  }
  
  // Fill with random offsets if needed
  while (wrongs.size < 3) {
    const offset = Math.floor(Math.random() * 10) + 1;
    const wrong = correct + (Math.random() > 0.5 ? offset : -offset);
    if (wrong !== correct && wrong >= 0) {
      wrongs.add(Math.round(wrong));
    }
  }
  
  const wrongArray = Array.from(wrongs).slice(0, 3);
  const allChoices = shuffleArray([correct, ...wrongArray]);
  
  return {
    choices: allChoices.map(String),
    correctIndex: allChoices.indexOf(correct),
  };
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Teaching explanations based on problem type
function getTeachingExplanation(problem: Problem, correctAnswer: string): string {
  const type = problem.type.toLowerCase();
  
  switch (type) {
    case 'addition':
      return `To add numbers, combine them together. ${problem.question.replace(' = ?', '')} equals ${correctAnswer}. Try counting up from the larger number!`;
    case 'subtraction':
      return `To subtract, take away the smaller number from the larger. ${problem.question.replace(' = ?', '')} equals ${correctAnswer}. Count backwards to check!`;
    case 'multiplication':
      const parts = problem.question.match(/(\d+)\s*[×x]\s*(\d+)/);
      if (parts) {
        return `${parts[1]} × ${parts[2]} means ${parts[1]} groups of ${parts[2]}, which equals ${correctAnswer}. Memorize your times tables!`;
      }
      return `Multiplication means adding a number to itself multiple times. The answer is ${correctAnswer}.`;
    case 'division':
      return `Division splits a number into equal groups. ${problem.question.replace(' = ?', '')} equals ${correctAnswer}. Think: how many times does the divisor fit into the dividend?`;
    case 'counting':
      return `Look for the pattern in the sequence. Each number increases by the same amount. The missing number is ${correctAnswer}.`;
    case 'fraction':
      return `When adding fractions with the same denominator, just add the numerators and keep the denominator. The answer is ${correctAnswer}.`;
    case 'algebra':
      return `To solve for x, isolate it by doing the opposite operation on both sides. The answer is x = ${correctAnswer}.`;
    case 'percentage':
      return `To find a percentage, multiply the number by the percent and divide by 100. 10% = divide by 10, 50% = divide by 2. The answer is ${correctAnswer}.`;
    case 'negative':
      return `When working with negative numbers, remember: negative + negative = more negative, negative × negative = positive. The answer is ${correctAnswer}.`;
    case 'geometry':
      return `Use the formula for the shape's area. Rectangle = width × height, Triangle = (base × height) ÷ 2. The answer is ${correctAnswer}.`;
    case 'quadratic':
      return `To solve x² = n, find the square root. What number times itself equals n? The answer is ${correctAnswer}.`;
    case 'exponent':
      return `An exponent tells you how many times to multiply a number by itself. The answer is ${correctAnswer}.`;
    case 'trig':
      return `Remember the key trig values: sin(0°)=0, sin(90°)=1, cos(0°)=1, cos(90°)=0. The answer is ${correctAnswer}.`;
    case 'logarithm':
      return `A logarithm asks "to what power?" log₂(8) = 3 because 2³ = 8. The answer is ${correctAnswer}.`;
    case 'derivative':
      return `Power rule: multiply by the exponent, then subtract 1 from the exponent. The answer is ${correctAnswer}.`;
    case 'integral':
      return `Integration reverses differentiation: add 1 to the exponent and divide by the new exponent. The answer is ${correctAnswer}.`;
    case 'limit':
      return `For simple limits, substitute the value x approaches into the expression. The answer is ${correctAnswer}.`;
    default:
      return `The correct answer is ${correctAnswer}. ${problem.hint || 'Keep practicing!'}`;
  }
}

interface EnhancedProblem extends Problem {
  choices: string[];
  correctIndex: number;
}

export function ProblemDisplay({ level, onOpenShop }: ProblemDisplayProps) {
  const { user, isSignedIn, authMethod } = useAuth();
  const { coins, totalEarned, addCoins } = useCoinStore();

  // Create auth user ID for database operations
  const authUserId = useMemo(() => {
    if (user && authMethod) {
      return createAuthUserId(authMethod, user.id);
    }
    return null;
  }, [user, authMethod]);
  
  const [problem, setProblem] = useState<EnhancedProblem | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [streak, setStreak] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [showTeaching, setShowTeaching] = useState(false);
  
  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const config = GRADE_CONFIG[level];

  // Generate initial problem
  useEffect(() => {
    generateNewProblem();
  }, [level]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (resultTimeoutRef.current) {
        clearTimeout(resultTimeoutRef.current);
      }
    };
  }, []);

  const generateNewProblem = useCallback(() => {
    const baseProblem = generateProblem(level);
    const { choices, correctIndex } = generateChoices(baseProblem.answer);
    setProblem({
      ...baseProblem,
      choices,
      correctIndex,
    });
    setSelectedChoice(null);
    setShowHint(false);
    setResult(null);
    setShowTeaching(false);
  }, [level]);

  const handleChoiceSelect = async (index: number) => {
    if (result !== null || !problem) return;
    
    setSelectedChoice(index);
    
    // Check if correct by comparing to correct index
    const isCorrect = index === problem.correctIndex;
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
      if (isSignedIn && authUserId) {
        saveUserProgress(authUserId, { coins, totalEarned: totalEarned + config.coins });
        saveMathAttempt(authUserId, level, problem.question, problem.choices[index], problem.displayAnswer, true, config.coins);
      }

      // Auto-advance after showing result
      resultTimeoutRef.current = setTimeout(() => {
        generateNewProblem();
      }, 1000);
    } else {
      setStreak(0);
      setShowTeaching(true);
      
      // Save failed attempt
      if (isSignedIn && authUserId) {
        saveMathAttempt(authUserId, level, problem.question, problem.choices[index], problem.displayAnswer, false, 0);
      }
    }
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

        {/* Multiple choice answers */}
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          {problem.choices.map((choice, index) => (
            <button
              key={index}
              onClick={() => handleChoiceSelect(index)}
              disabled={result !== null}
              className={`
                p-4 font-lcd text-xl text-center
                border-4 border-pixel-black
                transition-all
                ${selectedChoice === index 
                  ? result === 'correct' 
                    ? 'bg-foamy-green text-pixel-black' 
                    : result === 'wrong'
                      ? 'bg-sunset-orange text-white'
                      : 'bg-ocean-blue text-white'
                  : 'bg-pixel-shadow text-white hover:bg-pixel-black'
                }
                ${result === 'correct' && index === problem.correctIndex 
                  ? 'bg-foamy-green text-pixel-black' 
                  : ''
                }
                ${result === 'wrong' && index === problem.correctIndex
                  ? 'bg-foamy-green/50 text-white border-foamy-green'
                  : ''
                }
                disabled:cursor-not-allowed
              `}
              style={{ 
                boxShadow: selectedChoice === index 
                  ? 'inset 2px 2px 0px rgba(0,0,0,0.3)' 
                  : '3px 3px 0px #1a1a1a' 
              }}
            >
              {choice}
            </button>
          ))}
        </div>

        {/* Result feedback */}
        {result === 'correct' && (
          <div className="text-center mt-6 slide-up">
            <p className="font-pixel text-foamy-green text-lg">
              <Check className="inline w-5 h-5 mr-2" />
              CORRECT!
            </p>
            <p className="font-lcd text-foamy-green text-xl">+{config.coins} coins 🪙</p>
          </div>
        )}

        {result === 'wrong' && (
          <div className="text-center mt-6 slide-up space-y-4">
            <p className="font-pixel text-sunset-orange text-lg">NOT QUITE!</p>
            <p className="font-lcd text-gray-300 text-xl">
              Answer: <span className="text-foamy-green">{problem.displayAnswer}</span>
            </p>
            
            {/* Teaching section */}
            {showTeaching && (
              <div className="bg-ocean-blue/10 border-2 border-ocean-blue p-4 mt-4 text-left">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-6 h-6 text-ocean-blue flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-pixel text-ocean-blue text-xs mb-2">📚 LET'S LEARN</p>
                    <p className="font-lcd text-gray-300 text-sm leading-relaxed">
                      {getTeachingExplanation(problem, problem.displayAnswer)}
                    </p>
                    {problem.hint && (
                      <p className="font-lcd text-ocean-blue text-sm mt-2">
                        💡 Tip: {problem.hint}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
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

      {/* Mobile friendly message */}
      <p className="text-center font-lcd text-gray-500 text-sm">
        Tap an answer to select it
      </p>
    </div>
  );
}

export default ProblemDisplay;
