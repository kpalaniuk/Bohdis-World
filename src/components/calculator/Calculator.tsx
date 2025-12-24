'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { Delete, RotateCcw } from 'lucide-react';
import { saveCalculation, getCalculationHistory } from '@/lib/syncProgress';

interface HistoryItem {
  expression: string;
  result: string;
}

export function Calculator() {
  const { user, isSignedIn } = useUser();
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isNewCalculation, setIsNewCalculation] = useState(true);
  const [showScientific, setShowScientific] = useState(true);

  // Load history on mount
  useEffect(() => {
    async function loadHistory() {
      if (isSignedIn && user?.id) {
        const cloudHistory = await getCalculationHistory(user.id, 5);
        if (cloudHistory.length > 0) {
          setHistory(cloudHistory.map(h => ({ expression: h.expression, result: h.result })));
        }
      } else {
        // Load from localStorage for guests
        const saved = localStorage.getItem('calc-history');
        if (saved) {
          setHistory(JSON.parse(saved));
        }
      }
    }
    loadHistory();
  }, [isSignedIn, user?.id]);

  // Save history
  const saveHistory = useCallback((expr: string, result: string) => {
    const newItem = { expression: expr, result };
    const newHistory = [newItem, ...history].slice(0, 5);
    setHistory(newHistory);

    if (isSignedIn && user?.id) {
      saveCalculation(user.id, expr, result);
    } else {
      localStorage.setItem('calc-history', JSON.stringify(newHistory));
    }
  }, [history, isSignedIn, user?.id]);

  // Handle number input
  const inputNumber = useCallback((num: string) => {
    if (isNewCalculation) {
      setDisplay(num);
      setExpression(num);
      setIsNewCalculation(false);
    } else {
      if (display === '0' && num !== '.') {
        setDisplay(num);
      } else {
        setDisplay(display + num);
      }
      setExpression(expression + num);
    }
  }, [display, expression, isNewCalculation]);

  // Handle operator input
  const inputOperator = useCallback((op: string) => {
    setIsNewCalculation(false);
    const lastChar = expression.slice(-1);
    
    // Replace operator if last character is an operator
    if (['+', '-', '×', '÷', '^'].includes(lastChar)) {
      setExpression(expression.slice(0, -1) + op);
    } else {
      setExpression(expression + op);
    }
    setDisplay(op);
  }, [expression]);

  // Handle scientific functions
  const inputFunction = useCallback((func: string) => {
    setIsNewCalculation(false);
    
    switch (func) {
      case 'sin':
      case 'cos':
      case 'tan':
      case 'log':
      case 'ln':
      case '√':
        setExpression(expression + func + '(');
        setDisplay(func + '(');
        break;
      case 'π':
        setExpression(expression + 'π');
        setDisplay('π');
        break;
      case 'e':
        setExpression(expression + 'e');
        setDisplay('e');
        break;
      case 'x²':
        setExpression(expression + '^2');
        setDisplay('^2');
        break;
      case 'xʸ':
        setExpression(expression + '^');
        setDisplay('^');
        break;
      case '(':
      case ')':
        setExpression(expression + func);
        setDisplay(func);
        break;
    }
  }, [expression]);

  // Calculate result
  const calculate = useCallback(() => {
    try {
      let evalExpr = expression;
      
      // Count and auto-close unclosed parentheses
      const openCount = (evalExpr.match(/\(/g) || []).length;
      const closeCount = (evalExpr.match(/\)/g) || []).length;
      if (openCount > closeCount) {
        evalExpr += ')'.repeat(openCount - closeCount);
      }

      // Handle √ without parentheses: √8 -> √(8)
      // Match √ followed by a number (not already in parens)
      evalExpr = evalExpr.replace(/√(\d+\.?\d*)(?!\))/g, '√($1)');
      
      // Convert expression to evaluable format
      evalExpr = evalExpr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/π/g, String(Math.PI))
        .replace(/e(?![xp])/g, String(Math.E))
        .replace(/sin\(/g, 'Math.sin(')
        .replace(/cos\(/g, 'Math.cos(')
        .replace(/tan\(/g, 'Math.tan(')
        .replace(/log\(/g, 'Math.log10(')
        .replace(/ln\(/g, 'Math.log(')
        .replace(/√\(/g, 'Math.sqrt(')
        .replace(/√/g, 'Math.sqrt') // Handle any remaining √
        .replace(/\^/g, '**');

      // Evaluate
      const result = Function('"use strict"; return (' + evalExpr + ')')();
      
      // Format result
      let formattedResult: string;
      if (Number.isNaN(result) || !Number.isFinite(result)) {
        formattedResult = 'Error';
      } else if (Number.isInteger(result)) {
        formattedResult = result.toString();
      } else {
        formattedResult = parseFloat(result.toFixed(10)).toString();
      }

      // Save to history
      if (formattedResult !== 'Error') {
        saveHistory(expression, formattedResult);
      }

      setDisplay(formattedResult);
      setExpression(formattedResult);
      setIsNewCalculation(true);
    } catch (err) {
      console.error('Calculation error:', err);
      setDisplay('Error');
      setIsNewCalculation(true);
    }
  }, [expression, saveHistory]);

  // Clear
  const clear = useCallback(() => {
    setDisplay('0');
    setExpression('');
    setIsNewCalculation(true);
  }, []);

  // Backspace
  const backspace = useCallback(() => {
    if (expression.length > 1) {
      setExpression(expression.slice(0, -1));
      setDisplay(expression.slice(-2, -1) || '0');
    } else {
      clear();
    }
  }, [expression, clear]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if typing in an input
      if (e.target instanceof HTMLInputElement) return;

      if (e.key >= '0' && e.key <= '9') {
        inputNumber(e.key);
      } else if (e.key === '.') {
        inputNumber('.');
      } else if (e.key === '+') {
        inputOperator('+');
      } else if (e.key === '-') {
        inputOperator('-');
      } else if (e.key === '*') {
        inputOperator('×');
      } else if (e.key === '/') {
        e.preventDefault();
        inputOperator('÷');
      } else if (e.key === '^') {
        inputOperator('^');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        calculate();
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        clear();
      } else if (e.key === 'Backspace') {
        backspace();
      } else if (e.key === '(' || e.key === ')') {
        inputFunction(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputNumber, inputOperator, inputFunction, calculate, clear, backspace]);

  // Button component
  const CalcButton = ({ 
    value, 
    onClick, 
    variant = 'number',
    wide = false,
    children 
  }: { 
    value: string; 
    onClick: () => void; 
    variant?: 'number' | 'operator' | 'function' | 'action';
    wide?: boolean;
    children?: React.ReactNode;
  }) => {
    const variantStyles = {
      number: 'bg-pixel-shadow hover:bg-gray-600 text-white',
      operator: 'bg-ocean-blue hover:bg-ocean-blue/80 text-white',
      function: 'bg-pixel-black hover:bg-gray-800 text-foamy-green border-foamy-green',
      action: 'bg-sunset-orange hover:bg-sunset-orange/80 text-white',
    };

    return (
      <button
        onClick={onClick}
        className={`
          ${variantStyles[variant]}
          ${wide ? 'col-span-2' : ''}
          font-lcd text-xl
          border-2 border-pixel-black
          p-3
          transition-all
          active:translate-x-0.5 active:translate-y-0.5
        `}
        style={{
          boxShadow: '2px 2px 0px #1a1a1a',
        }}
      >
        {children || value}
      </button>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
      {/* Calculator Body */}
      <div 
        className="w-full max-w-sm bg-ocean-blue p-4 border-4 border-pixel-black"
        style={{ boxShadow: '8px 8px 0px #2d2d2d' }}
      >
        {/* Screen bezel */}
        <div className="bg-pixel-black p-2 mb-4 border-4 border-gray-700">
          {/* Expression display */}
          <div className="text-right font-lcd text-gray-400 text-sm h-6 overflow-hidden">
            {expression || ' '}
          </div>
          
          {/* Main display */}
          <div 
            className="lcd-screen p-4 text-right font-lcd text-3xl overflow-hidden"
            style={{ minHeight: '60px' }}
          >
            {display}
          </div>
        </div>

        {/* Toggle scientific */}
        <button
          onClick={() => setShowScientific(!showScientific)}
          className="w-full mb-3 py-1 font-pixel text-xs text-white bg-pixel-shadow hover:bg-gray-600 border-2 border-pixel-black"
        >
          {showScientific ? 'HIDE' : 'SHOW'} SCIENTIFIC
        </button>

        {/* Scientific functions */}
        {showScientific && (
          <div className="grid grid-cols-5 gap-1 mb-3">
            <CalcButton value="sin" onClick={() => inputFunction('sin')} variant="function">sin</CalcButton>
            <CalcButton value="cos" onClick={() => inputFunction('cos')} variant="function">cos</CalcButton>
            <CalcButton value="tan" onClick={() => inputFunction('tan')} variant="function">tan</CalcButton>
            <CalcButton value="log" onClick={() => inputFunction('log')} variant="function">log</CalcButton>
            <CalcButton value="ln" onClick={() => inputFunction('ln')} variant="function">ln</CalcButton>
            <CalcButton value="√" onClick={() => inputFunction('√')} variant="function">√</CalcButton>
            <CalcButton value="x²" onClick={() => inputFunction('x²')} variant="function">x²</CalcButton>
            <CalcButton value="xʸ" onClick={() => inputFunction('xʸ')} variant="function">xʸ</CalcButton>
            <CalcButton value="π" onClick={() => inputFunction('π')} variant="function">π</CalcButton>
            <CalcButton value="e" onClick={() => inputFunction('e')} variant="function">e</CalcButton>
          </div>
        )}

        {/* Main buttons */}
        <div className="grid grid-cols-4 gap-2">
          {/* Row 1 */}
          <CalcButton value="C" onClick={clear} variant="action">C</CalcButton>
          <CalcButton value="(" onClick={() => inputFunction('(')} variant="function">(</CalcButton>
          <CalcButton value=")" onClick={() => inputFunction(')')} variant="function">)</CalcButton>
          <CalcButton value="⌫" onClick={backspace} variant="action">
            <Delete size={20} className="mx-auto" />
          </CalcButton>

          {/* Row 2 */}
          <CalcButton value="7" onClick={() => inputNumber('7')}>7</CalcButton>
          <CalcButton value="8" onClick={() => inputNumber('8')}>8</CalcButton>
          <CalcButton value="9" onClick={() => inputNumber('9')}>9</CalcButton>
          <CalcButton value="÷" onClick={() => inputOperator('÷')} variant="operator">÷</CalcButton>

          {/* Row 3 */}
          <CalcButton value="4" onClick={() => inputNumber('4')}>4</CalcButton>
          <CalcButton value="5" onClick={() => inputNumber('5')}>5</CalcButton>
          <CalcButton value="6" onClick={() => inputNumber('6')}>6</CalcButton>
          <CalcButton value="×" onClick={() => inputOperator('×')} variant="operator">×</CalcButton>

          {/* Row 4 */}
          <CalcButton value="1" onClick={() => inputNumber('1')}>1</CalcButton>
          <CalcButton value="2" onClick={() => inputNumber('2')}>2</CalcButton>
          <CalcButton value="3" onClick={() => inputNumber('3')}>3</CalcButton>
          <CalcButton value="-" onClick={() => inputOperator('-')} variant="operator">−</CalcButton>

          {/* Row 5 */}
          <CalcButton value="0" onClick={() => inputNumber('0')} wide>0</CalcButton>
          <CalcButton value="." onClick={() => inputNumber('.')}>.</CalcButton>
          <CalcButton value="+" onClick={() => inputOperator('+')} variant="operator">+</CalcButton>

          {/* Row 6 - Equals */}
          <CalcButton value="=" onClick={calculate} variant="operator" wide>=</CalcButton>
          <CalcButton value="^" onClick={() => inputOperator('^')} variant="operator">^</CalcButton>
        </div>

        {/* Brand */}
        <div className="mt-4 text-center">
          <span className="font-pixel text-xs text-pixel-black/60">BOHDI-CALC</span>
        </div>
      </div>

      {/* History Panel */}
      <div 
        className="w-full max-w-xs bg-pixel-black/90 border-4 border-pixel-shadow p-4"
        style={{ boxShadow: '6px 6px 0px #2d2d2d' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-pixel text-foamy-green text-xs">HISTORY</h3>
          <button 
            onClick={() => {
              setHistory([]);
              localStorage.removeItem('calc-history');
            }}
            className="text-gray-500 hover:text-white"
            title="Clear history"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {history.length === 0 ? (
          <p className="font-lcd text-gray-500 text-sm">No calculations yet</p>
        ) : (
          <div className="space-y-2">
            {history.map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  setDisplay(item.result);
                  setExpression(item.result);
                  setIsNewCalculation(true);
                }}
                className="w-full text-left p-2 bg-pixel-shadow hover:bg-gray-600 transition-colors border-2 border-pixel-black"
              >
                <div className="font-lcd text-gray-400 text-xs truncate">
                  {item.expression}
                </div>
                <div className="font-lcd text-foamy-green text-lg">
                  = {item.result}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Keyboard hints */}
        <div className="mt-6 pt-4 border-t-2 border-pixel-shadow">
          <p className="font-pixel text-xs text-gray-500 mb-2">KEYBOARD</p>
          <div className="font-lcd text-xs text-gray-400 space-y-1">
            <p>0-9, +, -, *, /</p>
            <p>Enter = Calculate</p>
            <p>Esc = Clear</p>
            <p>Backspace = Delete</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Calculator;

