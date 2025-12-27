'use client';

import { useState, useEffect, useMemo } from 'react';
import { Save, Share2, RefreshCw, Check, X } from 'lucide-react';
import { PixelCard } from '@/components/ui/PixelCard';
import { PixelButton } from '@/components/ui/PixelButton';
import {
  WordProblemTemplate,
  WordProblem,
  CustomWords,
  generateWordProblem,
  getTemplatesAtOrAboveLevel,
  getTemplateById,
} from './WordProblemGenerator';
import {
  saveUserProblem,
  postToForum,
  loadUserProblems,
} from '@/lib/wordProblems';
import { useAuth } from '@/contexts/AuthContext';
import { createAuthUserId } from '@/lib/syncProgress';
import { useAssessmentStore } from '@/stores/assessmentStore';

interface WordProblemCreatorProps {
  onClose?: () => void;
}

export function WordProblemCreator({ onClose }: WordProblemCreatorProps) {
  const { user, authMethod } = useAuth();
  const { bestGradeLevel } = useAssessmentStore();
  
  // Determine difficulty level based on assessment or default to 1
  const defaultLevel = useMemo(() => {
    if (bestGradeLevel > 0) {
      return Math.max(1, Math.min(10, Math.floor(bestGradeLevel)));
    }
    return 1;
  }, [bestGradeLevel]);

  const [selectedLevel, setSelectedLevel] = useState(defaultLevel);
  const [selectedTemplate, setSelectedTemplate] = useState<WordProblemTemplate | null>(null);
  const [customWords, setCustomWords] = useState<CustomWords>({});
  const [wordProblem, setWordProblem] = useState<WordProblem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savedProblems, setSavedProblems] = useState<any[]>([]);

  // Load available templates for selected level
  const availableTemplates = useMemo(() => {
    return getTemplatesAtOrAboveLevel(selectedLevel);
  }, [selectedLevel]);

  // Load saved problems
  useEffect(() => {
    async function loadSaved() {
      if (!user || !authMethod) return;
      try {
        const userId = createAuthUserId(authMethod, user.id);
        if (!userId) return;
        const result = await loadUserProblems(userId);
        if (result.success && result.problems) {
          setSavedProblems(result.problems);
        } else if (result.error) {
          // Silently handle errors (table might not exist yet)
          console.warn('Could not load saved problems:', result.error);
        }
      } catch (err) {
        // Silently handle errors
        console.warn('Error loading saved problems:', err);
      }
    }
    loadSaved();
  }, [user, authMethod]);

  // Initialize with first template when level changes
  useEffect(() => {
    if (availableTemplates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(availableTemplates[0]);
      initializeCustomWords(availableTemplates[0]);
    }
  }, [availableTemplates, selectedTemplate]);

  // Initialize custom words when template changes
  const initializeCustomWords = (template: WordProblemTemplate) => {
    const words: CustomWords = {};
    
    // Initialize name placeholders
    for (let i = 1; i <= template.placeholders.names; i++) {
      if (!customWords[`name${i}`]) {
        words[`name${i}`] = '';
      } else {
        words[`name${i}`] = customWords[`name${i}`];
      }
    }
    
    // Initialize noun placeholders
    for (let i = 1; i <= template.placeholders.nouns; i++) {
      if (!customWords[`noun${i}`]) {
        words[`noun${i}`] = '';
      } else {
        words[`noun${i}`] = customWords[`noun${i}`];
      }
    }
    
    // Initialize adjective placeholders
    for (let i = 1; i <= template.placeholders.adjectives; i++) {
      if (!customWords[`adjective${i}`]) {
        words[`adjective${i}`] = '';
      } else {
        words[`adjective${i}`] = customWords[`adjective${i}`];
      }
    }
    
    setCustomWords(words);
    setWordProblem(null);
  };

  // Generate problem when template or words change
  const handleGenerate = () => {
    if (!selectedTemplate) return;
    
    // Check if all required words are filled
    const requiredWords = Object.keys(customWords).filter(key => {
      if (key.startsWith('name') && selectedTemplate.placeholders.names > 0) {
        const num = parseInt(key.replace('name', ''));
        return num <= selectedTemplate.placeholders.names;
      }
      if (key.startsWith('noun') && selectedTemplate.placeholders.nouns > 0) {
        const num = parseInt(key.replace('noun', ''));
        return num <= selectedTemplate.placeholders.nouns;
      }
      if (key.startsWith('adjective') && selectedTemplate.placeholders.adjectives > 0) {
        const num = parseInt(key.replace('adjective', ''));
        return num <= selectedTemplate.placeholders.adjectives;
      }
      return false;
    });

    const allFilled = requiredWords.every(key => customWords[key]?.trim() !== '');
    
    if (!allFilled) {
      setMessage({ type: 'error', text: 'Please fill in all the words!' });
      return;
    }

    setIsGenerating(true);
    const problem = generateWordProblem(selectedTemplate, customWords);
    setWordProblem(problem);
    setIsGenerating(false);
    setMessage(null);
  };

  // Regenerate with new numbers
  const handleRegenerate = () => {
    if (!selectedTemplate || !wordProblem) return;
    const problem = generateWordProblem(selectedTemplate, customWords, true);
    setWordProblem(problem);
  };

  // Save problem
  const handleSave = async () => {
    if (!user || !authMethod || !selectedTemplate || !wordProblem) return;
    
    const userId = createAuthUserId(authMethod, user.id);
    if (!userId) return;
    const result = await saveUserProblem(
      userId,
      selectedTemplate.id,
      customWords,
      selectedLevel
    );

    if (result.success) {
      setMessage({ type: 'success', text: 'Problem saved!' });
      // Reload saved problems
      const loadResult = await loadUserProblems(userId);
      if (loadResult.success && loadResult.problems) {
        setSavedProblems(loadResult.problems);
      }
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to save' });
    }
  };

  // Post to forum
  const handlePostToForum = async () => {
    if (!user || !authMethod || !selectedTemplate || !wordProblem) return;
    
    const userId = createAuthUserId(authMethod, user.id);
    if (!userId) return;
    const result = await postToForum(
      userId,
      selectedTemplate.id,
      customWords,
      selectedLevel
    );

    if (result.success) {
      setMessage({ type: 'success', text: 'Posted to forum!' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to post' });
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
          📝 CREATE WORD PROBLEM
        </h2>
        <p className="font-lcd text-gray-400 text-sm">
          Fill in names, nouns, and adjectives. We'll generate the numbers!
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

      {/* Difficulty Level Selector */}
      <PixelCard variant="glass" padding="md">
        <h3 className="font-pixel text-ocean-blue text-xs mb-3">DIFFICULTY LEVEL</h3>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(level => (
            <button
              key={level}
              onClick={() => {
                setSelectedLevel(level);
                setSelectedTemplate(null);
                setWordProblem(null);
              }}
              className={`
                px-3 py-2 font-pixel text-xs border-4 transition-all
                ${selectedLevel === level
                  ? 'bg-foamy-green text-pixel-black border-pixel-black'
                  : 'bg-pixel-shadow text-gray-300 border-pixel-shadow hover:border-ocean-blue'}
              `}
              style={{ boxShadow: selectedLevel === level ? 'inset 2px 2px 0px rgba(0,0,0,0.3)' : '3px 3px 0px #1a1a1a' }}
            >
              Level {level}
            </button>
          ))}
        </div>
        {bestGradeLevel > 0 && (
          <p className="font-lcd text-gray-500 text-xs mt-2">
            Your assessment level: {bestGradeLevel.toFixed(1)} • Recommended: Level {defaultLevel}
          </p>
        )}
      </PixelCard>

      {/* Template Selector */}
      {availableTemplates.length > 0 && (
        <PixelCard variant="glass" padding="md">
          <h3 className="font-pixel text-ocean-blue text-xs mb-3">PROBLEM TYPE</h3>
          <select
            value={selectedTemplate?.id || ''}
            onChange={(e) => {
              const template = availableTemplates.find(t => t.id === e.target.value);
              if (template) {
                setSelectedTemplate(template);
                initializeCustomWords(template);
              }
            }}
            className="w-full px-3 py-2 bg-pixel-black border-4 border-pixel-shadow text-white font-lcd focus:border-foamy-green outline-none"
          >
            {availableTemplates.map(template => (
              <option key={template.id} value={template.id}>
                {template.templateName} (Level {template.difficultyLevel})
              </option>
            ))}
          </select>
        </PixelCard>
      )}

      {/* Custom Words Input */}
      {selectedTemplate && (
        <PixelCard variant="glass" padding="md">
          <h3 className="font-pixel text-ocean-blue text-xs mb-3">FILL IN THE WORDS</h3>
          <div className="space-y-3">
            {/* Names */}
            {selectedTemplate.placeholders.names > 0 && (
              <div>
                <p className="font-lcd text-gray-400 text-xs mb-2">Names:</p>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: selectedTemplate.placeholders.names }, (_, i) => i + 1).map(num => (
                    <input
                      key={`name${num}`}
                      type="text"
                      value={customWords[`name${num}`] || ''}
                      onChange={(e) => setCustomWords({ ...customWords, [`name${num}`]: e.target.value })}
                      placeholder={`Name ${num}`}
                      className="px-3 py-2 bg-pixel-black border-4 border-pixel-shadow text-white font-lcd focus:border-foamy-green outline-none"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Nouns */}
            {selectedTemplate.placeholders.nouns > 0 && (
              <div>
                <p className="font-lcd text-gray-400 text-xs mb-2">Nouns:</p>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: selectedTemplate.placeholders.nouns }, (_, i) => i + 1).map(num => (
                    <input
                      key={`noun${num}`}
                      type="text"
                      value={customWords[`noun${num}`] || ''}
                      onChange={(e) => setCustomWords({ ...customWords, [`noun${num}`]: e.target.value })}
                      placeholder={`Noun ${num} (e.g., apples, books)`}
                      className="px-3 py-2 bg-pixel-black border-4 border-pixel-shadow text-white font-lcd focus:border-foamy-green outline-none"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Adjectives */}
            {selectedTemplate.placeholders.adjectives > 0 && (
              <div>
                <p className="font-lcd text-gray-400 text-xs mb-2">Adjectives:</p>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: selectedTemplate.placeholders.adjectives }, (_, i) => i + 1).map(num => (
                    <input
                      key={`adjective${num}`}
                      type="text"
                      value={customWords[`adjective${num}`] || ''}
                      onChange={(e) => setCustomWords({ ...customWords, [`adjective${num}`]: e.target.value })}
                      placeholder={`Adjective ${num} (e.g., red, big)`}
                      className="px-3 py-2 bg-pixel-black border-4 border-pixel-shadow text-white font-lcd focus:border-foamy-green outline-none"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </PixelCard>
      )}

      {/* Generate Button */}
      {selectedTemplate && (
        <div className="flex gap-2">
          <PixelButton
            variant="primary"
            size="md"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex-1"
          >
            {isGenerating ? 'GENERATING...' : 'GENERATE PROBLEM'}
          </PixelButton>
          {wordProblem && (
            <PixelButton
              variant="secondary"
              size="md"
              icon={RefreshCw}
              onClick={handleRegenerate}
              title="Generate new numbers"
            >
              NEW NUMBERS
            </PixelButton>
          )}
        </div>
      )}

      {/* Generated Problem */}
      {wordProblem && (
        <PixelCard variant="glass" padding="lg">
          <div className="space-y-4">
            <div>
              <h3 className="font-pixel text-foamy-green text-xs mb-2">YOUR WORD PROBLEM:</h3>
              <p className="font-lcd text-white text-lg leading-relaxed">
                {wordProblem.question}
              </p>
            </div>

            <div className="border-t-4 border-pixel-shadow pt-4">
              <div className="flex gap-2">
                <PixelButton
                  variant="success"
                  size="sm"
                  icon={Save}
                  onClick={handleSave}
                  disabled={!user}
                >
                  SAVE
                </PixelButton>
                <PixelButton
                  variant="primary"
                  size="sm"
                  icon={Share2}
                  onClick={handlePostToForum}
                  disabled={!user}
                >
                  POST TO FORUM
                </PixelButton>
              </div>
              {!user && (
                <p className="font-lcd text-gray-500 text-xs mt-2">
                  Sign in to save or share your problems!
                </p>
              )}
            </div>
          </div>
        </PixelCard>
      )}

      {/* Saved Problems Count */}
      {savedProblems.length > 0 && (
        <PixelCard variant="glass" padding="sm">
          <p className="font-lcd text-gray-400 text-xs text-center">
            You have {savedProblems.length} saved problem{savedProblems.length !== 1 ? 's' : ''}
          </p>
        </PixelCard>
      )}
    </div>
  );
}

