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

// EASY PROBLEMS - Many variations for K-2 level
function generateEasyProblem(): Problem {
  const types = [
    // Addition variations
    () => {
      const a = randomInt(1, 10);
      const b = randomInt(1, 10);
      return {
        question: `${a} + ${b} = ?`,
        answer: a + b,
        displayAnswer: String(a + b),
        type: 'addition',
        hint: 'Add the numbers together!',
      };
    },
    // Addition with bigger first number
    () => {
      const a = randomInt(10, 20);
      const b = randomInt(1, 5);
      return {
        question: `${a} + ${b} = ?`,
        answer: a + b,
        displayAnswer: String(a + b),
        type: 'addition',
        hint: 'Start with the bigger number and count up!',
      };
    },
    // Addition making 10
    () => {
      const a = randomInt(1, 9);
      const b = 10 - a;
      return {
        question: `${a} + ${b} = ?`,
        answer: 10,
        displayAnswer: '10',
        type: 'addition',
        hint: 'These numbers add up to 10!',
      };
    },
    // Doubles
    () => {
      const a = randomInt(1, 10);
      return {
        question: `${a} + ${a} = ?`,
        answer: a * 2,
        displayAnswer: String(a * 2),
        type: 'addition',
        hint: 'Double the number!',
      };
    },
    // Adding zero
    () => {
      const a = randomInt(1, 20);
      return {
        question: `${a} + 0 = ?`,
        answer: a,
        displayAnswer: String(a),
        type: 'addition',
        hint: 'Adding zero keeps the number the same!',
      };
    },
    // Adding one
    () => {
      const a = randomInt(1, 25);
      return {
        question: `${a} + 1 = ?`,
        answer: a + 1,
        displayAnswer: String(a + 1),
        type: 'addition',
        hint: 'Just count up one!',
      };
    },
    // Subtraction basic
    () => {
      const a = randomInt(5, 15);
      const b = randomInt(1, a);
      return {
        question: `${a} - ${b} = ?`,
        answer: a - b,
        displayAnswer: String(a - b),
        type: 'subtraction',
        hint: 'Start at the big number and count backwards!',
      };
    },
    // Subtraction from 10
    () => {
      const b = randomInt(1, 9);
      return {
        question: `10 - ${b} = ?`,
        answer: 10 - b,
        displayAnswer: String(10 - b),
        type: 'subtraction',
        hint: 'What do you add to get 10?',
      };
    },
    // Subtract one
    () => {
      const a = randomInt(2, 20);
      return {
        question: `${a} - 1 = ?`,
        answer: a - 1,
        displayAnswer: String(a - 1),
        type: 'subtraction',
        hint: 'Just count back one!',
      };
    },
    // Subtract zero
    () => {
      const a = randomInt(1, 20);
      return {
        question: `${a} - 0 = ?`,
        answer: a,
        displayAnswer: String(a),
        type: 'subtraction',
        hint: 'Taking away zero leaves the number the same!',
      };
    },
    // Counting sequence
    () => {
      const start = randomInt(1, 15);
      const missing = randomInt(1, 3);
      const sequence = [start, start + 1, start + 2, start + 3, start + 4];
      sequence[missing] = '?' as unknown as number;
      return {
        question: `What comes next? ${sequence.slice(0, 4).join(', ')}, ?`,
        answer: start + 4,
        displayAnswer: String(start + 4),
        type: 'counting',
        hint: 'Count up by 1!',
      };
    },
    // Compare numbers
    () => {
      const a = randomInt(1, 20);
      const b = randomInt(1, 20);
      const larger = Math.max(a, b);
      return {
        question: `Which is bigger: ${a} or ${b}?`,
        answer: larger,
        displayAnswer: String(larger),
        type: 'comparison',
        hint: 'The bigger number is worth more!',
      };
    },
    // Number before
    () => {
      const a = randomInt(2, 25);
      return {
        question: `What comes before ${a}?`,
        answer: a - 1,
        displayAnswer: String(a - 1),
        type: 'counting',
        hint: 'Count backwards by 1!',
      };
    },
    // Number after
    () => {
      const a = randomInt(1, 24);
      return {
        question: `What comes after ${a}?`,
        answer: a + 1,
        displayAnswer: String(a + 1),
        type: 'counting',
        hint: 'Count forward by 1!',
      };
    },
    // Simple word problem addition
    () => {
      const a = randomInt(1, 5);
      const b = randomInt(1, 5);
      return {
        question: `${a} apples + ${b} apples = ?`,
        answer: a + b,
        displayAnswer: String(a + b),
        type: 'addition',
        hint: 'Add the apples together!',
      };
    },
  ];

  return types[randomInt(0, types.length - 1)]();
}

