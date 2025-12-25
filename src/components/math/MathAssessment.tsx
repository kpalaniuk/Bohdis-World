'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Trophy, Zap, Clock, Target, ChevronUp, ChevronDown } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PixelButton } from '@/components/ui/PixelButton';
import { PixelCard } from '@/components/ui/PixelCard';
import { useAssessmentStore } from '@/stores/assessmentStore';
import { useCoinStore } from '@/stores/coinStore';
import {
  AssessmentProblem,
  generateAssessmentProblem,
  checkAssessmentAnswer,
  calculateSpeedBonus,
  calculateGrade,
  LEVEL_NAMES,
} from './AssessmentProblemGenerator';
import { AssessmentResults } from './AssessmentResults';

const ASSESSMENT_DURATION = 60; // 60 seconds

type GamePhase = 'setup' | 'playing' | 'results';

export function MathAssessment() {
  const { lastLevel, setLastLevel, addAssessmentResult, highScore, bestGrade } = useAssessmentStore();
  const { addCoins } = useCoinStore();
  
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [startingLevel, setStartingLevel] = useState(lastLevel);
  const [currentLevel, setCurrentLevel] = useState(lastLevel);
  const [problem, setProblem] = useState<AssessmentProblem | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  
  // Timer
  const [timeRemaining, setTimeRemaining] = useState(ASSESSMENT_DURATION);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Stats
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalResponseTime, setTotalResponseTime] = useState(0);
  const [levelsReached, setLevelsReached] = useState<number[]>([]);
  
  // Question timing
  const questionStartTime = useRef<number>(0);
  
  // Animation
  const [showPointsPopup, setShowPointsPopup] = useState<number | null>(null);
  const [resultFeedback, setResultFeedback] = useState<'correct' | 'wrong' | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize starting level from store
  useEffect(() => {
    setStartingLevel(lastLevel);
    setCurrentLevel(lastLevel);
  }, [lastLevel]);

  // Generate new problem
  const generateNewProblem = useCallback(() => {
    const newProblem = generateAssessmentProblem(currentLevel);
    setProblem(newProblem);
    setUserAnswer('');
    setSelectedChoice(null);
    setResultFeedback(null);
    questionStartTime.current = Date.now();
    
    // Track levels reached
    if (!levelsReached.includes(currentLevel)) {
      setLevelsReached(prev => [...prev, currentLevel]);
    }
  }, [currentLevel, levelsReached]);

  // Start the assessment
  const startAssessment = () => {
    setPhase('playing');
    setCurrentLevel(startingLevel);
    setScore(0);
    setQuestionsAnswered(0);
    setCorrectAnswers(0);
    setStreak(0);
    setTotalResponseTime(0);
    setLevelsReached([startingLevel]);
    setTimeRemaining(ASSESSMENT_DURATION);
    
    // Generate first problem
    const firstProblem = generateAssessmentProblem(startingLevel);
    setProblem(firstProblem);
    setUserAnswer('');
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
    
    // Calculate average level
    const avgLevel = levelsReached.length > 0 
      ? levelsReached.reduce((a, b) => a + b, 0) / levelsReached.length 
      : startingLevel;
    
    // Calculate grade
    const grade = calculateGrade(
      score,
      questionsAnswered,
      correctAnswers,
      avgLevel
    );
    
    // Calculate coins earned (1 coin per 10 points)
    const coinsEarned = Math.floor(score / 10);
    if (coinsEarned > 0) {
      addCoins(coinsEarned);
    }
    
    // Save result
    addAssessmentResult({
      date: new Date().toISOString(),
      score,
      grade,
      level: Math.max(...levelsReached, startingLevel),
      questionsAnswered,
      correctAnswers,
      averageResponseTime: questionsAnswered > 0 ? totalResponseTime / questionsAnswered : 0,
    });
    
    // Celebration for good grades
    if (grade >= 80) {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#98D8AA', '#4A90D9', '#FFD700', '#FF6B4A'],
      });
    }
    
    setPhase('results');
  }, [score, questionsAnswered, correctAnswers, levelsReached, startingLevel, totalResponseTime, addAssessmentResult, addCoins]);

  // Handle answer submission
  const handleSubmit = useCallback(() => {
    if (!problem) return;
    
    const responseTime = Date.now() - questionStartTime.current;
    const answer = problem.isMultipleChoice ? selectedChoice : userAnswer;
    
    if (answer === null || answer === '') return;
    
    const isCorrect = checkAssessmentAnswer(problem, answer);
    setQuestionsAnswered(prev => prev + 1);
    setTotalResponseTime(prev => prev + responseTime);
    
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
      setStreak(prev => prev + 1);
      setResultFeedback('correct');
      
      // Calculate points
      const speedMultiplier = calculateSpeedBonus(responseTime);
      const streakBonus = Math.min(streak, 5) * 5; // Max 25 bonus points for streak
      const pointsEarned = Math.round(problem.basePoints * speedMultiplier + streakBonus);
      
      setScore(prev => prev + pointsEarned);
      setShowPointsPopup(pointsEarned);
      
      // Level up after 3 correct in a row (max level 10)
      if ((streak + 1) % 3 === 0 && currentLevel < 10) {
        setCurrentLevel(prev => Math.min(10, prev + 1));
      }
      
      // Quick confetti for streaks
      if (streak >= 2) {
        confetti({
          particleCount: 20 + streak * 5,
          spread: 40,
          origin: { y: 0.7 },
          colors: ['#98D8AA', '#FFD700'],
        });
      }
      
      // Auto-advance after short delay
      setTimeout(() => {
        setShowPointsPopup(null);
        generateNewProblem();
      }, 400);
    } else {
      setStreak(0);
      setResultFeedback('wrong');
      
      // Level down after wrong answer if above starting level
      if (currentLevel > 1) {
        setCurrentLevel(prev => Math.max(1, prev - 1));
      }
      
      // Move to next question after showing feedback
      setTimeout(() => {
        generateNewProblem();
      }, 800);
    }
  }, [problem, selectedChoice, userAnswer, streak, currentLevel, generateNewProblem]);

  // Handle keyboard submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !problem?.isMultipleChoice) {
      handleSubmit();
    }
  };

  // Handle choice selection for multiple choice
  const handleChoiceSelect = (index: number) => {
    setSelectedChoice(index);
    // Auto-submit on choice selection
    setTimeout(() => {
      const answer = index;
      if (!problem) return;
      
      const responseTime = Date.now() - questionStartTime.current;
      const isCorrect = checkAssessmentAnswer(problem, answer);
      
      setQuestionsAnswered(prev => prev + 1);
      setTotalResponseTime(prev => prev + responseTime);
      
      if (isCorrect) {
        setCorrectAnswers(prev => prev + 1);
        setStreak(prev => prev + 1);
        setResultFeedback('correct');
        
        const speedMultiplier = calculateSpeedBonus(responseTime);
        const streakBonus = Math.min(streak, 5) * 5;
        const pointsEarned = Math.round(problem.basePoints * speedMultiplier + streakBonus);
        
        setScore(prev => prev + pointsEarned);
        setShowPointsPopup(pointsEarned);
        
        if ((streak + 1) % 3 === 0 && currentLevel < 10) {
          setCurrentLevel(prev => Math.min(10, prev + 1));
        }
        
        if (streak >= 2) {
          confetti({
            particleCount: 20 + streak * 5,
            spread: 40,
            origin: { y: 0.7 },
            colors: ['#98D8AA', '#FFD700'],
          });
        }
        
        setTimeout(() => {
          setShowPointsPopup(null);
          generateNewProblem();
        }, 400);
      } else {
        setStreak(0);
        setResultFeedback('wrong');
        
        if (currentLevel > 1) {
          setCurrentLevel(prev => Math.max(1, prev - 1));
        }
        
        setTimeout(() => {
          generateNewProblem();
        }, 800);
      }
    }, 100);
  };

  // Focus input when problem changes
  useEffect(() => {
    if (problem && !problem.isMultipleChoice && inputRef.current) {
      inputRef.current.focus();
    }
  }, [problem]);

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
            ⏱️ TIMED ASSESSMENT
          </h2>
          <p className="font-lcd text-gray-400 text-lg">
            60 seconds • Progressive Difficulty • Beat your best!
          </p>
        </div>

        {/* Stats display */}
        <div className="grid grid-cols-2 gap-4">
          <PixelCard variant="glass" padding="md" className="text-center">
            <Trophy className="w-6 h-6 mx-auto mb-2 text-foamy-green" />
            <p className="font-lcd text-gray-400 text-sm">High Score</p>
            <p className="font-pixel text-foamy-green text-lg">{highScore}</p>
          </PixelCard>
          <PixelCard variant="glass" padding="md" className="text-center">
            <Target className="w-6 h-6 mx-auto mb-2 text-ocean-blue" />
            <p className="font-lcd text-gray-400 text-sm">Best Grade</p>
            <p className="font-pixel text-ocean-blue text-lg">{bestGrade.toFixed(2)}</p>
          </PixelCard>
        </div>

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
            Higher levels = harder questions + more points
          </p>
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
            <span>Easy</span>
            <span>→ Free Input → Multiple Choice →</span>
            <span>Hard</span>
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
    const avgLevel = levelsReached.length > 0 
      ? levelsReached.reduce((a, b) => a + b, 0) / levelsReached.length 
      : startingLevel;
    const grade = calculateGrade(score, questionsAnswered, correctAnswers, avgLevel);
    const coinsEarned = Math.floor(score / 10);
    
    return (
      <AssessmentResults
        score={score}
        grade={grade}
        questionsAnswered={questionsAnswered}
        correctAnswers={correctAnswers}
        maxLevel={Math.max(...levelsReached, startingLevel)}
        averageResponseTime={questionsAnswered > 0 ? totalResponseTime / questionsAnswered : 0}
        coinsEarned={coinsEarned}
        isNewHighScore={score > highScore - (score > 0 ? score : 1)} // Check if this is a new high
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
            flex items-center gap-2 px-4 py-2 border-4 border-pixel-black
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
        </div>

        {/* Level indicator */}
        <div 
          className="px-4 py-2 border-4 border-pixel-black bg-pixel-shadow"
          style={{ boxShadow: '3px 3px 0px #1a1a1a' }}
        >
          <span className="font-lcd text-gray-400 text-sm">LVL </span>
          <span className="font-pixel text-foamy-green text-lg">{currentLevel}</span>
        </div>

        {/* Score */}
        <div 
          className="px-4 py-2 border-4 border-pixel-black bg-pixel-shadow relative"
          style={{ boxShadow: '3px 3px 0px #1a1a1a' }}
        >
          <Zap className="w-4 h-4 text-foamy-green inline mr-1" />
          <span className="font-pixel text-foamy-green text-lg">{score}</span>
          
          {/* Points popup */}
          {showPointsPopup && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 plus-coins">
              <span className="font-pixel text-foamy-green text-sm">+{showPointsPopup}</span>
            </div>
          )}
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
          <div 
            className="inline-block px-3 py-1 mb-4 font-pixel text-xs border-2 border-pixel-black bg-ocean-blue text-pixel-black"
          >
            {problem.type.toUpperCase()}
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

          {/* Answer section */}
          {problem.isMultipleChoice && problem.choices ? (
            // Multiple choice
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
          ) : (
            // Free input
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="?"
                disabled={resultFeedback !== null}
                className={`
                  w-full sm:w-48
                  px-4 py-3
                  font-lcd text-3xl text-center
                  bg-pixel-black border-4 border-pixel-shadow
                  text-white
                  focus:border-foamy-green focus:outline-none
                  disabled:opacity-50
                  ${resultFeedback === 'correct' ? 'border-foamy-green bg-foamy-green/10' : ''}
                  ${resultFeedback === 'wrong' ? 'border-sunset-orange bg-sunset-orange/10' : ''}
                `}
                autoComplete="off"
              />
              
              <PixelButton
                onClick={handleSubmit}
                variant="primary"
                size="lg"
                disabled={!userAnswer.trim() || resultFeedback !== null}
              >
                ⏎
              </PixelButton>
            </div>
          )}

          {/* Quick feedback */}
          {resultFeedback === 'correct' && (
            <div className="text-center mt-4 slide-up">
              <span className="font-pixel text-foamy-green">✓ CORRECT!</span>
            </div>
          )}
          {resultFeedback === 'wrong' && (
            <div className="text-center mt-4 slide-up">
              <span className="font-pixel text-sunset-orange">✗ {problem.displayAnswer}</span>
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

