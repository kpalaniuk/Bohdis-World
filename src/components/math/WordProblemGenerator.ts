// Word Problem Generator with Mad Libs style customization
// Users fill in names, nouns, adjectives; computer generates numbers

export interface WordProblemTemplate {
  id: string;
  templateName: string;
  templateText: string; // e.g., "{name1} has {number1} {noun1}. Gets {number2} more. How many now?"
  difficultyLevel: number; // 1-10
  problemType: string;
  calculationFormula: string; // e.g., "{number1} + {number2}"
  placeholders: {
    names: number;
    nouns: number;
    adjectives: number;
    numbers: number;
  };
}

export interface CustomWords {
  [key: string]: string; // e.g., {name1: "Alice", noun1: "apples", adjective1: "red"}
}

export interface GeneratedNumbers {
  [key: string]: number; // e.g., {number1: 5, number2: 3}
}

export interface WordProblem {
  id?: string;
  templateId?: string;
  question: string; // Final question with all replacements
  answer: number;
  customWords: CustomWords;
  generatedNumbers: GeneratedNumbers;
  difficultyLevel: number;
  problemType: string;
}

// Predefined templates for different difficulty levels
export const WORD_PROBLEM_TEMPLATES: WordProblemTemplate[] = [
  // Level 1-2: Simple addition
  {
    id: 'add-simple',
    templateName: 'Simple Addition',
    templateText: '{name1} has {number1} {noun1}. Gets {number2} more. How many {noun1} does {name1} have now?',
    difficultyLevel: 1,
    problemType: 'addition',
    calculationFormula: '{number1} + {number2}',
    placeholders: { names: 1, nouns: 1, adjectives: 0, numbers: 2 },
  },
  {
    id: 'add-two-people',
    templateName: 'Adding Together',
    templateText: '{name1} has {number1} {noun1} and {name2} has {number2} {noun1}. How many {noun1} do they have together?',
    difficultyLevel: 1,
    problemType: 'addition',
    calculationFormula: '{number1} + {number2}',
    placeholders: { names: 2, nouns: 1, adjectives: 0, numbers: 2 },
  },
  
  // Level 2-3: Simple subtraction
  {
    id: 'subtract-simple',
    templateName: 'Simple Subtraction',
    templateText: '{name1} had {number1} {noun1}. Gave away {number2} {noun1}. How many {noun1} are left?',
    difficultyLevel: 2,
    problemType: 'subtraction',
    calculationFormula: '{number1} - {number2}',
    placeholders: { names: 1, nouns: 1, adjectives: 0, numbers: 2 },
  },
  {
    id: 'subtract-difference',
    templateName: 'Finding Difference',
    templateText: '{name1} has {number1} {noun1}. {name2} has {number2} {noun1}. How many more {noun1} does {name1} have?',
    difficultyLevel: 2,
    problemType: 'subtraction',
    calculationFormula: '{number1} - {number2}',
    placeholders: { names: 2, nouns: 1, adjectives: 0, numbers: 2 },
  },
  
  // Level 3-4: Multiplication
  {
    id: 'multiply-groups',
    templateName: 'Groups Multiplication',
    templateText: '{name1} has {number1} {adjective1} {noun1} in each {noun2}. There are {number2} {noun2}s. How many {noun1} are there in total?',
    difficultyLevel: 3,
    problemType: 'multiplication',
    calculationFormula: '{number1} * {number2}',
    placeholders: { names: 1, nouns: 2, adjectives: 1, numbers: 2 },
  },
  {
    id: 'multiply-rows',
    templateName: 'Rows and Columns',
    templateText: 'A {adjective1} {noun1} has {number1} rows with {number2} {noun2} in each row. How many {noun2} are there?',
    difficultyLevel: 3,
    problemType: 'multiplication',
    calculationFormula: '{number1} * {number2}',
    placeholders: { names: 0, nouns: 2, adjectives: 1, numbers: 2 },
  },
  
  // Level 4-5: Division
  {
    id: 'divide-sharing',
    templateName: 'Sharing Equally',
    templateText: '{name1} has {number1} {noun1} to share equally among {number2} {adjective1} {noun2}. How many {noun1} does each {noun2} get?',
    difficultyLevel: 4,
    problemType: 'division',
    calculationFormula: '{number1} / {number2}',
    placeholders: { names: 1, nouns: 2, adjectives: 1, numbers: 2 },
  },
  {
    id: 'divide-grouping',
    templateName: 'Making Groups',
    templateText: '{name1} has {number1} {noun1}. Wants to put them into groups of {number2}. How many groups can {name1} make?',
    difficultyLevel: 4,
    problemType: 'division',
    calculationFormula: '{number1} / {number2}',
    placeholders: { names: 1, nouns: 1, adjectives: 0, numbers: 2 },
  },
  
  // Level 5-6: Multi-step
  {
    id: 'multistep-add-subtract',
    templateName: 'Add Then Subtract',
    templateText: '{name1} had {number1} {noun1}. Bought {number2} more {noun1}, then gave away {number3} {noun1}. How many {noun1} does {name1} have now?',
    difficultyLevel: 5,
    problemType: 'multi-step',
    calculationFormula: '{number1} + {number2} - {number3}',
    placeholders: { names: 1, nouns: 1, adjectives: 0, numbers: 3 },
  },
  {
    id: 'multistep-shopping',
    templateName: 'Shopping Problem',
    templateText: '{name1} buys {number1} {noun1} at ${number2} each and {number3} {noun2} at ${number4} each. How much does {name1} spend in total?',
    difficultyLevel: 5,
    problemType: 'multi-step',
    calculationFormula: '{number1} * {number2} + {number3} * {number4}',
    placeholders: { names: 1, nouns: 2, adjectives: 0, numbers: 4 },
  },
  
  // Level 6-7: Percentages and fractions
  {
    id: 'percentage-discount',
    templateName: 'Percentage Discount',
    templateText: 'A {adjective1} {noun1} costs ${number1}. It is on sale for {number2}% off. What is the sale price?',
    difficultyLevel: 6,
    problemType: 'percentage',
    calculationFormula: '{number1} - ({number1} * {number2} / 100)',
    placeholders: { names: 0, nouns: 1, adjectives: 1, numbers: 2 },
  },
  {
    id: 'fraction-part',
    templateName: 'Fraction of a Whole',
    templateText: '{name1} has {number1} {noun1}. {name1} gives away {number2}/{number3} of them. How many {noun1} does {name1} give away?',
    difficultyLevel: 6,
    problemType: 'fraction',
    calculationFormula: '{number1} * {number2} / {number3}',
    placeholders: { names: 1, nouns: 1, adjectives: 0, numbers: 3 },
  },
  
  // Level 7-8: Area and perimeter
  {
    id: 'area-rectangle',
    templateName: 'Rectangle Area',
    templateText: 'A {adjective1} {noun1} has a length of {number1} {noun2} and a width of {number2} {noun2}. What is its area?',
    difficultyLevel: 7,
    problemType: 'geometry',
    calculationFormula: '{number1} * {number2}',
    placeholders: { names: 0, nouns: 2, adjectives: 1, numbers: 2 },
  },
  {
    id: 'perimeter-square',
    templateName: 'Square Perimeter',
    templateText: 'A {adjective1} {noun1} has sides that are {number1} {noun2} long. What is its perimeter?',
    difficultyLevel: 7,
    problemType: 'geometry',
    calculationFormula: '{number1} * 4',
    placeholders: { names: 0, nouns: 2, adjectives: 1, numbers: 1 },
  },
  
  // Level 8-9: Rate and distance
  {
    id: 'distance-rate-time',
    templateName: 'Distance Problem',
    templateText: '{name1} travels at {number1} {noun1} per {noun2} for {number2} {noun2}s. How far does {name1} travel?',
    difficultyLevel: 8,
    problemType: 'rate',
    calculationFormula: '{number1} * {number2}',
    placeholders: { names: 1, nouns: 2, adjectives: 0, numbers: 2 },
  },
  {
    id: 'time-rate',
    templateName: 'Time Problem',
    templateText: '{name1} needs to travel {number1} {noun1}. Traveling at {number2} {noun1} per {noun2}, how many {noun2}s will it take?',
    difficultyLevel: 8,
    problemType: 'rate',
    calculationFormula: '{number1} / {number2}',
    placeholders: { names: 1, nouns: 2, adjectives: 0, numbers: 2 },
  },
  
  // Level 9-10: Complex multi-step
  {
    id: 'complex-multistep',
    templateName: 'Complex Multi-Step',
    templateText: '{name1} starts with ${number1}. Spends ${number2} on {noun1}, then earns ${number3} more. {name1} then spends half of what remains on {noun2}. How much money does {name1} have left?',
    difficultyLevel: 9,
    problemType: 'multi-step',
    calculationFormula: '({number1} - {number2} + {number3}) / 2',
    placeholders: { names: 1, nouns: 2, adjectives: 0, numbers: 3 },
  },
  {
    id: 'ratio-problem',
    templateName: 'Ratio Problem',
    templateText: '{name1} and {name2} share {number1} {noun1} in a ratio of {number2}:{number3}. How many {noun1} does {name1} get?',
    difficultyLevel: 9,
    problemType: 'ratio',
    calculationFormula: '{number1} * {number2} / ({number2} + {number3})',
    placeholders: { names: 2, nouns: 1, adjectives: 0, numbers: 3 },
  },
];

