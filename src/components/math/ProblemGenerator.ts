export type GradeLevel = 'easy' | 'medium' | 'hard' | 'advanced' | 'calculus';

export interface Problem {
  question: string;
  answer: number | string;
  displayAnswer: string;
  hint?: string;
  type: string;
}

export const GRADE_CONFIG: Record<GradeLevel, { label: string; grades: string; coins: number; color: string }> = {
  easy: { label: 'Easy', grades: 'K-2', coins: 1, color: '#98D8AA' },
  medium: { label: 'Medium', grades: '3-5', coins: 2, color: '#4A90D9' },
  hard: { label: 'Hard', grades: '6-8', coins: 3, color: '#FFD700' },
  advanced: { label: 'Advanced', grades: '9-12', coins: 5, color: '#FF6B4A' },
  calculus: { label: 'Calculus', grades: 'College', coins: 10, color: '#FF00FF' },
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateEasyProblem(): Problem {
  const types = ['addition', 'subtraction', 'counting'];
  const type = types[randomInt(0, types.length - 1)];

  switch (type) {
    case 'addition': {
      const a = randomInt(1, 10);
      const b = randomInt(1, 10);
      return {
        question: `${a} + ${b} = ?`,
        answer: a + b,
        displayAnswer: String(a + b),
        type: 'addition',
        hint: 'Try counting on your fingers!',
      };
    }
    case 'subtraction': {
      const a = randomInt(5, 15);
      const b = randomInt(1, a);
      return {
        question: `${a} - ${b} = ?`,
        answer: a - b,
        displayAnswer: String(a - b),
        type: 'subtraction',
        hint: 'Start at the big number and count backwards!',
      };
    }
    case 'counting': {
      const start = randomInt(1, 10);
      const missing = randomInt(1, 3);
      const sequence = [start, start + 1, start + 2, start + 3, start + 4];
      sequence[missing] = '?' as unknown as number;
      return {
        question: `What number is missing? ${sequence.join(', ')}`,
        answer: start + missing,
        displayAnswer: String(start + missing),
        type: 'counting',
        hint: 'Count up one at a time!',
      };
    }
    default:
      return generateEasyProblem();
  }
}

function generateMediumProblem(): Problem {
  const types = ['multiplication', 'division', 'fraction'];
  const type = types[randomInt(0, types.length - 1)];

  switch (type) {
    case 'multiplication': {
      const a = randomInt(2, 12);
      const b = randomInt(2, 12);
      return {
        question: `${a} × ${b} = ?`,
        answer: a * b,
        displayAnswer: String(a * b),
        type: 'multiplication',
        hint: `Think of ${a} groups of ${b}`,
      };
    }
    case 'division': {
      const b = randomInt(2, 10);
      const answer = randomInt(2, 10);
      const a = b * answer;
      return {
        question: `${a} ÷ ${b} = ?`,
        answer: answer,
        displayAnswer: String(answer),
        type: 'division',
        hint: `How many groups of ${b} fit into ${a}?`,
      };
    }
    case 'fraction': {
      const denominator = randomInt(2, 8);
      const numerator1 = randomInt(1, denominator - 1);
      const numerator2 = randomInt(1, denominator - numerator1);
      return {
        question: `${numerator1}/${denominator} + ${numerator2}/${denominator} = ?/${denominator}`,
        answer: numerator1 + numerator2,
        displayAnswer: `${numerator1 + numerator2}/${denominator}`,
        type: 'fraction',
        hint: 'When denominators are the same, just add the numerators!',
      };
    }
    default:
      return generateMediumProblem();
  }
}

function generateHardProblem(): Problem {
  const types = ['algebra', 'percentage', 'negative', 'geometry'];
  const type = types[randomInt(0, types.length - 1)];

  switch (type) {
    case 'algebra': {
      const answer = randomInt(1, 20);
      const b = randomInt(1, 10);
      const c = answer + b;
      return {
        question: `x + ${b} = ${c}. What is x?`,
        answer: answer,
        displayAnswer: String(answer),
        type: 'algebra',
        hint: 'Subtract the same number from both sides!',
      };
    }
    case 'percentage': {
      const percent = [10, 20, 25, 50][randomInt(0, 3)];
      const base = randomInt(2, 10) * (100 / percent);
      const answer = (percent / 100) * base;
      return {
        question: `What is ${percent}% of ${base}?`,
        answer: answer,
        displayAnswer: String(answer),
        type: 'percentage',
        hint: `${percent}% means ${percent}/100`,
      };
    }
    case 'negative': {
      const a = randomInt(-10, 10);
      const b = randomInt(-10, 10);
      return {
        question: `${a} + (${b}) = ?`,
        answer: a + b,
        displayAnswer: String(a + b),
        type: 'negative',
        hint: 'Adding a negative is like subtracting!',
      };
    }
    case 'geometry': {
      const shapes = ['rectangle', 'triangle'];
      const shape = shapes[randomInt(0, 1)];
      if (shape === 'rectangle') {
        const w = randomInt(2, 10);
        const h = randomInt(2, 10);
        return {
          question: `Rectangle: width=${w}, height=${h}. Area = ?`,
          answer: w * h,
          displayAnswer: String(w * h),
          type: 'geometry',
          hint: 'Area of rectangle = width × height',
        };
      } else {
        const b = randomInt(2, 10) * 2;
        const h = randomInt(2, 10);
        return {
          question: `Triangle: base=${b}, height=${h}. Area = ?`,
          answer: (b * h) / 2,
          displayAnswer: String((b * h) / 2),
          type: 'geometry',
          hint: 'Area of triangle = (base × height) ÷ 2',
        };
      }
    }
    default:
      return generateHardProblem();
  }
}

function generateAdvancedProblem(): Problem {
  const types = ['quadratic', 'trig', 'logarithm', 'exponent'];
  const type = types[randomInt(0, types.length - 1)];

  switch (type) {
    case 'quadratic': {
      // Simple quadratic: x² = n
      const answer = randomInt(2, 10);
      const n = answer * answer;
      return {
        question: `x² = ${n}. Find positive x.`,
        answer: answer,
        displayAnswer: String(answer),
        type: 'quadratic',
        hint: 'What number times itself equals the right side?',
      };
    }
    case 'trig': {
      const angles = [0, 30, 45, 60, 90];
      const angle = angles[randomInt(0, angles.length - 1)];
      const sinValues: Record<number, string> = { 0: '0', 30: '0.5', 45: '0.707', 60: '0.866', 90: '1' };
      return {
        question: `sin(${angle}°) = ? (to 3 decimals)`,
        answer: sinValues[angle],
        displayAnswer: sinValues[angle],
        type: 'trig',
        hint: 'Remember the unit circle!',
      };
    }
    case 'logarithm': {
      const bases = [2, 10];
      const base = bases[randomInt(0, 1)];
      const exp = randomInt(1, 4);
      const result = Math.pow(base, exp);
      return {
        question: `log${base === 10 ? '' : '₂'}(${result}) = ?`,
        answer: exp,
        displayAnswer: String(exp),
        type: 'logarithm',
        hint: `${base} to what power equals ${result}?`,
      };
    }
    case 'exponent': {
      const base = randomInt(2, 5);
      const exp = randomInt(2, 4);
      return {
        question: `${base}^${exp} = ?`,
        answer: Math.pow(base, exp),
        displayAnswer: String(Math.pow(base, exp)),
        type: 'exponent',
        hint: `Multiply ${base} by itself ${exp} times`,
      };
    }
    default:
      return generateAdvancedProblem();
  }
}

function generateCalculusProblem(): Problem {
  const types = ['derivative', 'integral', 'limit'];
  const type = types[randomInt(0, types.length - 1)];

  switch (type) {
    case 'derivative': {
      const n = randomInt(2, 5);
      const coef = randomInt(1, 5);
      const newCoef = coef * n;
      const newExp = n - 1;
      return {
        question: `d/dx [${coef}x^${n}] = ?x^${newExp}`,
        answer: newCoef,
        displayAnswer: `${newCoef}x^${newExp}`,
        type: 'derivative',
        hint: 'Power rule: bring down the exponent and reduce by 1',
      };
    }
    case 'integral': {
      const n = randomInt(1, 4);
      const newExp = n + 1;
      return {
        question: `∫x^${n} dx = (1/?)x^${newExp} + C`,
        answer: newExp,
        displayAnswer: `(1/${newExp})x^${newExp} + C`,
        type: 'integral',
        hint: 'Reverse power rule: add 1 to exponent and divide',
      };
    }
    case 'limit': {
      // Simple limit: lim(x→a) x = a
      const a = randomInt(1, 10);
      return {
        question: `lim(x→${a}) x = ?`,
        answer: a,
        displayAnswer: String(a),
        type: 'limit',
        hint: 'What does x approach as it gets close to the value?',
      };
    }
    default:
      return generateCalculusProblem();
  }
}

export function generateProblem(level: GradeLevel): Problem {
  switch (level) {
    case 'easy':
      return generateEasyProblem();
    case 'medium':
      return generateMediumProblem();
    case 'hard':
      return generateHardProblem();
    case 'advanced':
      return generateAdvancedProblem();
    case 'calculus':
      return generateCalculusProblem();
    default:
      return generateEasyProblem();
  }
}

export function checkAnswer(userAnswer: string, correctAnswer: number | string): boolean {
  const userNum = parseFloat(userAnswer.trim());
  const correctNum = typeof correctAnswer === 'string' ? parseFloat(correctAnswer) : correctAnswer;

  if (isNaN(userNum)) return false;

  // Allow small floating point differences
  return Math.abs(userNum - correctNum) < 0.01;
}

