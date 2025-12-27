'use client';

import { useState, useEffect, useMemo } from 'react';
import { Trash2, RefreshCw, Check, X, TrendingUp, Users } from 'lucide-react';
import { PixelCard } from '@/components/ui/PixelCard';
import { PixelButton } from '@/components/ui/PixelButton';
import {
  ForumProblem,
  ProblemAttempt,
  loadForumProblems,
  submitProblemAttempt,
  deleteForumProblem,
  getProblemAttempts,
} from '@/lib/wordProblems';
import {
  WordProblem,
  generateWordProblem,
  getTemplateById,
} from './WordProblemGenerator';
import { useAuth } from '@/contexts/AuthContext';
import { createAuthUserId } from '@/lib/syncProgress';
import { isAdmin, isSuperuser } from '@/lib/simpleAuth';

interface WordProblemForumProps {
  difficultyLevel?: number;
}

export function WordProblemForum({ difficultyLevel }: WordProblemForumProps) {
  const { user, authMethod, isLoaded } = useAuth();
  const [problems, setProblems] = useState<ForumProblem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProblem, setSelectedProblem] = useState<ForumProblem | null>(null);
  const [generatedProblem, setGeneratedProblem] = useState<WordProblem | null>(null);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [attempts, setAttempts] = useState<ProblemAttempt[]>([]);
  const [showStats, setShowStats] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<number | undefined>(difficultyLevel);

  const userId = useMemo(() => {
    if (user && authMethod) {
      return createAuthUserId(authMethod, user.id);
    }
    return null;
  }, [user, authMethod]);

  const userIsAdmin = useMemo(() => {
    if (!user) return false;
    const simpleUser = {
      id: user.id,
      username: user.username || '',
      display_name: user.displayName,
      created_at: '',
      role: user.role as 'user' | 'admin' | 'superuser',
      can_gift_items: false,
    };
    return isAdmin(simpleUser) || isSuperuser(simpleUser);
  }, [user]);

  // Load forum problems
  useEffect(() => {
    loadProblems();
  }, [filterLevel]);

  const loadProblems = async () => {
    setIsLoading(true);
    const result = await loadForumProblems(filterLevel);
    if (result.success && result.problems) {
      setProblems(result.problems);
    }
    setIsLoading(false);
  };

  // Generate problem when one is selected
  useEffect(() => {
    if (selectedProblem) {
      generateProblemForAttempt(selectedProblem);
    }
  }, [selectedProblem]);

  const generateProblemForAttempt = async (problem: ForumProblem) => {
    const template = getTemplateById(problem.template_id || '');
    if (!template) {
      setMessage({ type: 'error', text: 'Template not found' });
      return;
    }

    const wordProblem = generateWordProblem(template, problem.custom_words, true);
    setGeneratedProblem(wordProblem);
    setUserAnswer('');
    setShowAnswer(false);
    setMessage(null);
  };

  const handleSolve = async () => {
    if (!selectedProblem || !generatedProblem || !userId) {
      setMessage({ type: 'error', text: 'Please sign in to solve problems' });
      return;
    }

    const answer = parseFloat(userAnswer);
    if (isNaN(answer)) {
      setMessage({ type: 'error', text: 'Please enter a valid number' });
      return;
    }

    const result = await submitProblemAttempt(
      userId,
      selectedProblem.id,
      answer,
      generatedProblem.answer,
      generatedProblem.generatedNumbers
    );

    if (result.success) {
      setShowAnswer(true);
      if (result.isCorrect) {
        setMessage({ type: 'success', text: 'Correct! Great job! 🎉' });
      } else {
        setMessage({ type: 'error', text: `Wrong answer. The correct answer is ${generatedProblem.answer}` });
      }
      // Reload attempts
      loadAttempts(selectedProblem.id);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to submit answer' });
    }
  };

  const loadAttempts = async (problemId: string) => {
    const result = await getProblemAttempts(problemId);
    if (result.success && result.attempts) {
      setAttempts(result.attempts);
    }
  };

  const handleDelete = async (problemId: string) => {
    if (!confirm('Are you sure you want to delete this problem from the forum?')) {
      return;
    }

    const result = await deleteForumProblem(problemId);
    if (result.success) {
      setMessage({ type: 'success', text: 'Problem deleted' });
      loadProblems();
      if (selectedProblem?.id === problemId) {
        setSelectedProblem(null);
        setGeneratedProblem(null);
      }
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to delete' });
    }
  };

  const handleRegenerate = () => {
    if (selectedProblem) {
      generateProblemForAttempt(selectedProblem);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h2 
          className="font-pixel text-foamy-green text-lg md:text-xl mb-2"
          style={{ textShadow: '2px 2px 0px #2d2d2d' }}
        >
          🌐 WORD PROBLEM FORUM
        </h2>
        <p className="font-lcd text-gray-400 text-sm">
          Solve problems created by other users!
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`
          p-3 border-4 font-lcd text-sm flex items-center gap-2
          ${message.type === 'success' 
            ? 'bg-green-900/50 border-foamy-green text-foamy-green' 
            : 'bg-red-900/50 border-red-500 text-red-300'}
        `}>
          {message.type === 'success' ? <Check size={16} /> : <X size={16} />}
          {message.text}
        </div>
      )}

      {/* Filter */}
      <PixelCard variant="glass" padding="md">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-lcd text-gray-400 text-xs">Filter by level:</span>
          <button
            onClick={() => setFilterLevel(undefined)}
            className={`
              px-3 py-1 font-pixel text-xs border-4
              ${filterLevel === undefined
                ? 'bg-foamy-green text-pixel-black border-pixel-black'
                : 'bg-pixel-shadow text-gray-300 border-pixel-shadow'}
            `}
          >
            ALL
          </button>
          {Array.from({ length: 10 }, (_, i) => i + 1).map(level => (
            <button
              key={level}
              onClick={() => setFilterLevel(level)}
              className={`
                px-3 py-1 font-pixel text-xs border-4
                ${filterLevel === level
                  ? 'bg-foamy-green text-pixel-black border-pixel-black'
                  : 'bg-pixel-shadow text-gray-300 border-pixel-shadow'}
              `}
            >
              {level}
            </button>
          ))}
        </div>
      </PixelCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Problems List */}
        <div className="space-y-3">
          <PixelCard variant="glass" padding="md">
            <h3 className="font-pixel text-ocean-blue text-xs mb-3">AVAILABLE PROBLEMS</h3>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="font-pixel text-gray-400 animate-pulse">LOADING...</div>
              </div>
            ) : problems.length === 0 ? (
              <div className="text-center py-8">
                <p className="font-lcd text-gray-400">No problems available</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {problems.map(problem => (
                  <div
                    key={problem.id}
                    className={`
                      p-3 border-4 cursor-pointer transition-all
                      ${selectedProblem?.id === problem.id
                        ? 'bg-foamy-green/20 border-foamy-green'
                        : 'bg-pixel-black/50 border-pixel-shadow hover:border-ocean-blue'}
                    `}
                    onClick={() => {
                      setSelectedProblem(problem);
                      setShowStats(null);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-pixel text-xs text-foamy-green">
                            Level {problem.difficulty_level}
                          </span>
                          <span className="font-lcd text-gray-500 text-xs">
                            by {problem.display_name || problem.username || 'Anonymous'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Users size={12} />
                          <span>{problem.attempt_count || 0} attempts</span>
                          {problem.correct_count !== undefined && (
                            <>
                              <Check size={12} className="text-foamy-green" />
                              <span className="text-foamy-green">{problem.correct_count} correct</span>
                            </>
                          )}
                        </div>
                      </div>
                      {userIsAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(problem.id);
                          }}
                          className="p-1 text-red-500 hover:text-red-300 transition-colors"
                          title="Delete problem"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PixelCard>
        </div>

        {/* Problem Solver */}
        <div className="space-y-3">
          {selectedProblem && generatedProblem ? (
            <>
              <PixelCard variant="glass" padding="lg">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-pixel text-foamy-green text-xs">SOLVE THIS PROBLEM:</h3>
                    <button
                      onClick={handleRegenerate}
                      className="p-1 text-ocean-blue hover:text-foamy-green transition-colors"
                      title="Generate new numbers"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>
                  
                  <p className="font-lcd text-white text-lg leading-relaxed">
                    {generatedProblem.question}
                  </p>

                  {showAnswer && (
                    <div className="border-t-4 border-pixel-shadow pt-4">
                      <p className="font-pixel text-foamy-green text-sm">
                        Correct Answer: {generatedProblem.answer}
                      </p>
                    </div>
                  )}

                  {!showAnswer && userId && (
                    <div className="border-t-4 border-pixel-shadow pt-4 space-y-3">
                      <input
                        type="number"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Your answer"
                        className="w-full px-3 py-2 bg-pixel-black border-4 border-pixel-shadow text-white font-lcd text-lg focus:border-foamy-green outline-none"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSolve();
                          }
                        }}
                      />
                      <PixelButton
                        variant="primary"
                        size="md"
                        onClick={handleSolve}
                        className="w-full"
                      >
                        SUBMIT ANSWER
                      </PixelButton>
                    </div>
                  )}

                  {!userId && (
                    <div className="border-t-4 border-pixel-shadow pt-4">
                      <p className="font-lcd text-gray-500 text-xs text-center">
                        Sign in to solve problems!
                      </p>
                    </div>
                  )}
                </div>
              </PixelCard>

              {/* Stats */}
              <PixelCard variant="glass" padding="md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-pixel text-ocean-blue text-xs">STATISTICS</h3>
                  <button
                    onClick={() => {
                      if (showStats === selectedProblem.id) {
                        setShowStats(null);
                      } else {
                        setShowStats(selectedProblem.id);
                        loadAttempts(selectedProblem.id);
                      }
                    }}
                    className="text-ocean-blue hover:text-foamy-green transition-colors"
                  >
                    <TrendingUp size={16} />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 bg-pixel-shadow/30">
                    <div className="font-pixel text-foamy-green text-lg">
                      {selectedProblem.attempt_count || 0}
                    </div>
                    <div className="font-lcd text-gray-400 text-xs">ATTEMPTS</div>
                  </div>
                  <div className="text-center p-2 bg-pixel-shadow/30">
                    <div className="font-pixel text-foamy-green text-lg">
                      {selectedProblem.correct_count || 0}
                    </div>
                    <div className="font-lcd text-gray-400 text-xs">CORRECT</div>
                  </div>
                </div>

                {showStats === selectedProblem.id && attempts.length > 0 && (
                  <div className="mt-4 border-t-4 border-pixel-shadow pt-4">
                    <h4 className="font-pixel text-xs text-gray-400 mb-2">RECENT ATTEMPTS:</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {attempts.slice(0, 10).map(attempt => (
                        <div
                          key={attempt.id}
                          className="flex items-center justify-between text-xs font-lcd"
                        >
                          <span className="text-gray-400">
                            {attempt.display_name || attempt.username || 'Anonymous'}
                          </span>
                          <span className={attempt.is_correct ? 'text-foamy-green' : 'text-red-500'}>
                            {attempt.is_correct ? '✓' : '✗'} {attempt.user_answer}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </PixelCard>
            </>
          ) : (
            <PixelCard variant="glass" padding="lg">
              <div className="text-center py-8">
                <p className="font-lcd text-gray-400">
                  Select a problem from the list to solve it!
                </p>
              </div>
            </PixelCard>
          )}
        </div>
      </div>
    </div>
  );
}