// Generate random numbers based on difficulty level
function generateNumbersForLevel(level: number, count: number): GeneratedNumbers {
  const numbers: GeneratedNumbers = {};
  
  // Define number ranges based on level
  const ranges: Record<number, { min: number; max: number }> = {
    1: { min: 1, max: 10 },
    2: { min: 1, max: 20 },
    3: { min: 2, max: 10 },
    4: { min: 2, max: 12 },
    5: { min: 5, max: 50 },
    6: { min: 10, max: 100 },
    7: { min: 3, max: 20 },
    8: { min: 10, max: 100 },
    9: { min: 20, max: 200 },
    10: { min: 50, max: 500 },
  };
  
  const range = ranges[Math.min(level, 10)] || ranges[5];
  
  for (let i = 1; i <= count; i++) {
    numbers[`number${i}`] = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  }
  
  return numbers;
}

// Replace placeholders in template text
function replacePlaceholders(
  templateText: string,
  customWords: CustomWords,
  generatedNumbers: GeneratedNumbers
): string {
  let result = templateText;
  
  // Replace custom words first
  for (const [key, value] of Object.entries(customWords)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, value);
  }
  
  // Replace generated numbers
  for (const [key, value] of Object.entries(generatedNumbers)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, String(value));
  }
  
  return result;
}