// MEDIUM PROBLEMS - 3rd-5th grade
function generateMediumProblem(): Problem {
  const types = [
    // Multiplication tables 2-12
    () => {
      const a = randomInt(2, 12);
      const b = randomInt(2, 12);
      return {
        question: `${a} × ${b} = ?`,
        answer: a * b,
        displayAnswer: String(a * b),
        type: 'multiplication',
        hint: `Think of ${a} groups of ${b}`,
      };
    },
    // Multiply by 10
    () => {
      const a = randomInt(1, 15);
      return {
        question: `${a} × 10 = ?`,
        answer: a * 10,
        displayAnswer: String(a * 10),
        type: 'multiplication',
        hint: 'Just add a zero!',
      };
    },
    // Multiply by 5
    () => {
      const a = randomInt(1, 15);
      return {
        question: `${a} × 5 = ?`,
        answer: a * 5,
        displayAnswer: String(a * 5),
        type: 'multiplication',
        hint: 'Count by 5s!',
      };
    },
    // Multiply by 2 (doubling)
    () => {
      const a = randomInt(1, 20);
      return {
        question: `${a} × 2 = ?`,
        answer: a * 2,
        displayAnswer: String(a * 2),
        type: 'multiplication',
        hint: 'Double the number!',
      };
    },
    // Squares
    () => {
      const a = randomInt(2, 10);
      return {
        question: `${a} × ${a} = ?`,
        answer: a * a,
        displayAnswer: String(a * a),
        type: 'multiplication',
        hint: `${a} times itself!`,
      };
    },
    // Division basic
    () => {
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
    },
    // Division by 2
    () => {
      const answer = randomInt(1, 15);
      const a = answer * 2;
      return {
        question: `${a} ÷ 2 = ?`,
        answer: answer,
        displayAnswer: String(answer),
        type: 'division',
        hint: 'Split in half!',
      };
    },
    // Division by 5
    () => {
      const answer = randomInt(1, 12);
      const a = answer * 5;
      return {
        question: `${a} ÷ 5 = ?`,
        answer: answer,
        displayAnswer: String(answer),
        type: 'division',
        hint: 'Count by 5s to find the answer!',
      };
    },
    // Division by 10
    () => {
      const answer = randomInt(1, 15);
      const a = answer * 10;
      return {
        question: `${a} ÷ 10 = ?`,
        answer: answer,
        displayAnswer: String(answer),
        type: 'division',
        hint: 'Remove the zero!',
      };
    },
    // Fraction addition same denominator
    () => {
      const denominator = randomInt(2, 10);
      const numerator1 = randomInt(1, denominator - 1);
      const numerator2 = randomInt(1, denominator - numerator1);
      return {
        question: `${numerator1}/${denominator} + ${numerator2}/${denominator} = ?/${denominator}`,
        answer: numerator1 + numerator2,
        displayAnswer: `${numerator1 + numerator2}/${denominator}`,
        type: 'fraction',
        hint: 'When denominators are the same, just add the numerators!',
      };
    },
    // Multi-digit addition
    () => {
      const a = randomInt(20, 80);
      const b = randomInt(10, 50);
      return {
        question: `${a} + ${b} = ?`,
        answer: a + b,
        displayAnswer: String(a + b),
        type: 'addition',
        hint: 'Add the ones first, then the tens!',
      };
    },
    // Multi-digit subtraction
    () => {
      const a = randomInt(50, 100);
      const b = randomInt(10, a - 10);
      return {
        question: `${a} - ${b} = ?`,
        answer: a - b,
        displayAnswer: String(a - b),
        type: 'subtraction',
        hint: 'Subtract the ones first, then the tens!',
      };
    },
    // Order of operations simple
    () => {
      const a = randomInt(2, 5);
      const b = randomInt(2, 5);
      const c = randomInt(1, 10);
      return {
        question: `${a} × ${b} + ${c} = ?`,
        answer: a * b + c,
        displayAnswer: String(a * b + c),
        type: 'order of operations',
        hint: 'Multiply first, then add!',
      };
    },
    // Word problem multiplication
    () => {
      const groups = randomInt(2, 5);
      const perGroup = randomInt(2, 8);
      return {
        question: `${groups} bags with ${perGroup} apples each = ?`,
        answer: groups * perGroup,
        displayAnswer: String(groups * perGroup),
        type: 'multiplication',
        hint: 'Multiply the number of bags by apples per bag!',
      };
    },
    // Word problem division
    () => {
      const people = randomInt(2, 6);
      const total = people * randomInt(2, 8);
      return {
        question: `${total} cookies shared by ${people} kids = ?`,
        answer: total / people,
        displayAnswer: String(total / people),
        type: 'division',
        hint: 'Divide the total by the number of people!',
      };
    },
    // Rounding
    () => {
      const a = randomInt(11, 99);
      const rounded = Math.round(a / 10) * 10;
      return {
        question: `Round ${a} to the nearest 10`,
        answer: rounded,
        displayAnswer: String(rounded),
        type: 'rounding',
        hint: 'Look at the ones digit - 5 or more rounds up!',
      };
    },
  ];

  return types[randomInt(0, types.length - 1)]();
}

