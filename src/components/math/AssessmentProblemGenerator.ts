// Assessment-specific problem generator with progressive difficulty levels 1-10

export interface AssessmentProblem {
  question: string;
  answer: number | string;
  displayAnswer: string;
  type: string;
  level: number;
  isMultipleChoice: boolean;
  choices?: string[];
  correctChoiceIndex?: number;
  basePoints: number;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateWrongAnswers(correct: number, count: number, minOffset: number = 1): number[] {
  const wrongs: Set<number> = new Set();
  
  while (wrongs.size < count) {
    const offset = randomInt(-10, 10);
    if (offset !== 0) {
      const wrong = correct + offset;
      if (wrong !== correct && !wrongs.has(wrong)) {
        wrongs.add(wrong);
      }
    }
  }
  
  return Array.from(wrongs);
}

// Level 1-2: Simple addition and subtraction
function generateLevel1Problem(): AssessmentProblem {
  const a = randomInt(1, 10);
  const b = randomInt(1, 10);
  return {
    question: `${a} + ${b}`,
    answer: a + b,
    displayAnswer: String(a + b),
    type: 'addition',
    level: 1,
    isMultipleChoice: false,
    basePoints: 10,
  };
}

function generateLevel2Problem(): AssessmentProblem {
  const a = randomInt(5, 20);
  const b = randomInt(1, a);
  return {
    question: `${a} - ${b}`,
    answer: a - b,
    displayAnswer: String(a - b),
    type: 'subtraction',
    level: 2,
    isMultipleChoice: false,
    basePoints: 20,
  };
}

// Level 3-4: Multiplication and division
function generateLevel3Problem(): AssessmentProblem {
  const a = randomInt(2, 12);
  const b = randomInt(2, 12);
  return {
    question: `${a} × ${b}`,
    answer: a * b,
    displayAnswer: String(a * b),
    type: 'multiplication',
    level: 3,
    isMultipleChoice: false,
    basePoints: 30,
  };
}

function generateLevel4Problem(): AssessmentProblem {
  const b = randomInt(2, 12);
  const answer = randomInt(2, 12);
  const a = b * answer;
  return {
    question: `${a} ÷ ${b}`,
    answer: answer,
    displayAnswer: String(answer),
    type: 'division',
    level: 4,
    isMultipleChoice: false,
    basePoints: 40,
  };
}

// Level 5: Basic algebra
function generateLevel5Problem(): AssessmentProblem {
  const answer = randomInt(1, 15);
  const b = randomInt(2, 10);
  const c = answer + b;
  return {
    question: `x + ${b} = ${c}, x = ?`,
    answer: answer,
    displayAnswer: String(answer),
    type: 'algebra',
    level: 5,
    isMultipleChoice: false,
    basePoints: 50,
  };
}

// Level 6+: Multiple choice starts here
function generateLevel6Problem(): AssessmentProblem {
  const types = ['percentage', 'multiplyAlgebra'];
  const type = types[randomInt(0, types.length - 1)];
  
  if (type === 'percentage') {
    const percent = [10, 20, 25, 50][randomInt(0, 3)];
    const base = randomInt(2, 10) * (100 / percent);
    const answer = (percent / 100) * base;
    
    const wrongs = generateWrongAnswers(answer, 3);
    const allChoices = shuffleArray([answer, ...wrongs]);
    
    return {
      question: `What is ${percent}% of ${base}?`,
      answer: answer,
      displayAnswer: String(answer),
      type: 'percentage',
      level: 6,
      isMultipleChoice: true,
      choices: allChoices.map(String),
      correctChoiceIndex: allChoices.indexOf(answer),
      basePoints: 60,
    };
  } else {
    // 2x = 10 type
    const answer = randomInt(2, 10);
    const multiplier = randomInt(2, 5);
    const result = answer * multiplier;
    
    const wrongs = generateWrongAnswers(answer, 3);
    const allChoices = shuffleArray([answer, ...wrongs]);
    
    return {
      question: `${multiplier}x = ${result}, x = ?`,
      answer: answer,
      displayAnswer: String(answer),
      type: 'multiplyAlgebra',
      level: 6,
      isMultipleChoice: true,
      choices: allChoices.map(String),
      correctChoiceIndex: allChoices.indexOf(answer),
      basePoints: 60,
    };
  }
}

function generateLevel7Problem(): AssessmentProblem {
  const types = ['exponent', 'squareRoot'];
  const type = types[randomInt(0, types.length - 1)];
  
  if (type === 'exponent') {
    const base = randomInt(2, 5);
    const exp = randomInt(2, 4);
    const answer = Math.pow(base, exp);
    
    const wrongs = generateWrongAnswers(answer, 3);
    const allChoices = shuffleArray([answer, ...wrongs]);
    
    return {
      question: `${base}^${exp} = ?`,
      answer: answer,
      displayAnswer: String(answer),
      type: 'exponent',
      level: 7,
      isMultipleChoice: true,
      choices: allChoices.map(String),
      correctChoiceIndex: allChoices.indexOf(answer),
      basePoints: 70,
    };
  } else {
    const answer = randomInt(2, 12);
    const n = answer * answer;
    
    const wrongs = generateWrongAnswers(answer, 3);
    const allChoices = shuffleArray([answer, ...wrongs]);
    
    return {
      question: `√${n} = ?`,
      answer: answer,
      displayAnswer: String(answer),
      type: 'squareRoot',
      level: 7,
      isMultipleChoice: true,
      choices: allChoices.map(String),
      correctChoiceIndex: allChoices.indexOf(answer),
      basePoints: 70,
    };
  }
}

function generateLevel8Problem(): AssessmentProblem {
  const types = ['quadratic', 'negativeNumbers'];
  const type = types[randomInt(0, types.length - 1)];
  
  if (type === 'quadratic') {
    // x² = 25 style
    const answer = randomInt(2, 10);
    const n = answer * answer;
    
    const wrongs = generateWrongAnswers(answer, 3);
    const allChoices = shuffleArray([answer, ...wrongs]);
    
    return {
      question: `x² = ${n}, x = ? (positive)`,
      answer: answer,
      displayAnswer: String(answer),
      type: 'quadratic',
      level: 8,
      isMultipleChoice: true,
      choices: allChoices.map(String),
      correctChoiceIndex: allChoices.indexOf(answer),
      basePoints: 80,
    };
  } else {
    const a = randomInt(-15, 15);
    const b = randomInt(-15, 15);
    const answer = a + b;
    
    const wrongs = generateWrongAnswers(answer, 3);
    const allChoices = shuffleArray([answer, ...wrongs]);
    
    return {
      question: `(${a}) + (${b}) = ?`,
      answer: answer,
      displayAnswer: String(answer),
      type: 'negativeNumbers',
      level: 8,
      isMultipleChoice: true,
      choices: allChoices.map(String),
      correctChoiceIndex: allChoices.indexOf(answer),
      basePoints: 80,
    };
  }
}

function generateLevel9Problem(): AssessmentProblem {
  const types = ['logarithm', 'trig'];
  const type = types[randomInt(0, types.length - 1)];
  
  if (type === 'logarithm') {
    const base = 2;
    const exp = randomInt(1, 6);
    const result = Math.pow(base, exp);
    
    const wrongs = generateWrongAnswers(exp, 3);
    const allChoices = shuffleArray([exp, ...wrongs]);
    
    return {
      question: `log₂(${result}) = ?`,
      answer: exp,
      displayAnswer: String(exp),
      type: 'logarithm',
      level: 9,
      isMultipleChoice: true,
      choices: allChoices.map(String),
      correctChoiceIndex: allChoices.indexOf(exp),
      basePoints: 90,
    };
  } else {
    // Common trig values
    const options = [
      { angle: 0, sin: '0', cos: '1' },
      { angle: 30, sin: '1/2', cos: '√3/2' },
      { angle: 45, sin: '√2/2', cos: '√2/2' },
      { angle: 60, sin: '√3/2', cos: '1/2' },
      { angle: 90, sin: '1', cos: '0' },
    ];
    const selected = options[randomInt(0, options.length - 1)];
    const isSin = randomInt(0, 1) === 0;
    const answer = isSin ? selected.sin : selected.cos;
    const func = isSin ? 'sin' : 'cos';
    
    // Generate wrong answers from other options
    const wrongs = options
      .filter(o => (isSin ? o.sin : o.cos) !== answer)
      .map(o => isSin ? o.sin : o.cos)
      .slice(0, 3);
    
    const allChoices = shuffleArray([answer, ...wrongs]);
    
    return {
      question: `${func}(${selected.angle}°) = ?`,
      answer: answer,
      displayAnswer: answer,
      type: 'trig',
      level: 9,
      isMultipleChoice: true,
      choices: allChoices,
      correctChoiceIndex: allChoices.indexOf(answer),
      basePoints: 90,
    };
  }
}

function generateLevel10Problem(): AssessmentProblem {
  const types = ['derivative', 'integral'];
  const type = types[randomInt(0, types.length - 1)];
  
  if (type === 'derivative') {
    const n = randomInt(2, 5);
    const coef = randomInt(1, 4);
    const newCoef = coef * n;
    const newExp = n - 1;
    
    const wrongs = generateWrongAnswers(newCoef, 3);
    const allChoices = shuffleArray([newCoef, ...wrongs]);
    
    return {
      question: `d/dx [${coef}x^${n}] = ?x^${newExp}`,
      answer: newCoef,
      displayAnswer: `${newCoef}x^${newExp}`,
      type: 'derivative',
      level: 10,
      isMultipleChoice: true,
      choices: allChoices.map(String),
      correctChoiceIndex: allChoices.indexOf(newCoef),
      basePoints: 100,
    };
  } else {
    const n = randomInt(1, 4);
    const newExp = n + 1;
    
    const wrongs = generateWrongAnswers(newExp, 3);
    const allChoices = shuffleArray([newExp, ...wrongs]);
    
    return {
      question: `∫x^${n} dx = (1/?)x^${newExp} + C`,
      answer: newExp,
      displayAnswer: `(1/${newExp})x^${newExp} + C`,
      type: 'integral',
      level: 10,
      isMultipleChoice: true,
      choices: allChoices.map(String),
      correctChoiceIndex: allChoices.indexOf(newExp),
      basePoints: 100,
    };
  }
}

export function generateAssessmentProblem(level: number): AssessmentProblem {
  // Clamp level between 1 and 10
  const clampedLevel = Math.max(1, Math.min(10, level));
  
  switch (clampedLevel) {
    case 1:
      return generateLevel1Problem();
    case 2:
      return generateLevel2Problem();
    case 3:
      return generateLevel3Problem();
    case 4:
      return generateLevel4Problem();
    case 5:
      return generateLevel5Problem();
    case 6:
      return generateLevel6Problem();
    case 7:
      return generateLevel7Problem();
    case 8:
      return generateLevel8Problem();
    case 9:
      return generateLevel9Problem();
    case 10:
      return generateLevel10Problem();
    default:
      return generateLevel1Problem();
  }
}

export function checkAssessmentAnswer(
  problem: AssessmentProblem,
  userAnswer: string | number
): boolean {
  if (problem.isMultipleChoice && typeof userAnswer === 'number') {
    return userAnswer === problem.correctChoiceIndex;
  }
  
  const userStr = String(userAnswer).trim().toLowerCase();
  const correctStr = String(problem.answer).toLowerCase();
  
  // Try numeric comparison
  const userNum = parseFloat(userStr);
  const correctNum = parseFloat(correctStr);
  
  if (!isNaN(userNum) && !isNaN(correctNum)) {
    return Math.abs(userNum - correctNum) < 0.01;
  }
  
  // String comparison for trig values etc.
  return userStr === correctStr;
}

export function calculateSpeedBonus(responseTimeMs: number): number {
  // Fast answer (under 2 seconds): 2x multiplier
  // Medium answer (2-5 seconds): 1.5x multiplier
  // Slow answer (5-10 seconds): 1x multiplier
  // Very slow (over 10 seconds): 0.5x multiplier
  
  if (responseTimeMs < 2000) return 2.0;
  if (responseTimeMs < 5000) return 1.5;
  if (responseTimeMs < 10000) return 1.0;
  return 0.5;
}

export function calculateGrade(
  totalScore: number,
  questionsAnswered: number,
  correctAnswers: number,
  averageLevel: number
): number {
  if (questionsAnswered === 0) return 0;
  
  // Accuracy component (40% weight)
  const accuracy = correctAnswers / questionsAnswered;
  const accuracyScore = accuracy * 40;
  
  // Level achievement component (30% weight)
  // Level 10 = 30 points, Level 1 = 3 points
  const levelScore = (averageLevel / 10) * 30;
  
  // Speed/score component (30% weight)
  // Max expected score would be about 200 points per question at max speed and level
  const maxExpectedScore = questionsAnswered * 200;
  const scoreRatio = Math.min(1, totalScore / maxExpectedScore);
  const speedScore = scoreRatio * 30;
  
  const finalGrade = accuracyScore + levelScore + speedScore;
  
  // Round to nearest hundredth
  return Math.round(finalGrade * 100) / 100;
}

export const LEVEL_NAMES: Record<number, string> = {
  1: 'Addition Basics',
  2: 'Subtraction Skills',
  3: 'Multiplication Tables',
  4: 'Division Mastery',
  5: 'Basic Algebra',
  6: 'Percentages & Variables',
  7: 'Exponents & Roots',
  8: 'Quadratics & Negatives',
  9: 'Logarithms & Trig',
  10: 'Calculus',
};