// Evaluate calculation formula
function evaluateFormula(formula: string, numbers: GeneratedNumbers): number {
  let expression = formula;
  
  // Replace number placeholders with actual values
  for (const [key, value] of Object.entries(numbers)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    expression = expression.replace(regex, String(value));
  }
  
  // Evaluate the expression safely
  try {
    // Use Function constructor for safe evaluation
    const result = new Function('return ' + expression)();
    return Math.round(result * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error('Error evaluating formula:', error);
    return 0;
  }
}

// Generate a word problem from a template
export function generateWordProblem(
  template: WordProblemTemplate,
  customWords: CustomWords,
  regenerateNumbers: boolean = false,
  previousNumbers?: GeneratedNumbers
): WordProblem {
  // Generate numbers (or reuse previous ones if not regenerating)
  const generatedNumbers = regenerateNumbers || !previousNumbers
    ? generateNumbersForLevel(template.difficultyLevel, template.placeholders.numbers)
    : previousNumbers;
  
  // Replace placeholders in template
  const question = replacePlaceholders(template.templateText, customWords, generatedNumbers);
  
  // Calculate answer
  const answer = evaluateFormula(template.calculationFormula, generatedNumbers);
  
  return {
    question,
    answer,
    customWords,
    generatedNumbers,
    difficultyLevel: template.difficultyLevel,
    problemType: template.problemType,
  };
}

// Get templates for a specific difficulty level
export function getTemplatesForLevel(level: number): WordProblemTemplate[] {
  return WORD_PROBLEM_TEMPLATES.filter(t => t.difficultyLevel === level);
}

// Get templates at or above a difficulty level
export function getTemplatesAtOrAboveLevel(level: number): WordProblemTemplate[] {
  return WORD_PROBLEM_TEMPLATES.filter(t => t.difficultyLevel >= level);
}

// Get a random template for a level
export function getRandomTemplateForLevel(level: number): WordProblemTemplate | null {
  const templates = getTemplatesForLevel(level);
  if (templates.length === 0) return null;
  return templates[Math.floor(Math.random() * templates.length)];
}

// Get template by ID
export function getTemplateById(id: string): WordProblemTemplate | null {
  return WORD_PROBLEM_TEMPLATES.find(t => t.id === id) || null;
}