// HARD PROBLEMS - 6th-8th grade
function generateHardProblem(): Problem {
  const types = [
    // Basic algebra x + b = c
    () => {
      const answer = randomInt(1, 20);
      const b = randomInt(1, 15);
      const c = answer + b;
      return {
        question: `x + ${b} = ${c}. What is x?`,
        answer: answer,
        displayAnswer: String(answer),
        type: 'algebra',
        hint: 'Subtract the same number from both sides!',
      };
    },
    // Algebra x - b = c
    () => {
      const answer = randomInt(10, 30);
      const b = randomInt(1, answer - 1);
      const c = answer - b;
      return {
        question: `x - ${b} = ${c}. What is x?`,
        answer: answer,
        displayAnswer: String(answer),
        type: 'algebra',
        hint: 'Add the same number to both sides!',
      };
    },
    // Algebra 2x = n
    () => {
      const answer = randomInt(2, 15);
      const n = answer * 2;
      return {
        question: `2x = ${n}. What is x?`,
        answer: answer,
        displayAnswer: String(answer),
        type: 'algebra',
        hint: 'Divide both sides by 2!',
      };
    },
    // Algebra 3x = n
    () => {
      const answer = randomInt(2, 12);
      const n = answer * 3;
      return {
        question: `3x = ${n}. What is x?`,
        answer: answer,
        displayAnswer: String(answer),
        type: 'algebra',
        hint: 'Divide both sides by 3!',
      };
    },
    // Percentage 10%
    () => {
      const base = randomInt(2, 20) * 10;
      const answer = base / 10;
      return {
        question: `What is 10% of ${base}?`,
        answer: answer,
        displayAnswer: String(answer),
        type: 'percentage',
        hint: '10% means divide by 10!',
      };
    },
    // Percentage 50%
    () => {
      const base = randomInt(2, 20) * 2;
      const answer = base / 2;
      return {
        question: `What is 50% of ${base}?`,
        answer: answer,
        displayAnswer: String(answer),
        type: 'percentage',
        hint: '50% means half!',
      };
    },
    // Percentage 25%
    () => {
      const base = randomInt(2, 10) * 4;
      const answer = base / 4;
      return {
        question: `What is 25% of ${base}?`,
        answer: answer,
        displayAnswer: String(answer),
        type: 'percentage',
        hint: '25% means divide by 4!',
      };
    },
    // Negative addition
    () => {
      const a = randomInt(-10, 10);
      const b = randomInt(-10, 10);
      return {
        question: `${a} + (${b}) = ?`,
        answer: a + b,
        displayAnswer: String(a + b),
        type: 'negative',
        hint: 'Adding a negative is like subtracting!',
      };
    },
    // Negative subtraction
    () => {
      const a = randomInt(-10, 10);
      const b = randomInt(-10, 10);
      return {
        question: `${a} - (${b}) = ?`,
        answer: a - b,
        displayAnswer: String(a - b),
        type: 'negative',
        hint: 'Subtracting a negative is like adding!',
      };
    },
    // Rectangle area
    () => {
      const w = randomInt(2, 12);
      const h = randomInt(2, 12);
      return {
        question: `Rectangle: width=${w}, height=${h}. Area = ?`,
        answer: w * h,
        displayAnswer: String(w * h),
        type: 'geometry',
        hint: 'Area of rectangle = width × height',
      };
    },
    // Triangle area
    () => {
      const b = randomInt(2, 10) * 2;
      const h = randomInt(2, 10);
      return {
        question: `Triangle: base=${b}, height=${h}. Area = ?`,
        answer: (b * h) / 2,
        displayAnswer: String((b * h) / 2),
        type: 'geometry',
        hint: 'Area of triangle = (base × height) ÷ 2',
      };
    },
    // Perimeter
    () => {
      const w = randomInt(3, 10);
      const h = randomInt(3, 10);
      return {
        question: `Rectangle: width=${w}, height=${h}. Perimeter = ?`,
        answer: 2 * (w + h),
        displayAnswer: String(2 * (w + h)),
        type: 'geometry',
        hint: 'Perimeter = 2 × (width + height)',
      };
    },
    // Exponent basic
    () => {
      const base = randomInt(2, 5);
      const exp = 2;
      return {
        question: `${base}² = ?`,
        answer: base * base,
        displayAnswer: String(base * base),
        type: 'exponent',
        hint: 'Squared means times itself!',
      };
    },
    // Ratio simplification
    () => {
      const factor = randomInt(2, 5);
      const a = randomInt(2, 5) * factor;
      const b = randomInt(2, 5) * factor;
      const gcd = factor;
      return {
        question: `Simplify: ${a}:${b} = ?:${b / gcd}`,
        answer: a / gcd,
        displayAnswer: `${a / gcd}`,
        type: 'ratio',
        hint: 'Divide both numbers by their common factor!',
      };
    },
    // Absolute value
    () => {
      const a = randomInt(-20, -1);
      return {
        question: `|${a}| = ?`,
        answer: Math.abs(a),
        displayAnswer: String(Math.abs(a)),
        type: 'absolute value',
        hint: 'Absolute value is always positive!',
      };
    },
  ];

  return types[randomInt(0, types.length - 1)]();
}

