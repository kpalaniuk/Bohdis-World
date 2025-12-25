import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AssessmentResult {
  date: string;
  score: number;
  grade: number;
  level: number;
  questionsAnswered: number;
  correctAnswers: number;
  averageResponseTime: number;
}

interface AssessmentState {
  // User's last/starting level
  lastLevel: number;
  // History of assessments
  assessmentHistory: AssessmentResult[];
  // High score
  highScore: number;
  bestGrade: number;
  // Total assessments taken
  totalAssessments: number;
  
  // Actions
  setLastLevel: (level: number) => void;
  addAssessmentResult: (result: AssessmentResult) => void;
  resetAssessments: () => void;
}

export const useAssessmentStore = create<AssessmentState>()(
  persist(
    (set, get) => ({
      lastLevel: 1,
      assessmentHistory: [],
      highScore: 0,
      bestGrade: 0,
      totalAssessments: 0,

      setLastLevel: (level: number) => {
        set({ lastLevel: Math.max(1, Math.min(level, 10)) });
      },

      addAssessmentResult: (result: AssessmentResult) => {
        const { assessmentHistory, highScore, bestGrade, totalAssessments, lastLevel } = get();
        
        // Keep last 20 assessments
        const newHistory = [result, ...assessmentHistory].slice(0, 20);
        
        // Update high score and best grade
        const newHighScore = Math.max(highScore, result.score);
        const newBestGrade = Math.max(bestGrade, result.grade);
        
        // Determine new starting level based on performance
        // If grade > 85, increase level; if < 40, decrease
        let newLevel = lastLevel;
        if (result.grade >= 85 && lastLevel < 10) {
          newLevel = Math.min(10, lastLevel + 1);
        } else if (result.grade < 40 && lastLevel > 1) {
          newLevel = Math.max(1, lastLevel - 1);
        }

        set({
          assessmentHistory: newHistory,
          highScore: newHighScore,
          bestGrade: newBestGrade,
          totalAssessments: totalAssessments + 1,
          lastLevel: newLevel,
        });
      },

      resetAssessments: () => {
        set({
          lastLevel: 1,
          assessmentHistory: [],
          highScore: 0,
          bestGrade: 0,
          totalAssessments: 0,
        });
      },
    }),
    {
      name: 'bohdi-math-assessment',
    }
  )
);

