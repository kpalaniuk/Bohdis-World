'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PixelButton } from '@/components/ui/PixelButton';

interface BohdiClaimProps {
  available: boolean;
  onSuccess?: () => void;
  onClaimed?: () => void;
}

export function BohdiClaim({ available, onSuccess, onClaimed }: BohdiClaimProps) {
  const { verifyBohdi, claimBohdi } = useAuth();
  const [step, setStep] = useState<'closed' | 'answer' | 'account'>('closed');
  const [answer, setAnswer] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('Bohdi');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  if (!available) return null;
  if (unavailable) {
    return <div className="mb-5 p-3 bg-red-900/50 border-2 border-red-500 text-red-300 font-lcd text-sm">⚠ {error}</div>;
  }

  const goBack = () => {
    setStep('closed');
    setAnswer('');
    setError(null);
  };

  const checkAnswer = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const result = await verifyBohdi(answer);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      if (result.error.includes('already set up')) setUnavailable(true);
      return;
    }
    setStep('account');
  };

  const createAccount = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords must match');
      return;
    }
    setLoading(true);
    const result = await claimBohdi(username, password, displayName || undefined);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onClaimed?.();
    onSuccess?.();
  };

  if (step === 'closed') {
    return (
      <div className="mb-5 w-full">
        <PixelButton type="button" variant="success" size="lg" className="w-full" onClick={() => setStep('answer')}>
          I&apos;M BOHDI
        </PixelButton>
        <div className="border-t-2 border-pixel-shadow mt-5" />
      </div>
    );
  }

  const inputClasses = 'w-full px-4 py-3 bg-pixel-black border-4 border-pixel-shadow text-white font-lcd text-lg focus:border-foamy-green focus:outline-none placeholder:text-gray-500';

  return (
    <form onSubmit={step === 'answer' ? checkAnswer : createAccount} className="mb-5 w-full space-y-4 border-4 border-foamy-green p-4">
      <h2 className="text-center font-pixel text-foamy-green text-lg">
        {step === 'answer' ? 'HEY BOHDI!' : 'YOU GOT IT!'}
      </h2>
      {step === 'answer' ? (
        <>
          <p className="font-lcd text-white text-center">What is your dad&apos;s favorite kind of dessert?</p>
          <input
            type="text"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            className={inputClasses}
            maxLength={100}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            required
            autoFocus
          />
          <PixelButton type="submit" variant="success" className="w-full" isLoading={loading}>CHECK</PixelButton>
        </>
      ) : (
        <>
          <p className="font-lcd text-white text-center">You got it! Now make your new login.</p>
          <label className="block font-lcd text-gray-300 text-sm">USERNAME
            <input type="text" value={username} onChange={(event) => setUsername(event.target.value)} className={`${inputClasses} mt-2`} minLength={3} maxLength={20} pattern="[a-zA-Z0-9_]+" autoComplete="username" required />
          </label>
          <label className="block font-lcd text-gray-300 text-sm">DISPLAY NAME
            <input type="text" value={displayName} onChange={(event) => setDisplayName(event.target.value)} className={`${inputClasses} mt-2`} maxLength={30} autoComplete="nickname" />
          </label>
          <label className="block font-lcd text-gray-300 text-sm">PASSWORD
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className={`${inputClasses} mt-2`} minLength={6} maxLength={200} autoComplete="new-password" required />
          </label>
          <label className="block font-lcd text-gray-300 text-sm">CONFIRM PASSWORD
            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={`${inputClasses} mt-2`} minLength={6} maxLength={200} autoComplete="new-password" required />
          </label>
          <PixelButton type="submit" variant="success" className="w-full" isLoading={loading}>CREATE MY ACCOUNT</PixelButton>
        </>
      )}
      {error && <div className="p-3 bg-red-900/50 border-2 border-red-500 text-red-300 font-lcd text-sm">⚠ {error}</div>}
      <button type="button" onClick={goBack} className="w-full font-lcd text-gray-400 hover:text-foamy-green text-sm">
        Not Bohdi? Go back
      </button>
    </form>
  );
}
