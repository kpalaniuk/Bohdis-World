// Assessment-specific problem generator with progressive difficulty levels 1-10
// All questions are multiple choice for mobile-friendliness
// Focused on K-12 curriculum without calculus/trig - lots of word problems!

export interface AssessmentProblem {
  question: string;
  answer: number | string;
  displayAnswer: string;
  type: string;
  level: number;
  isMultipleChoice: true;
  choices: string[];
  correctChoiceIndex: number;
  hint?: string;
  explanation?: string;
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

function generateWrongAnswers(correct: number, count: number, allowNegative: boolean = true): number[] {
  const wrongs: Set<number> = new Set();
  
  // Generate plausible wrong answers
  while (wrongs.size < count) {
    // Use different strategies to create plausible wrong answers
    const strategy = randomInt(0, 3);
    let wrong: number;
    
    switch (strategy) {
      case 0: // Small offset
        wrong = correct + randomInt(-5, 5);
        break;
      case 1: // Percentage off
        wrong = Math.round(correct * (1 + (randomInt(-30, 30) / 100)));
        break;
      case 2: // Common mistakes
        wrong = correct + randomInt(1, 3) * (randomInt(0, 1) === 0 ? 1 : -1);
        break;
      default: // Larger offset
        wrong = correct + randomInt(-15, 15);
    }
    
    if (wrong !== correct && !wrongs.has(wrong) && (allowNegative || wrong >= 0)) {
      wrongs.add(wrong);
    }
  }
  
  return Array.from(wrongs).slice(0, count);
}

function createMultipleChoice(answer: number, allowNegative: boolean = true): { choices: string[]; correctIndex: number } {
  const wrongs = generateWrongAnswers(answer, 3, allowNegative);
  const allChoices = shuffleArray([answer, ...wrongs]);
  return {
    choices: allChoices.map(String),
    correctIndex: allChoices.indexOf(answer),
  };
}

// Random names for word problems
const NAMES = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Lucas', 'Sophia', 'Mason', 'Isabella', 'Ethan', 'Mia', 'James', 'Charlotte', 'Ben', 'Amelia', 'Alex'];
const ITEMS = ['apples', 'oranges', 'cookies', 'pencils', 'stickers', 'books', 'toys', 'candies', 'marbles', 'cards'];
const ANIMALS = ['dogs', 'cats', 'birds', 'fish', 'rabbits', 'hamsters'];

function randomName(): string {
  return NAMES[randomInt(0, NAMES.length - 1)];
}

function randomItem(): string {
  return ITEMS[randomInt(0, ITEMS.length - 1)];
}

// Level 1: Simple addition (1st grade - ages 6-7)
function generateLevel1Problems(): AssessmentProblem {
  const problemTypes = [
    // Basic addition
    () => {
      const a = randomInt(1, 10);
      const b = randomInt(1, 10);
      return { q: `${a} + ${b}`, a: a + b, type: 'addition', hint: 'Count up from the bigger number!' };
    },
    // Adding to 10
    () => {
      const a = randomInt(1, 9);
      const b = 10 - a;
      return { q: `${a} + ? = 10`, a: b, type: 'number-bonds', hint: 'What number makes 10?' };
    },
    // Doubles
    () => {
      const a = randomInt(1, 5);
      return { q: `${a} + ${a}`, a: a + a, type: 'doubles', hint: 'Double the number!' };
    },
    // Simple word problem - addition
    () => {
      const name = randomName();
      const item = randomItem();
      const a = randomInt(2, 5);
      const b = randomInt(1, 5);
      return { 
        q: `${name} has ${a} ${item}. Gets ${b} more. How many now?`, 
        a: a + b, 
        type: 'word-problem', 
        hint: 'Add them together!' 
      };
    },
    // Counting on
    () => {
      const a = randomInt(5, 12);
      return { q: `${a} + 2`, a: a + 2, type: 'counting', hint: 'Count two more!' };
    },
    // Visual word problem
    () => {
      const a = randomInt(2, 4);
      const b = randomInt(2, 4);
      return { 
        q: `${a} red balls and ${b} blue balls. How many total?`, 
        a: a + b, 
        type: 'word-problem', 
        hint: 'Add all the balls together!' 
      };
    },
  ];

  const selected = problemTypes[randomInt(0, problemTypes.length - 1)]();
  const { choices, correctIndex } = createMultipleChoice(selected.a, false);

  return {
    question: selected.q,
    answer: selected.a,
    displayAnswer: String(selected.a),
    type: selected.type,
    level: 1,
    isMultipleChoice: true,
    choices,
    correctChoiceIndex: correctIndex,
    hint: selected.hint,
    explanation: `The answer is ${selected.a}`,
  };
}

// Level 2: Simple subtraction (1st-2nd grade)
function generateLevel2Problems(): AssessmentProblem {
  const problemTypes = [
    // Basic subtraction
    () => {
      const a = randomInt(8, 20);
      const b = randomInt(1, a - 1);
      return { q: `${a} - ${b}`, a: a - b, type: 'subtraction', hint: 'Count backwards!' };
    },
    // Subtraction from 10
    () => {
      const b = randomInt(1, 9);
      return { q: `10 - ${b}`, a: 10 - b, type: 'subtract-from-10', hint: 'How many to get to 10?' };
    },
    // Word problem - subtraction
    () => {
      const name = randomName();
      const item = randomItem();
      const a = randomInt(8, 15);
      const b = randomInt(2, a - 2);
      return { 
        q: `${name} had ${a} ${item}. Gave away ${b}. How many left?`, 
        a: a - b, 
        type: 'word-problem', 
        hint: 'Subtract to find what\'s left!' 
      };
    },
    // Finding difference word problem
    () => {
      const name1 = randomName();
      const name2 = randomName();
      const a = randomInt(8, 15);
      const b = randomInt(3, a - 1);
      return { 
        q: `${name1} has ${a} stickers. ${name2} has ${b}. How many more does ${name1} have?`, 
        a: a - b, 
        type: 'word-problem', 
        hint: 'Find the difference!' 
      };
    },
    // Missing number
    () => {
      const total = randomInt(10, 15);
      const part = randomInt(3, total - 3);
      return { q: `${part} + ? = ${total}`, a: total - part, type: 'missing-number', hint: 'What plus the number equals the total?' };
    },
    // Taking away word problem
    () => {
      const a = randomInt(10, 18);
      const b = randomInt(3, 6);
      return { 
        q: `There were ${a} birds. ${b} flew away. How many stayed?`, 
        a: a - b, 
        type: 'word-problem', 
        hint: 'Subtract the ones that left!' 
      };
    },
  ];

  const selected = problemTypes[randomInt(0, problemTypes.length - 1)]();
  const { choices, correctIndex } = createMultipleChoice(selected.a, false);

  return {
    question: selected.q,
    answer: selected.a,
    displayAnswer: String(selected.a),
    type: selected.type,
    level: 2,
    isMultipleChoice: true,
    choices,
    correctChoiceIndex: correctIndex,
    hint: selected.hint,
    explanation: `The answer is ${selected.a}`,
  };
}

// Level 3: Multiplication basics (2nd-3rd grade)
function generateLevel3Problems(): AssessmentProblem {
  const problemTypes = [
    // Times tables 2-5
    () => {
      const a = randomInt(2, 5);
      const b = randomInt(2, 10);
      return { q: `${a} × ${b}`, a: a * b, type: 'multiplication', hint: `Count by ${a}s!` };
    },
    // Multiply by 10
    () => {
      const a = randomInt(1, 12);
      return { q: `${a} × 10`, a: a * 10, type: 'multiply-by-10', hint: 'Add a zero!' };
    },
    // Groups word problem
    () => {
      const groups = randomInt(2, 5);
      const perGroup = randomInt(3, 6);
      const item = randomItem();
      return { 
        q: `${groups} bags with ${perGroup} ${item} each. How many total?`, 
        a: groups * perGroup, 
        type: 'word-problem', 
        hint: 'Multiply groups by items in each!' 
      };
    },
    // Array word problem
    () => {
      const rows = randomInt(2, 5);
      const cols = randomInt(3, 6);
      return { 
        q: `${rows} rows of desks, ${cols} desks in each row. Total desks?`, 
        a: rows * cols, 
        type: 'word-problem', 
        hint: 'Rows times columns!' 
      };
    },
    // Equal groups
    () => {
      const a = randomInt(3, 6);
      const b = randomInt(2, 5);
      return { 
        q: `${a} friends each have ${b} toys. How many toys altogether?`, 
        a: a * b, 
        type: 'word-problem', 
        hint: 'Multiply to find total!' 
      };
    },
    // Times tables 6-9
    () => {
      const a = randomInt(6, 9);
      const b = randomInt(2, 5);
      return { q: `${a} × ${b}`, a: a * b, type: 'multiplication', hint: 'Break it into easier parts!' };
    },
  ];

  const selected = problemTypes[randomInt(0, problemTypes.length - 1)]();
  const { choices, correctIndex } = createMultipleChoice(selected.a, false);

  return {
    question: selected.q,
    answer: selected.a,
    displayAnswer: String(selected.a),
    type: selected.type,
    level: 3,
    isMultipleChoice: true,
    choices,
    correctChoiceIndex: correctIndex,
    hint: selected.hint,
    explanation: `${selected.q} = ${selected.a}`,
  };
}

// Level 4: Division basics (3rd-4th grade)
function generateLevel4Problems(): AssessmentProblem {
  const problemTypes = [
    // Basic division
    () => {
      const b = randomInt(2, 10);
      const answer = randomInt(2, 10);
      const a = b * answer;
      return { q: `${a} ÷ ${b}`, a: answer, type: 'division', hint: `How many ${b}s fit into ${a}?` };
    },
    // Division by 2 (halving)
    () => {
      const answer = randomInt(3, 12);
      const a = answer * 2;
      return { q: `${a} ÷ 2`, a: answer, type: 'halving', hint: 'Split in half!' };
    },
    // Sharing word problem
    () => {
      const people = randomInt(2, 6);
      const perPerson = randomInt(3, 8);
      const total = people * perPerson;
      const item = randomItem();
      return { 
        q: `${total} ${item} shared equally among ${people} friends. Each gets?`, 
        a: perPerson, 
        type: 'word-problem', 
        hint: 'Divide total by number of friends!' 
      };
    },
    // Grouping word problem
    () => {
      const perGroup = randomInt(3, 6);
      const groups = randomInt(3, 7);
      const total = perGroup * groups;
      return { 
        q: `${total} students in groups of ${perGroup}. How many groups?`, 
        a: groups, 
        type: 'word-problem', 
        hint: 'Divide total by group size!' 
      };
    },
    // Division by 5
    () => {
      const answer = randomInt(2, 10);
      const a = answer * 5;
      return { q: `${a} ÷ 5`, a: answer, type: 'division-by-5', hint: 'Count by 5s!' };
    },
    // Money word problem
    () => {
      const perItem = randomInt(2, 5);
      const items = randomInt(3, 8);
      const total = perItem * items;
      return { 
        q: `$${total} for ${items} equal items. Price of each?`, 
        a: perItem, 
        type: 'word-problem', 
        hint: 'Divide total cost by number of items!' 
      };
    },
  ];

  const selected = problemTypes[randomInt(0, problemTypes.length - 1)]();
  const { choices, correctIndex } = createMultipleChoice(selected.a, false);

  return {
    question: selected.q,
    answer: selected.a,
    displayAnswer: String(selected.a),
    type: selected.type,
    level: 4,
    isMultipleChoice: true,
    choices,
    correctChoiceIndex: correctIndex,
    hint: selected.hint,
    explanation: `${selected.q} = ${selected.a}`,
  };
}

// Level 5: Basic algebra and multi-step (4th-5th grade)
function generateLevel5Problems(): AssessmentProblem {
  const problemTypes = [
    // Find x in addition
    () => {
      const answer = randomInt(1, 15);
      const b = randomInt(2, 10);
      const c = answer + b;
      return { q: `x + ${b} = ${c}, x = ?`, a: answer, type: 'algebra', hint: 'Subtract from both sides!' };
    },
    // Multi-step word problem
    () => {
      const name = randomName();
      const start = randomInt(10, 20);
      const bought = randomInt(5, 10);
      const gave = randomInt(3, 8);
      return { 
        q: `${name} had ${start} cards. Bought ${bought} more, gave away ${gave}. How many now?`, 
        a: start + bought - gave, 
        type: 'word-problem', 
        hint: 'Add what was bought, subtract what was given!' 
      };
    },
    // Order of operations simple
    () => {
      const a = randomInt(2, 5);
      const b = randomInt(2, 5);
      const c = randomInt(1, 5);
      return { q: `${a} × ${b} + ${c}`, a: a * b + c, type: 'order-of-ops', hint: 'Multiply first!' };
    },
    // Two-step shopping problem
    () => {
      const price1 = randomInt(3, 8);
      const qty1 = randomInt(2, 4);
      const price2 = randomInt(2, 5);
      const qty2 = randomInt(1, 3);
      return { 
        q: `${qty1} pens at $${price1} each and ${qty2} notebooks at $${price2} each. Total cost?`, 
        a: price1 * qty1 + price2 * qty2, 
        type: 'word-problem', 
        hint: 'Find each total, then add!' 
      };
    },
    // Missing factor
    () => {
      const answer = randomInt(2, 10);
      const b = randomInt(2, 8);
      const c = answer * b;
      return { q: `? × ${b} = ${c}`, a: answer, type: 'missing-factor', hint: 'What times the number gives the answer?' };
    },
    // Rate word problem
    () => {
      const rate = randomInt(3, 8);
      const time = randomInt(2, 5);
      return { 
        q: `A car travels ${rate} miles each hour. How far in ${time} hours?`, 
        a: rate * time, 
        type: 'word-problem', 
        hint: 'Multiply rate by time!' 
      };
    },
  ];

  const selected = problemTypes[randomInt(0, problemTypes.length - 1)]();
  const { choices, correctIndex } = createMultipleChoice(selected.a, false);

  return {
    question: selected.q,
    answer: selected.a,
    displayAnswer: String(selected.a),
    type: selected.type,
    level: 5,
    isMultipleChoice: true,
    choices,
    correctChoiceIndex: correctIndex,
    hint: selected.hint,
    explanation: `The answer is ${selected.a}`,
  };
}

// Level 6: Percentages and fractions (5th-6th grade)
function generateLevel6Problems(): AssessmentProblem {
  const problemTypes = [
    // 10% of a number
    () => {
      const base = randomInt(2, 15) * 10;
      const answer = base / 10;
      return { q: `What is 10% of ${base}?`, a: answer, type: 'percentage', hint: 'Move the decimal one place left!' };
    },
    // 50% of a number
    () => {
      const base = randomInt(4, 20) * 2;
      const answer = base / 2;
      return { q: `What is 50% of ${base}?`, a: answer, type: 'percentage', hint: '50% is half!' };
    },
    // Discount word problem
    () => {
      const original = randomInt(4, 12) * 10;
      const discount = original / 2;
      return { 
        q: `A $${original} item is 50% off. What is the sale price?`, 
        a: discount, 
        type: 'word-problem', 
        hint: 'Find half the price!' 
      };
    },
    // Fraction of a number
    () => {
      const whole = randomInt(3, 8) * 4;
      const answer = whole / 4;
      return { q: `What is 1/4 of ${whole}?`, a: answer, type: 'fraction', hint: 'Divide by 4!' };
    },
    // Tip/percentage word problem
    () => {
      const bill = randomInt(2, 10) * 10;
      const tip = bill / 10;
      return { 
        q: `Restaurant bill is $${bill}. What is a 10% tip?`, 
        a: tip, 
        type: 'word-problem', 
        hint: '10% means divide by 10!' 
      };
    },
    // Solve 2x = n
    () => {
      const answer = randomInt(3, 15);
      const result = answer * 2;
      return { q: `2x = ${result}, x = ?`, a: answer, type: 'algebra', hint: 'Divide both sides by 2!' };
    },
    // Part of a whole word problem
    () => {
      const total = randomInt(4, 10) * 5;
      const fraction = total / 5;
      return { 
        q: `A class has ${total} students. 1/5 are absent. How many absent?`, 
        a: fraction, 
        type: 'word-problem', 
        hint: 'Divide total by 5!' 
      };
    },
  ];

  const selected = problemTypes[randomInt(0, problemTypes.length - 1)]();
  const { choices, correctIndex } = createMultipleChoice(selected.a, false);

  return {
    question: selected.q,
    answer: selected.a,
    displayAnswer: String(selected.a),
    type: selected.type,
    level: 6,
    isMultipleChoice: true,
    choices,
    correctChoiceIndex: correctIndex,
    hint: selected.hint,
    explanation: `The answer is ${selected.a}`,
  };
}

// Level 7: Exponents and geometry basics (6th-7th grade)
function generateLevel7Problems(): AssessmentProblem {
  const problemTypes = [
    // Square numbers
    () => {
      const base = randomInt(2, 12);
      return { q: `${base}² = ?`, a: base * base, type: 'exponent', hint: 'Multiply the number by itself!' };
    },
    // Area word problem (rectangle)
    () => {
      const length = randomInt(4, 12);
      const width = randomInt(3, 8);
      return { 
        q: `Rectangle: length ${length}m, width ${width}m. Area in m²?`, 
        a: length * width, 
        type: 'word-problem', 
        hint: 'Area = length × width!' 
      };
    },
    // Square roots
    () => {
      const answer = randomInt(2, 12);
      const n = answer * answer;
      return { q: `√${n} = ?`, a: answer, type: 'square-root', hint: 'What times itself equals this?' };
    },
    // Perimeter word problem
    () => {
      const side = randomInt(4, 15);
      return { 
        q: `A square has sides of ${side} cm. What is its perimeter?`, 
        a: side * 4, 
        type: 'word-problem', 
        hint: 'Add all 4 sides!' 
      };
    },
    // Powers of 2
    () => {
      const exp = randomInt(2, 6);
      return { q: `2^${exp} = ?`, a: Math.pow(2, exp), type: 'powers-of-2', hint: 'Double the previous power!' };
    },
    // Area of square word problem
    () => {
      const side = randomInt(3, 10);
      return { 
        q: `A square garden has ${side} foot sides. What is its area in ft²?`, 
        a: side * side, 
        type: 'word-problem', 
        hint: 'Area of square = side × side!' 
      };
    },
    // Volume of cube (simple)
    () => {
      const side = randomInt(2, 5);
      return { 
        q: `A cube has ${side} cm edges. What is its volume in cm³?`, 
        a: side * side * side, 
        type: 'word-problem', 
        hint: 'Volume = side × side × side!' 
      };
    },
  ];

  const selected = problemTypes[randomInt(0, problemTypes.length - 1)]();
  const { choices, correctIndex } = createMultipleChoice(selected.a, false);

  return {
    question: selected.q,
    answer: selected.a,
    displayAnswer: String(selected.a),
    type: selected.type,
    level: 7,
    isMultipleChoice: true,
    choices,
    correctChoiceIndex: correctIndex,
    hint: selected.hint,
    explanation: `${selected.q} = ${selected.a}`,
  };
}

// Level 8: Negative numbers and equations (7th-8th grade)
function generateLevel8Problems(): AssessmentProblem {
  const problemTypes = [
    // Adding negative numbers
    () => {
      const a = randomInt(-15, 15);
      const b = randomInt(-15, 15);
      return { q: `(${a}) + (${b}) = ?`, a: a + b, type: 'negative-add', hint: 'Use a number line!' };
    },
    // Subtracting negative numbers
    () => {
      const a = randomInt(-10, 10);
      const b = randomInt(-10, 10);
      return { q: `(${a}) - (${b}) = ?`, a: a - b, type: 'negative-sub', hint: 'Subtracting a negative is adding!' };
    },
    // Temperature word problem
    () => {
      const start = randomInt(-10, 5);
      const change = randomInt(5, 15);
      return { 
        q: `Temperature is ${start}°F. It rises ${change}°. What is it now?`, 
        a: start + change, 
        type: 'word-problem', 
        hint: 'Add the temperature change!' 
      };
    },
    // Debt word problem
    () => {
      const owed = randomInt(20, 50);
      const paid = randomInt(10, owed - 5);
      return { 
        q: `You owe $${owed}. You pay $${paid}. How much do you still owe?`, 
        a: owed - paid, 
        type: 'word-problem', 
        hint: 'Subtract what you paid!' 
      };
    },
    // Two-step equation
    () => {
      const x = randomInt(2, 10);
      const mult = randomInt(2, 5);
      const add = randomInt(1, 10);
      const result = mult * x + add;
      return { q: `${mult}x + ${add} = ${result}, x = ?`, a: x, type: 'equation', hint: 'Subtract first, then divide!' };
    },
    // Profit/loss word problem
    () => {
      const cost = randomInt(20, 50);
      const sold = randomInt(cost - 15, cost + 20);
      const profit = sold - cost;
      return { 
        q: `Bought for $${cost}, sold for $${sold}. Profit or loss? (positive=profit)`, 
        a: profit, 
        type: 'word-problem', 
        hint: 'Subtract cost from sale price!' 
      };
    },
  ];

  const selected = problemTypes[randomInt(0, problemTypes.length - 1)]();
  const { choices, correctIndex } = createMultipleChoice(selected.a, true);

  return {
    question: selected.q,
    answer: selected.a,
    displayAnswer: String(selected.a),
    type: selected.type,
    level: 8,
    isMultipleChoice: true,
    choices,
    correctChoiceIndex: correctIndex,
    hint: selected.hint,
    explanation: `The answer is ${selected.a}`,
  };
}

// Level 9: Advanced algebra and geometry (8th-9th grade) - NO trig/logs
function generateLevel9Problems(): AssessmentProblem {
  const problemTypes = [
    // Distance formula word problem
    () => {
      const rate = randomInt(40, 65);
      const time = randomInt(2, 5);
      return { 
        q: `A train travels at ${rate} mph for ${time} hours. How many miles?`, 
        a: rate * time, 
        type: 'word-problem', 
        hint: 'Distance = rate × time!' 
      };
    },
    // Solving for variable in complex equation
    () => {
      const x = randomInt(2, 8);
      const a = randomInt(2, 4);
      const b = randomInt(3, 6);
      const c = randomInt(1, 5);
      const result = a * x + b - c;
      return { q: `${a}x + ${b} - ${c} = ${result}, x = ?`, a: x, type: 'algebra', hint: 'Simplify, then solve for x!' };
    },
    // Ratio word problem
    () => {
      const ratio1 = randomInt(2, 4);
      const ratio2 = randomInt(3, 5);
      const total = (ratio1 + ratio2) * randomInt(3, 8);
      const part1 = (total / (ratio1 + ratio2)) * ratio1;
      return { 
        q: `Split $${total} in ratio ${ratio1}:${ratio2}. What is the smaller share?`, 
        a: Math.min(part1, total - part1), 
        type: 'word-problem', 
        hint: 'Find total parts, then calculate each share!' 
      };
    },
    // Consecutive integers
    () => {
      const start = randomInt(5, 15);
      const sum = start + (start + 1) + (start + 2);
      return { 
        q: `Three consecutive integers sum to ${sum}. What is the smallest?`, 
        a: start, 
        type: 'word-problem', 
        hint: 'Divide by 3, then subtract 1!' 
      };
    },
    // Percentage increase
    () => {
      const original = randomInt(4, 10) * 10;
      const increase = original / 4; // 25% increase
      return { 
        q: `A price of $${original} increases by 25%. New price?`, 
        a: original + increase, 
        type: 'word-problem', 
        hint: 'Find 25% and add to original!' 
      };
    },
    // Area of triangle
    () => {
      const base = randomInt(4, 12) * 2;
      const height = randomInt(3, 8);
      return { 
        q: `Triangle: base ${base} cm, height ${height} cm. Area?`, 
        a: (base * height) / 2, 
        type: 'word-problem', 
        hint: 'Area = (base × height) ÷ 2!' 
      };
    },
    // Speed/time word problem
    () => {
      const distance = randomInt(6, 15) * 10;
      const speed = randomInt(20, 50);
      const time = distance / speed;
      // Ensure whole number answer
      const adjustedDistance = speed * randomInt(2, 5);
      return { 
        q: `How many hours to travel ${adjustedDistance} miles at ${speed} mph?`, 
        a: adjustedDistance / speed, 
        type: 'word-problem', 
        hint: 'Time = distance ÷ speed!' 
      };
    },
  ];

  const selected = problemTypes[randomInt(0, problemTypes.length - 1)]();
  const { choices, correctIndex } = createMultipleChoice(selected.a, false);

  return {
    question: selected.q,
    answer: selected.a,
    displayAnswer: String(selected.a),
    type: selected.type,
    level: 9,
    isMultipleChoice: true,
    choices,
    correctChoiceIndex: correctIndex,
    hint: selected.hint,
    explanation: `${selected.q} = ${selected.a}`,
  };
}

// Level 10: Complex word problems and statistics (9th-10th grade) - NO calculus
function generateLevel10Problems(): AssessmentProblem {
  const problemTypes = [
    // Mean/average word problem
    () => {
      const scores = [randomInt(70, 90), randomInt(75, 95), randomInt(65, 85), randomInt(80, 100)];
      const sum = scores.reduce((a, b) => a + b, 0);
      const avg = sum / 4;
      return { 
        q: `Test scores: ${scores.join(', ')}. What is the average?`, 
        a: avg, 
        type: 'word-problem', 
        hint: 'Add all scores and divide by 4!' 
      };
    },
    // Compound interest (simple)
    () => {
      const principal = randomInt(5, 10) * 100;
      const rate = 10;
      const interest = principal * rate / 100;
      return { 
        q: `$${principal} earns 10% interest. How much interest earned?`, 
        a: interest, 
        type: 'word-problem', 
        hint: 'Multiply by 0.10!' 
      };
    },
    // Work rate problem
    () => {
      const rate1 = randomInt(2, 4);
      const rate2 = randomInt(3, 5);
      const hours = randomInt(2, 4);
      return { 
        q: `Worker A makes ${rate1} items/hr, B makes ${rate2}/hr. Together in ${hours} hours?`, 
        a: (rate1 + rate2) * hours, 
        type: 'word-problem', 
        hint: 'Add rates, multiply by time!' 
      };
    },
    // Proportional reasoning
    () => {
      const item = randomInt(3, 8);
      const cost = item * randomInt(4, 8);
      const newQty = randomInt(5, 12);
      return { 
        q: `${item} items cost $${cost}. How much for ${newQty} items?`, 
        a: (cost / item) * newQty, 
        type: 'word-problem', 
        hint: 'Find cost per item, then multiply!' 
      };
    },
    // Combined discount problem
    () => {
      const original = randomInt(8, 15) * 10;
      const afterFirst = original / 2; // 50% off
      const afterSecond = afterFirst - (afterFirst / 10); // then 10% off
      return { 
        q: `$${original} item is 50% off, then extra 10% off. Final price?`, 
        a: afterSecond, 
        type: 'word-problem', 
        hint: 'Apply discounts one at a time!' 
      };
    },
    // Systems word problem (simple)
    () => {
      const adultPrice = randomInt(8, 12);
      const childPrice = randomInt(4, 7);
      const adults = randomInt(2, 4);
      const children = randomInt(1, 3);
      return { 
        q: `Adult tickets $${adultPrice}, child $${childPrice}. Cost for ${adults} adults and ${children} children?`, 
        a: adultPrice * adults + childPrice * children, 
        type: 'word-problem', 
        hint: 'Multiply each type by quantity and add!' 
      };
    },
    // Percentage word problem
    () => {
      const total = randomInt(15, 30) * 10;
      const percent = randomInt(2, 4) * 10;
      const part = (total * percent) / 100;
      return { 
        q: `A store sold ${percent}% of ${total} items. How many sold?`, 
        a: part, 
        type: 'word-problem', 
        hint: 'Convert percent to decimal and multiply!' 
      };
    },
    // Multi-step rate problem
    () => {
      const rate = randomInt(40, 60);
      const time1 = randomInt(2, 3);
      const time2 = randomInt(1, 2);
      const rate2 = rate + randomInt(10, 20);
      return { 
        q: `Drive ${rate} mph for ${time1} hrs, then ${rate2} mph for ${time2} hrs. Total miles?`, 
        a: rate * time1 + rate2 * time2, 
        type: 'word-problem', 
        hint: 'Calculate each part separately, then add!' 
      };
    },
  ];

  const selected = problemTypes[randomInt(0, problemTypes.length - 1)]();
  const { choices, correctIndex } = createMultipleChoice(selected.a, false);

  return {
    question: selected.q,
    answer: selected.a,
    displayAnswer: String(selected.a),
    type: selected.type,
    level: 10,
    isMultipleChoice: true,
    choices,
    correctChoiceIndex: correctIndex,
    hint: selected.hint,
    explanation: `The answer is ${selected.a}`,
  };
}

export function generateAssessmentProblem(level: number): AssessmentProblem {
  const clampedLevel = Math.max(1, Math.min(10, level));
  
  switch (clampedLevel) {
    case 1: return generateLevel1Problems();
    case 2: return generateLevel2Problems();
    case 3: return generateLevel3Problems();
    case 4: return generateLevel4Problems();
    case 5: return generateLevel5Problems();
    case 6: return generateLevel6Problems();
    case 7: return generateLevel7Problems();
    case 8: return generateLevel8Problems();
    case 9: return generateLevel9Problems();
    case 10: return generateLevel10Problems();
    default: return generateLevel1Problems();
  }
}

export function checkAssessmentAnswer(
  problem: AssessmentProblem,
  userAnswer: number
): boolean {
  return userAnswer === problem.correctChoiceIndex;
}

export function calculateSpeedBonus(responseTimeMs: number): number {
  if (responseTimeMs < 3000) return 1.5;
  if (responseTimeMs < 8000) return 1.2;
  if (responseTimeMs < 15000) return 1.0;
  return 0.8;
}

// Calculate grade level (e.g., 3.45 means high 3rd grade level)
export function calculateGradeLevel(
  levelsAnswered: { level: number; correct: boolean }[]
): number {
  if (levelsAnswered.length === 0) return 1.0;

  // Find the highest level where the user demonstrated competency
  // Competency = got at least one question right at that level
  const levelPerformance: Record<number, { correct: number; total: number }> = {};
  
  for (const item of levelsAnswered) {
    if (!levelPerformance[item.level]) {
      levelPerformance[item.level] = { correct: 0, total: 0 };
    }
    levelPerformance[item.level].total++;
    if (item.correct) {
      levelPerformance[item.level].correct++;
    }
  }

  // Calculate weighted average of levels based on performance
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [levelStr, perf] of Object.entries(levelPerformance)) {
    const level = parseInt(levelStr);
    const accuracy = perf.correct / perf.total;
    const weight = perf.total; // More questions = more weight
    
    // Level contribution is based on accuracy at that level
    const levelContribution = level + (accuracy * 0.99); // 0.99 max so 3.99 doesn't round to 4
    
    weightedSum += levelContribution * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 1.0;

  const gradeLevel = weightedSum / totalWeight;
  
  // Clamp between 1.00 and 10.99
  return Math.max(1.0, Math.min(10.99, Math.round(gradeLevel * 100) / 100));
}

// Map internal levels to approximate school grade levels for display
export const LEVEL_NAMES: Record<number, string> = {
  1: '1st Grade',
  2: '2nd Grade', 
  3: '3rd Grade',
  4: '4th Grade',
  5: '5th Grade',
  6: '6th Grade',
  7: '7th Grade',
  8: '8th Grade',
  9: '9th Grade',
  10: '10th Grade+',
};

export const LEVEL_DESCRIPTIONS: Record<number, string> = {
  1: 'Addition & Counting',
  2: 'Subtraction Skills',
  3: 'Multiplication Tables',
  4: 'Division Mastery',
  5: 'Multi-Step Problems',
  6: 'Percentages & Fractions',
  7: 'Exponents & Geometry',
  8: 'Negatives & Equations',
  9: 'Advanced Word Problems',
  10: 'Statistics & Reasoning',
};