// ADVANCED PROBLEMS - 9th-12th grade
function generateAdvancedProblem(): Problem {
  const types = [
    // Simple quadratic x² = n
    () => {
      const answer = randomInt(2, 12);
      const n = answer * answer;
      return {
        question: `x² = ${n}. Find positive x.`,
        answer: answer,
        displayAnswer: String(answer),
        type: 'quadratic',
        hint: 'What number times itself equals the right side?',
      };
    },
    // Square root
    () => {
      const answer = randomInt(2, 15);
      const n = answer * answer;
      return {
        question: `√${n} = ?`,
        answer: answer,
        displayAnswer: String(answer),
        type: 'square root',
        hint: 'What times itself equals this?',
      };
    },
    // Cube basic
    () => {
      const base = randomInt(2, 5);
      return {
        question: `${base}³ = ?`,
        answer: base * base * base,
        displayAnswer: String(base * base * base),
        type: 'exponent',
        hint: 'Cubed means times itself 3 times!',
      };
    },
    // Powers of 2
    () => {
      const exp = randomInt(2, 7);
      return {
        question: `2^${exp} = ?`,
        answer: Math.pow(2, exp),
        displayAnswer: String(Math.pow(2, exp)),
        type: 'exponent',
        hint: 'Double the previous power of 2!',
      };
    },
    // Powers of 10
    () => {
      const exp = randomInt(2, 5);
      return {
        question: `10^${exp} = ?`,
        answer: Math.pow(10, exp),
        displayAnswer: String(Math.pow(10, exp)),
        type: 'exponent',
        hint: 'Count the zeros!',
      };
    },
    // Trig sin 0, 90
    () => {
      const angles = [0, 90];
      const angle = angles[randomInt(0, 1)];
      const sinValues: Record<number, number> = { 0: 0, 90: 1 };
      return {
        question: `sin(${angle}°) = ?`,
        answer: sinValues[angle],
        displayAnswer: String(sinValues[angle]),
        type: 'trig',
        hint: 'Remember: sin(0°)=0, sin(90°)=1',
      };
    },
    // Trig cos 0, 90
    () => {
      const angles = [0, 90];
      const angle = angles[randomInt(0, 1)];
      const cosValues: Record<number, number> = { 0: 1, 90: 0 };
      return {
        question: `cos(${angle}°) = ?`,
        answer: cosValues[angle],
        displayAnswer: String(cosValues[angle]),
        type: 'trig',
        hint: 'Remember: cos(0°)=1, cos(90°)=0',
      };
    },
    // Logarithm base 2
    () => {
      const exp = randomInt(1, 6);
      const result = Math.pow(2, exp);
      return {
        question: `log₂(${result}) = ?`,
        answer: exp,
        displayAnswer: String(exp),
        type: 'logarithm',
        hint: '2 to what power equals this?',
      };
    },
    // Logarithm base 10
    () => {
      const exp = randomInt(1, 4);
      const result = Math.pow(10, exp);
      return {
        question: `log₁₀(${result}) = ?`,
        answer: exp,
        displayAnswer: String(exp),
        type: 'logarithm',
        hint: 'Count the zeros!',
      };
    },
    // Factorial
    () => {
      const n = randomInt(3, 5);
      let factorial = 1;
      for (let i = 2; i <= n; i++) factorial *= i;
      return {
        question: `${n}! = ?`,
        answer: factorial,
        displayAnswer: String(factorial),
        type: 'factorial',
        hint: `Multiply all integers from 1 to ${n}!`,
      };
    },
    // Scientific notation
    () => {
      const coef = randomInt(1, 9);
      const exp = randomInt(2, 4);
      const answer = coef * Math.pow(10, exp);
      return {
        question: `${coef} × 10^${exp} = ?`,
        answer: answer,
        displayAnswer: String(answer),
        type: 'scientific notation',
        hint: 'Move the decimal point!',
      };
    },
    // Two-step algebra
    () => {
      const answer = randomInt(2, 10);
      const multiplier = randomInt(2, 4);
      const adder = randomInt(1, 10);
      const result = answer * multiplier + adder;
      return {
        question: `${multiplier}x + ${adder} = ${result}. x = ?`,
        answer: answer,
        displayAnswer: String(answer),
        type: 'algebra',
        hint: 'Subtract first, then divide!',
      };
    },
    // Negative multiplication
    () => {
      const a = randomInt(-8, -2);
      const b = randomInt(2, 8);
      return {
        question: `(${a}) × ${b} = ?`,
        answer: a * b,
        displayAnswer: String(a * b),
        type: 'negative',
        hint: 'Negative times positive is negative!',
      };
    },
    // Two negatives
    () => {
      const a = randomInt(-8, -2);
      const b = randomInt(-8, -2);
      return {
        question: `(${a}) × (${b}) = ?`,
        answer: a * b,
        displayAnswer: String(a * b),
        type: 'negative',
        hint: 'Negative times negative is positive!',
      };
    },
  ];

  return types[randomInt(0, types.length - 1)]();
}

