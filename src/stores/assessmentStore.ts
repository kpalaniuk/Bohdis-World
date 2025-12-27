import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AssessmentResult {
  date: string;
  gradeLevel: number; // e.g., 3.45 = high 3rd grade level
  questionsAnswered: number;
  correctAnswers: number;
  maxLevel: number;
  averageResponseTime: number;
}

interface AssessmentState {
  // User's last/starting level
  lastLevel: number;
  // History of assessments
  assessmentHistory: AssessmentResult[];
  // Best grade level achieved
  bestGradeLevel: number;
  // Total assessments taken
  totalAssessments: number;
  // Total questions answered across all assessments
  totalQuestionsAnswered: number;
  // Total correct answers across all assessments
  totalCorrectAnswers: number;
  // Current streak (consecutive days playing)
  currentStreak: number;
  // Last play date
  lastPlayDate: string | null;
  // Longest streak ever
  longestStreak: number;
  
  // Actions
  setLastLevel: (level: number) => void;
  addAssessmentResult: (result: AssessmentResult) => void;
  resetAssessments: () => void;
  updateStreak: () => { isNewDay: boolean; streakBonus: number };
}

function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

function isConsecutiveDay(lastDate: string | null): boolean {
  if (!lastDate) return false;
  const last = new Date(lastDate);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return getDateString(last) === getDateString(yesterday);
}

function isSameDay(lastDate: string | null): boolean {
  if (!lastDate) return false;
  return getDateString(new Date(lastDate)) === getDateString();
}

export const useAssessmentStore = create<AssessmentState>()(
  persist(
    (set, get) => ({
      lastLevel: 1,
      assessmentHistory: [],
      bestGradeLevel: 1.0,
      totalAssessments: 0,
      totalQuestionsAnswered: 0,
      totalCorrectAnswers: 0,
      currentStreak: 0,
      lastPlayDate: null,
      longestStreak: 0,

      setLastLevel: (level: number) => {
        set({ lastLevel: Math.max(1, Math.min(level, 10)) });
      },

      updateStreak: () => {
        const { currentStreak, lastPlayDate, longestStreak } = get();
        const today = getDateString();
        
        // If already played today, no bonus
        if (isSameDay(lastPlayDate)) {
          return { isNewDay: false, streakBonus: 0 };
        }
        
        let newStreak = 1;
        
        // If played yesterday, continue streak
        if (isConsecutiveDay(lastPlayDate)) {
          newStreak = currentStreak + 1;
        }
        
        // Calculate streak bonus (more days = more coins!)
        const streakBonus = Math.min(newStreak * 2, 20); // Cap at 20 bonus coins
        
        const newLongestStreak = Math.max(longestStreak, newStreak);
        
        set({
          currentStreak: newStreak,
          lastPlayDate: today,
          longestStreak: newLongestStreak,
        });
        
        return { isNewDay: true, streakBonus };
      },

      addAssessmentResult: (result: AssessmentResult) => {
        const { assessmentHistory, bestGradeLevel, totalAssessments, totalQuestionsAnswered, totalCorrectAnswers } = get();
        
        // Keep last 50 assessments
        const newHistory = [result, ...assessmentHistory].slice(0, 50);
        
        // Update best grade level
        const newBestGradeLevel = Math.max(bestGradeLevel, result.gradeLevel);
        
        // Determine new starting level based on grade level achieved
        // Round down the grade level to get the recommended starting level
        const newLevel = Math.max(1, Math.min(10, Math.floor(result.gradeLevel)));

        set({
          assessmentHistory: newHistory,
          bestGradeLevel: newBestGradeLevel,
          totalAssessments: totalAssessments + 1,
          totalQuestionsAnswered: totalQuestionsAnswered + result.questionsAnswered,
          totalCorrectAnswers: totalCorrectAnswers + result.correctAnswers,
          lastLevel: newLevel,
        });
      },

      resetAssessments: () => {
        set({
          lastLevel: 1,
          assessmentHistory: [],
          bestGradeLevel: 1.0,
          totalAssessments: 0,
          totalQuestionsAnswered: 0,
          totalCorrectAnswers: 0,
          currentStreak: 0,
          lastPlayDate: null,
          longestStreak: 0,
        });
      },
    }),
    {
      name: 'bohdi-math-assessment',
    }
  )
);
