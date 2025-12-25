'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface SimpleAuthFormProps {
  mode: 'signin' | 'signup';
  onModeChange?: (mode: 'signin' | 'signup') => void;
}

export function SimpleAuthForm({ mode, onModeChange }: SimpleAuthFormProps) {
  const { signInWithUsername, signUpWithUsername } = useAuth();
  const router = useRouter();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'signin') {
        const result = await signInWithUsername(username, password);
        if (result.error) {
          setError(result.error);
        } else {
          router.push('/');
        }
      } else {
        const result = await signUpWithUsername(username, password, displayName || undefined);
        if (result.error) {
          setError(result.error);
        } else {
          // After signup, go to profile to complete setup
          router.push('/profile');
        }
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClasses = `
    w-full px-4 py-3
    bg-pixel-black
    border-4 border-pixel-shadow
    text-white font-lcd text-lg
    focus:border-foamy-green focus:outline-none
    placeholder:text-gray-500
    transition-colors
  `;

  const buttonClasses = `
    w-full py-3 px-6
    font-pixel text-sm
    border-4 border-pixel-black
    transition-all duration-100
    disabled:opacity-50 disabled:cursor-not-allowed
    hover:translate-y-[-2px] active:translate-y-[2px]
  `;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
      {/* Username Input */}
      <div>
        <label className="block font-lcd text-gray-300 mb-2 text-sm">
          USERNAME
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="enter username..."
          className={inputClasses}
          required
          minLength={3}
          maxLength={20}
          pattern="[a-zA-Z0-9_]+"
          autoComplete="username"
        />
      </div>

      {/* Display Name (signup only) */}
      {mode === 'signup' && (
        <div>
          <label className="block font-lcd text-gray-300 mb-2 text-sm">
            DISPLAY NAME <span className="text-gray-500">(optional)</span>
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="your character name..."
            className={inputClasses}
            maxLength={30}
          />
        </div>
      )}

      {/* Password Input */}
      <div>
        <label className="block font-lcd text-gray-300 mb-2 text-sm">
          PASSWORD
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className={inputClasses}
          required
          minLength={4}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        />
        {mode === 'signup' && (
          <p className="mt-1 font-lcd text-gray-500 text-xs">
            At least 4 characters
          </p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-900/50 border-2 border-red-500 text-red-300 font-lcd text-sm animate-pulse">
          ⚠ {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className={`${buttonClasses} ${
          mode === 'signin' 
            ? 'bg-foamy-green text-pixel-black hover:bg-[#a8e8ba]'
            : 'bg-ocean-blue text-white hover:bg-[#5aa0e9]'
        }`}
        style={{ boxShadow: '4px 4px 0px #2d2d2d' }}
      >
        {isLoading ? (
          <span className="animate-pulse">LOADING...</span>
        ) : (
          mode === 'signin' ? 'START GAME' : 'CREATE CHARACTER'
        )}
      </button>

      {/* Mode Switch */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={() => onModeChange?.(mode === 'signin' ? 'signup' : 'signin')}
          className="font-lcd text-gray-400 hover:text-foamy-green transition-colors text-sm"
        >
          {mode === 'signin' ? (
            <>New player? <span className="text-foamy-green">Create account</span></>
          ) : (
            <>Already playing? <span className="text-ocean-blue">Sign in</span></>
          )}
        </button>
      </div>
    </form>
  );
}

