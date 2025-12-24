'use client';

import { GradeLevel, GRADE_CONFIG } from './ProblemGenerator';

interface GradeSelectorProps {
  selected: GradeLevel;
  onSelect: (level: GradeLevel) => void;
}

export function GradeSelector({ selected, onSelect }: GradeSelectorProps) {
  const levels: GradeLevel[] = ['easy', 'medium', 'hard', 'advanced', 'calculus'];

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {levels.map((level) => {
        const config = GRADE_CONFIG[level];
        const isSelected = selected === level;

        return (
          <button
            key={level}
            onClick={() => onSelect(level)}
            className={`
              flex flex-col items-center
              px-4 py-3
              font-pixel text-xs
              border-4 border-pixel-black
              transition-all
              min-w-[100px]
              ${isSelected 
                ? 'translate-x-0.5 translate-y-0.5' 
                : 'hover:brightness-110'
              }
            `}
            style={{
              backgroundColor: isSelected ? config.color : '#2d2d2d',
              color: isSelected ? '#1a1a1a' : config.color,
              boxShadow: isSelected 
                ? 'inset 2px 2px 0px rgba(0,0,0,0.3)' 
                : `4px 4px 0px #1a1a1a`,
            }}
          >
            <span className="text-sm">{config.label}</span>
            <span className="text-[10px] opacity-80 mt-1">{config.grades}</span>
            <div 
              className="flex items-center gap-1 mt-2 px-2 py-0.5"
              style={{ 
                backgroundColor: isSelected ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)',
                borderRadius: '2px',
              }}
            >
              <span className="text-[10px]">+{config.coins}</span>
              <span className="text-[8px]">🪙</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default GradeSelector;

