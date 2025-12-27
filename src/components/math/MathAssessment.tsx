'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Clock, ChevronUp, ChevronDown, GraduationCap, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PixelButton } from '@/components/ui/PixelButton';
import { PixelCard } from '@/components/ui/PixelCard';
import { useAssessmentStore } from '@/stores/assessmentStore';
import { useCoinStore } from '@/stores/coinStore';
import {
  AssessmentProblem,
  generateAssessmentProblem,
  checkAssessmentAnswer,
  calculateGradeLevel,
  LEVEL_NAMES,
  LEVEL_DESCRIPTIONS,
} from './AssessmentProblemGenerator';
import { AssessmentResults } from './AssessmentResults';

const INITIAL_TIME = 90; // Start with 90 seconds
const TIME_BONUS_CORRECT = 2; // Add 2 seconds per correct answer (reduced from 5)
const MAX_TIME = 120; // Cap at 2 minutes
const STREAK_FOR_LEVEL_UP = 3; // Level up after 3 correct in a row (slower advancement)

type GamePhase = 'setup' | 'playing' | 'results';

interface LevelAnswer {
  level: number;
  correct: boolean;
}

export function MathAssessment() {
  const { 
    lastLevel, 
    setLastLevel, 
    addAssessmentResult, 
    bestGradeLevel,
    currentStreak,
    longestStreak,
    totalAssessments,
    totalQuestionsAnswered,
    updateStreak,
  } = useAssessmentStore();
  const { addCoins } = useCoinStore();
  
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [startingLevel, setStartingLevel] = useState(lastLevel);
  const [currentLevel, setCurrentLevel] = useState(lastLevel);
  const [problem, setProblem] = useState<AssessmentProblem | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  
  // Timer
  const [timeRemaining, setTimeRemaining] = useState(INITIAL_TIME);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Stats
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalResponseTime, setTotalResponseTime] = useState(0);
  const [levelAnswers, setLevelAnswers] = useState<LevelAnswer[]>([]);
  const [maxLevelReached, setMaxLevelReached] = useState(1);
  
  // Question timing
  const questionStartTime = useRef<number>(0);
  
  // Animation
  const [showTimeBonus, setShowTimeBonus] = useState<number | null>(null);
  const [resultFeedback, setResultFeedback] = useState<'correct' | 'wrong' | null>(null);
  
  // Streak bonus for this session
  const [sessionStreakBonus, setSessionStreakBonus] = useState(0);

  // Initialize starting level from store
  useEffect(() => {
    setStartingLevel(lastLevel);
    setCurrentLevel(lastLevel);
  }, [lastLevel]);

  // Generate new problem
  const generateNewProblem = useCallback(() => {
    const newProblem = generateAssessmentProblem(currentLevel);
    setProblem(newProblem);
    setSelectedChoice(null);
    setResultFeedback(null);
    questionStartTime.current = Date.now();
    
    // Track max level
    if (currentLevel > maxLevelReached) {
      setMaxLevelReached(currentLevel);
    }
  }, [currentLevel, maxLevelReached]);

  // Start the assessment
  const startAssessment = () => {
    // Update streak and get bonus
    const { streakBonus } = updateStreak();
    setSessionStreakBonus(streakBonus);
    
    setPhase('playing');
    setCurrentLevel(startingLevel);
    setQuestionsAnswered(0);
    setCorrectAnswers(0);
    setStreak(0);
    setTotalResponseTime(0);
    setLevelAnswers([]);
    setMaxLevelReached(startingLevel);
    setTimeRemaining(INITIAL_TIME);
    
    // Generate first problem
    const firstProblem = generateAssessmentProblem(startingLevel);
    setProblem(firstProblem);
    setSelectedChoice(null);
    questionStartTime.current = Date.now();
    
    // Start timer
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          endAssessment();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // End the assessment
  const endAssessment = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Calculate grade level from performance
    const gradeLevel = calculateGradeLevel(levelAnswers);
    
    // Calculate coins earned with enhanced formula
    const levelBonus = Math.floor(gradeLevel);
    const accuracy = questionsAnswered > 0 ? correctAnswers / questionsAnswered : 0;
    const accuracyBonus = accuracy >= 0.8 ? 5 : 0;
    const coinsEarned = correctAnswers + levelBonus + accuracyBonus + sessionStreakBonus;
    if (coinsEarned > 0) {
      addCoins(coinsEarned);
    }
    
    // Save result
    addAssessmentResult({
      date: new Date().toISOString(),
      gradeLevel,
      questionsAnswered,
      correctAnswers,
      maxLevel: maxLevelReached,
      averageResponseTime: questionsAnswered > 0 ? totalResponseTime / questionsAnswered : 0,
    });
    
    // Celebration for good performance
    if (gradeLevel >= 5) {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#98D8AA', '#4A90D9', '#FFD700', '#FF6B4A'],
      });
    }
    
    setPhase('results');
  }, [levelAnswers, correctAnswers, questionsAnswered, totalResponseTime, maxLevelReached, sessionStreakBonus, addAssessmentResult, addCoins]);

  // Handle choice selection
  const handleChoiceSelect = useCallback((index: number) => {
    if (resultFeedback !== null || !problem) return;
    
    setSelectedChoice(index);
    
    const responseTime = Date.now() - questionStartTime.current;
    const isCorrect = checkAssessmentAnswer(problem, index);
    
    setQuestionsAnswered(prev => prev + 1);
    setTotalResponseTime(prev => prev + responseTime);
    setLevelAnswers(prev => [...prev, { level: currentLevel, correct: isCorrect }]);
    
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
      setStreak(prev => prev + 1);
      setResultFeedback('correct');
      
      // Add time bonus
      const newTime = Math.min(MAX_TIME, timeRemaining + TIME_BONUS_CORRECT);
      setTimeRemaining(newTime);
      setShowTimeBonus(TIME_BONUS_CORRECT);
      
      // Level up after streak (faster advancement when doing well)
      const newStreak = streak + 1;
      if (newStreak >= STREAK_FOR_LEVEL_UP && currentLevel < 10) {
        // Jump levels faster when on a streak
        const levelsToJump = newStreak >= 4 ? 2 : 1;
        setCurrentLevel(prev => Math.min(10, prev + levelsToJump));
        setStreak(0); // Reset streak after level up
      }
      
      // Quick confetti for streaks
      if (newStreak >= 2) {
        confetti({
          particleCount: 20 + newStreak * 5,
          spread: 40,
          origin: { y: 0.7 },
          colors: ['#98D8AA', '#FFD700'],
        });
      }
      
      // Auto-advance after short delay
      setTimeout(() => {
        setShowTimeBonus(null);
        generateNewProblem();
      }, 500);
    } else {
      setStreak(0);
      setResultFeedback('wrong');
      
      // Level down after wrong answer (but not below 1)
      if (currentLevel > 1) {
        setCurrentLevel(prev => Math.max(1, prev - 1));
      }
      
      // Move to next question after showing feedback
      setTimeout(() => {
        generateNewProblem();
      }, 1000);
    }
  }, [problem, resultFeedback, streak, currentLevel, timeRemaining, generateNewProblem]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Adjust starting level
  const adjustStartingLevel = (delta: number) => {
    const newLevel = Math.max(1, Math.min(10, startingLevel + delta));
    setStartingLevel(newLevel);
    setLastLevel(newLevel);
  };

  // Render setup phase
  if (phase === 'setup') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 
            className="font-pixel text-foamy-green text-lg md:text-xl mb-2"
            style={{ textShadow: '2px 2px 0px #2d2d2d' }}
          >
            📐 MATH LEVEL ASSESSMENT
          </h2>
          <p className="font-lcd text-gray-400 text-lg">
            Find your math grade level • Adaptive difficulty
          </p>
        </div>

        {/* Stats display */}
        <div className="grid grid-cols-2 gap-3">
          <PixelCard variant="glass" padding="md" className="text-center">
            <GraduationCap className="w-6 h-6 mx-auto mb-1 text-foamy-green" />
            <p className="font-lcd text-gray-400 text-xs">Best Level</p>
            <p className="font-pixel text-foamy-green text-xl">{bestGradeLevel.toFixed(1)}</p>
            <p className="font-lcd text-gray-500 text-xs">
              {LEVEL_NAMES[Math.floor(bestGradeLevel)]}
            </p>
          </PixelCard>
          
          <PixelCard variant="glass" padding="md" className="text-center">
            <span className="text-xl">🔥</span>
            <p className="font-lcd text-gray-400 text-xs">Daily Streak</p>
            <p className="font-pixel text-sunset-orange text-xl">{currentStreak} days</p>
            <p className="font-lcd text-gray-500 text-xs">
              Best: {longestStreak} days
            </p>
          </PixelCard>
        </div>
        
        {/* Total stats */}
        <PixelCard variant="glass" padding="sm">
          <div className="flex justify-around text-center">
            <div>
              <p className="font-lcd text-gray-400 text-xs">Assessments</p>
              <p className="font-pixel text-ocean-blue text-lg">{totalAssessments}</p>
            </div>
            <div>
              <p className="font-lcd text-gray-400 text-xs">Questions</p>
              <p className="font-pixel text-ocean-blue text-lg">{totalQuestionsAnswered}</p>
            </div>
            <div>
              <p className="font-lcd text-gray-400 text-xs">Streak Bonus</p>
              <p className="font-pixel text-foamy-green text-lg">+{Math.min(currentStreak * 2, 20)}🪙</p>
            </div>
          </div>
        </PixelCard>

        {/* Starting level selector */}
        <PixelCard variant="glass" padding="lg">
          <h3 className="font-pixel text-ocean-blue text-xs text-center mb-4">
            STARTING LEVEL
          </h3>
          
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => adjustStartingLevel(-1)}
              disabled={startingLevel <= 1}
              className={`
                p-3 border-4 border-pixel-black bg-pixel-shadow
                transition-all
                ${startingLevel > 1 ? 'hover:bg-pixel-black active:translate-y-0.5' : 'opacity-30 cursor-not-allowed'}
              `}
              style={{ boxShadow: '3px 3px 0px #1a1a1a' }}
            >
              <ChevronDown className="w-6 h-6 text-foamy-green" />
            </button>
            
            <div className="text-center min-w-[150px]">
              <div 
                className="font-pixel text-4xl text-foamy-green mb-2"
                style={{ textShadow: '3px 3px 0px #2d2d2d' }}
              >
                {startingLevel}
              </div>
              <div className="font-lcd text-gray-400 text-lg">
                {LEVEL_NAMES[startingLevel]}
              </div>
              <div className="font-lcd text-gray-500 text-sm">
                {LEVEL_DESCRIPTIONS[startingLevel]}
              </div>
            </div>
            
            <button
              onClick={() => adjustStartingLevel(1)}
              disabled={startingLevel >= 10}
              className={`
                p-3 border-4 border-pixel-black bg-pixel-shadow
                transition-all
                ${startingLevel < 10 ? 'hover:bg-pixel-black active:translate-y-0.5' : 'opacity-30 cursor-not-allowed'}
              `}
              style={{ boxShadow: '3px 3px 0px #1a1a1a' }}
            >
              <ChevronUp className="w-6 h-6 text-foamy-green" />
            </button>
          </div>
          
          <p className="font-lcd text-gray-500 text-center text-sm mt-4">
            The assessment adapts to find your true level!
          </p>
        </PixelCard>

        {/* How it works */}
        <PixelCard variant="glass" padding="md">
          <h3 className="font-pixel text-ocean-blue text-xs mb-3">HOW IT WORKS</h3>
          <div className="font-lcd text-gray-400 text-sm space-y-2">
            <p>⏱️ Start with 90 seconds</p>
            <p>✅ Correct answers add +2 seconds</p>
            <p>📈 Get 3+ right in a row to level up</p>
            <p>📉 Wrong answers drop you down a level</p>
          </div>
        </PixelCard>
        
        {/* Earning coins */}
        <PixelCard variant="glass" padding="md">
          <h3 className="font-pixel text-foamy-green text-xs mb-3">🪙 EARN COINS</h3>
          <div className="font-lcd text-gray-400 text-sm space-y-2">
            <p>• 1 coin per correct answer</p>
            <p>• Bonus coins for higher levels reached</p>
            <p>• +5 bonus for 80%+ accuracy</p>
            <p>• Daily streak bonus (up to +20 coins!)</p>
            <p className="text-foamy-green">Play daily to build your streak! 🔥</p>
          </div>
        </PixelCard>

        {/* Level preview */}
        <PixelCard variant="glass" padding="md">
          <h3 className="font-pixel text-ocean-blue text-xs mb-3">LEVEL PROGRESSION</h3>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map(level => (
              <div
                key={level}
                className={`
                  text-center p-2 border-2 border-pixel-black font-pixel text-xs
                  ${level === startingLevel ? 'bg-foamy-green text-pixel-black' : ''}
                  ${level < startingLevel ? 'bg-pixel-shadow text-gray-500' : ''}
                  ${level > startingLevel ? 'bg-pixel-black text-gray-600' : ''}
                `}
              >
                {level}
              </div>
            ))}
          </div>
          <div className="flex justify-between font-lcd text-xs text-gray-500 mt-2">
            <span>1st Grade</span>
            <span>→ All Multiple Choice →</span>
            <span>10th+</span>
          </div>
        </PixelCard>

        {/* Start button */}
        <div className="text-center">
          <PixelButton
            variant="success"
            size="lg"
            icon={Play}
            onClick={startAssessment}
          >
            START ASSESSMENT
          </PixelButton>
        </div>
      </div>
    );
  }

  // Render results phase
  if (phase === 'results') {
    const gradeLevel = calculateGradeLevel(levelAnswers);
    const levelBonus = Math.floor(gradeLevel);
    // Enhanced coin calculation: base + level bonus + accuracy bonus + streak bonus
    const accuracyBonus = questionsAnswered > 0 && correctAnswers / questionsAnswered >= 0.8 ? 5 : 0;
    const coinsEarned = correctAnswers + levelBonus + accuracyBonus + sessionStreakBonus;
    
    return (
      <AssessmentResults
        gradeLevel={gradeLevel}
        questionsAnswered={questionsAnswered}
        correctAnswers={correctAnswers}
        maxLevel={maxLevelReached}
        averageResponseTime={questionsAnswered > 0 ? totalResponseTime / questionsAnswered : 0}
        coinsEarned={coinsEarned}
        streakBonus={sessionStreakBonus}
        currentStreak={currentStreak}
        isNewBest={gradeLevel > bestGradeLevel}
        onPlayAgain={() => {
          setPhase('setup');
          setStartingLevel(lastLevel);
        }}
      />
    );
  }

  // Render playing phase
  return (
    <div className="space-y-4">
      {/* Timer and stats bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Timer */}
        <div 
          className={`
            flex items-center gap-2 px-4 py-2 border-4 border-pixel-black relative
            ${timeRemaining <= 10 ? 'bg-sunset-orange/20 border-sunset-orange animate-pulse' : 'bg-pixel-shadow'}
          `}
          style={{ boxShadow: '3px 3px 0px #1a1a1a' }}
        >
          <Clock className={`w-5 h-5 ${timeRemaining <= 10 ? 'text-sunset-orange' : 'text-ocean-blue'}`} />
          <span 
            className={`font-pixel text-lg ${timeRemaining <= 10 ? 'text-sunset-orange' : 'text-white'}`}
          >
            {timeRemaining}s
          </span>
          
          {/* Time bonus popup */}
          {showTimeBonus && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 plus-coins">
              <span className="font-pixel text-foamy-green text-sm">+{showTimeBonus}s</span>
            </div>
          )}
        </div>

        {/* Level indicator */}
        <div 
          className="px-4 py-2 border-4 border-pixel-black bg-pixel-shadow"
          style={{ boxShadow: '3px 3px 0px #1a1a1a' }}
        >
          <span className="font-lcd text-gray-400 text-sm">Grade </span>
          <span className="font-pixel text-foamy-green text-lg">{currentLevel}</span>
        </div>

        {/* Correct count */}
        <div 
          className="px-4 py-2 border-4 border-pixel-black bg-pixel-shadow"
          style={{ boxShadow: '3px 3px 0px #1a1a1a' }}
        >
          <Zap className="w-4 h-4 text-foamy-green inline mr-1" />
          <span className="font-pixel text-foamy-green text-lg">{correctAnswers}</span>
        </div>

        {/* Streak */}
        {streak > 0 && (
          <div 
            className="px-3 py-2 border-4 border-pixel-black bg-pixel-shadow"
            style={{ boxShadow: '3px 3px 0px #1a1a1a' }}
          >
            <span className="font-pixel text-sunset-orange text-sm">{streak}🔥</span>
          </div>
        )}
      </div>

      {/* Problem display */}
      {problem && (
        <div 
          className={`
            bg-pixel-black/90 border-4 p-6 md:p-8
            transition-all duration-200
            ${resultFeedback === 'correct' ? 'border-foamy-green flash-green' : ''}
            ${resultFeedback === 'wrong' ? 'border-sunset-orange shake' : ''}
            ${!resultFeedback ? 'border-pixel-shadow' : ''}
          `}
          style={{ boxShadow: '6px 6px 0px #2d2d2d' }}
        >
          {/* Problem type badge */}
          <div className="flex items-center justify-between mb-4">
            <div 
              className="inline-block px-3 py-1 font-pixel text-xs border-2 border-pixel-black bg-ocean-blue text-pixel-black"
            >
              {problem.type.toUpperCase().replace(/-/g, ' ')}
            </div>
            <div className="font-lcd text-gray-500 text-sm">
              {LEVEL_NAMES[currentLevel]}
            </div>
          </div>

          {/* Question */}
          <div className="text-center my-6">
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
                disabled={resultFeedback !== null}
                className={`
                  p-4 font-lcd text-xl text-center
                  border-4 border-pixel-black
                  transition-all
                  ${selectedChoice === index 
                    ? resultFeedback === 'correct' 
                      ? 'bg-foamy-green text-pixel-black' 
                      : resultFeedback === 'wrong'
                        ? 'bg-sunset-orange text-white'
                        : 'bg-ocean-blue text-white'
                    : 'bg-pixel-shadow text-white hover:bg-pixel-black'
                  }
                  ${resultFeedback === 'correct' && index === problem.correctChoiceIndex 
                    ? 'bg-foamy-green text-pixel-black' 
                    : ''
                  }
                  ${resultFeedback === 'wrong' && index === problem.correctChoiceIndex
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

          {/* Quick feedback */}
          {resultFeedback === 'correct' && (
            <div className="text-center mt-4 slide-up">
              <span className="font-pixel text-foamy-green">✓ CORRECT! +2s</span>
            </div>
          )}
          {resultFeedback === 'wrong' && (
            <div className="text-center mt-4 slide-up">
              <span className="font-pixel text-sunset-orange">
                ✗ Answer: {problem.displayAnswer}
              </span>
              {problem.hint && (
                <p className="font-lcd text-gray-400 text-sm mt-1">
                  💡 {problem.hint}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Progress info */}
      <div className="flex justify-center gap-6 font-lcd text-gray-400 text-sm">
        <span>Answered: {questionsAnswered}</span>
        <span>Correct: {correctAnswers}</span>
        <span>
          Accuracy: {questionsAnswered > 0 
            ? Math.round((correctAnswers / questionsAnswered) * 100) 
            : 0}%
        </span>
      </div>
    </div>
  );
}

export default MathAssessment;