// CALCULUS PROBLEMS - College level
function generateCalculusProblem(): Problem {
  const types = [
    // Derivative power rule
    () => {
      const n = randomInt(2, 5);
      const coef = randomInt(1, 5);
      const newCoef = coef * n;
      const newExp = n - 1;
      return {
        question: `d/dx [${coef}x^${n}] = ?x^${newExp}`,
        answer: newCoef,
        displayAnswer: `${newCoef}x^${newExp}`,
        type: 'derivative',
        hint: 'Power rule: multiply by exponent, then subtract 1 from exponent',
      };
    },
    // Derivative of x^n
    () => {
      const n = randomInt(2, 6);
      const newExp = n - 1;
      return {
        question: `d/dx [x^${n}] = ?x^${newExp}`,
        answer: n,
        displayAnswer: `${n}x^${newExp}`,
        type: 'derivative',
        hint: 'Power rule: bring down the exponent!',
      };
    },
    // Derivative of constant
    () => {
      const c = randomInt(1, 20);
      return {
        question: `d/dx [${c}] = ?`,
        answer: 0,
        displayAnswer: '0',
        type: 'derivative',
        hint: 'Derivative of a constant is always 0!',
      };
    },
    // Derivative of x
    () => {
      return {
        question: `d/dx [x] = ?`,
        answer: 1,
        displayAnswer: '1',
        type: 'derivative',
        hint: 'The derivative of x is 1!',
      };
    },
    // Integral power rule
    () => {
      const n = randomInt(1, 4);
      const newExp = n + 1;
      return {
        question: `∫x^${n} dx = (1/?)x^${newExp} + C`,
        answer: newExp,
        displayAnswer: `(1/${newExp})x^${newExp} + C`,
        type: 'integral',
        hint: 'Add 1 to exponent, then divide by new exponent',
      };
    },
    // Simple limit
    () => {
      const a = randomInt(1, 10);
      return {
        question: `lim(x→${a}) x = ?`,
        answer: a,
        displayAnswer: String(a),
        type: 'limit',
        hint: 'What does x approach?',
      };
    },
    // Limit of constant
    () => {
      const c = randomInt(1, 15);
      const a = randomInt(1, 10);
      return {
        question: `lim(x→${a}) ${c} = ?`,
        answer: c,
        displayAnswer: String(c),
        type: 'limit',
        hint: 'The limit of a constant is the constant!',
      };
    },
    // Sum notation
    () => {
      const n = randomInt(3, 5);
      let sum = 0;
      for (let i = 1; i <= n; i++) sum += i;
      return {
        question: `Σ(i=1 to ${n}) i = ?`,
        answer: sum,
        displayAnswer: String(sum),
        type: 'summation',
        hint: 'Add all integers from 1 to n!',
      };
    },
    // Chain rule intro (simple)
    () => {
      const a = randomInt(2, 5);
      return {
        question: `d/dx [e^${a}x] = ?e^${a}x`,
        answer: a,
        displayAnswer: `${a}e^${a}x`,
        type: 'derivative',
        hint: 'Chain rule: multiply by the derivative of the inside!',
      };
    },
    // Second derivative
    () => {
      const n = randomInt(3, 5);
      const firstDeriv = n;
      const secondDeriv = n * (n - 1);
      return {
        question: `d²/dx² [x^${n}] = ?x^${n - 2}`,
        answer: secondDeriv,
        displayAnswer: `${secondDeriv}x^${n - 2}`,
        type: 'derivative',
        hint: 'Take the derivative twice!',
      };
    },
  ];

  return types[randomInt(0, types.length - 1)]();
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
