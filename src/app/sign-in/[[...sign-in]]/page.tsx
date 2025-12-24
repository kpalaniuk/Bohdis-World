'use client';

import { SignIn } from '@clerk/nextjs';
import { useState } from 'react';
import { SimpleAuthForm } from '@/components/auth/SimpleAuthForm';

export default function SignInPage() {
  const [authType, setAuthType] = useState<'simple' | 'clerk'>('simple');
  const [simpleMode, setSimpleMode] = useState<'signin' | 'signup'>('signin');

  return (
    <div className="min-h-screen flex items-center justify-center bg-pixel-black p-4">
      <div className="relative">
        {/* Pixel frame decoration */}
        <div className="absolute -inset-4 border-4 border-foamy-green bg-pixel-black/50" 
          style={{ boxShadow: '8px 8px 0px #2d2d2d' }} 
        />
        
        {/* Content */}
        <div className="relative z-10 min-w-[320px]">
          <h1 className="font-pixel text-foamy-green text-center text-lg mb-2 px-4">
            PLAYER LOGIN
          </h1>
          
          {/* Auth Type Switcher */}
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={() => setAuthType('simple')}
              className={`font-pixel text-xs px-3 py-2 border-2 transition-all ${
                authType === 'simple'
                  ? 'bg-foamy-green text-pixel-black border-foamy-green'
                  : 'bg-transparent text-gray-400 border-pixel-shadow hover:border-foamy-green hover:text-foamy-green'
              }`}
            >
              QUICK LOGIN
            </button>
            <button
              onClick={() => setAuthType('clerk')}
              className={`font-pixel text-xs px-3 py-2 border-2 transition-all ${
                authType === 'clerk'
                  ? 'bg-ocean-blue text-white border-ocean-blue'
                  : 'bg-transparent text-gray-400 border-pixel-shadow hover:border-ocean-blue hover:text-ocean-blue'
              }`}
            >
              EMAIL LOGIN
            </button>
          </div>

          {/* Simple Auth (Username/Password) */}
          {authType === 'simple' && (
            <div className="px-4">
              <p className="font-lcd text-gray-400 text-center text-sm mb-4">
                No email needed! Just pick a username.
              </p>
              <SimpleAuthForm 
                mode={simpleMode} 
                onModeChange={setSimpleMode}
              />
            </div>
          )}

          {/* Clerk Auth (Email) */}
          {authType === 'clerk' && (
            <SignIn 
              appearance={{
                elements: {
                  rootBox: 'mx-auto',
                  card: 'bg-pixel-black border-4 border-pixel-shadow shadow-none',
                  headerTitle: 'font-pixel text-foamy-green text-sm',
                  headerSubtitle: 'font-lcd text-gray-400',
                  socialButtonsBlockButton: 'bg-ocean-blue border-2 border-pixel-black font-pixel text-xs hover:bg-ocean-blue/80',
                  formButtonPrimary: 'bg-foamy-green text-pixel-black border-2 border-pixel-black font-pixel text-xs hover:bg-foamy-green/80',
                  formFieldInput: 'bg-pixel-black border-2 border-pixel-shadow text-white font-lcd focus:border-foamy-green',
                  formFieldLabel: 'font-lcd text-gray-300',
                  footerActionLink: 'text-foamy-green font-lcd hover:text-ocean-blue',
                  identityPreviewText: 'font-lcd text-white',
                  identityPreviewEditButton: 'text-foamy-green font-lcd',
                },
                variables: {
                  colorPrimary: '#98D8AA',
                  colorBackground: '#1a1a1a',
                  colorText: '#ffffff',
                  colorInputBackground: '#1a1a1a',
                  colorInputText: '#ffffff',
                  borderRadius: '0px',
                },
              }}
            />
          )}
        </div>
        
        {/* Corner decorations */}
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-foamy-green" />
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-foamy-green" />
        <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-foamy-green" />
        <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-foamy-green" />
      </div>
    </div>
  );
}
