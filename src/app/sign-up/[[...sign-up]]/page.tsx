'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SimpleAuthForm } from '@/components/auth/SimpleAuthForm';
import { useAuth } from '@/contexts/AuthContext';

export default function SignUpPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const [simpleMode, setSimpleMode] = useState<'signin' | 'signup'>('signup');

  // Redirect if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, router]);

  const handleSuccess = () => {
    router.push('/');
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pixel-black">
        <div className="font-pixel text-foamy-green animate-pulse">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-pixel-black p-4">
      <div className="relative">
        {/* Pixel frame decoration */}
        <div className="absolute -inset-4 border-4 border-ocean-blue bg-pixel-black/50" 
          style={{ boxShadow: '8px 8px 0px #2d2d2d' }} 
        />
        
        {/* Content */}
        <div className="relative z-10 min-w-[320px] p-4">
          <h1 className="font-pixel text-ocean-blue text-center text-lg mb-2">
            NEW PLAYER
          </h1>
          
          <p className="font-lcd text-gray-400 text-center text-sm mb-6">
            {simpleMode === 'signup' 
              ? 'Create your account! No email needed - just pick a username.'
              : 'Already have an account? Sign in below.'
            }
          </p>

          <SimpleAuthForm 
            mode={simpleMode} 
            onModeChange={setSimpleMode}
            onSuccess={handleSuccess}
          />
        </div>
        
        {/* Corner decorations */}
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-ocean-blue" />
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-ocean-blue" />
        <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-ocean-blue" />
        <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-ocean-blue" />
      </div>
    </div>
  );
}
