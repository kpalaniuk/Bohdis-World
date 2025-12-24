'use client';

import Link from 'next/link';
import { Calculator, Brain, Gamepad2 } from 'lucide-react';
import { PixelCard } from '@/components/ui/PixelCard';
import { PixelButton } from '@/components/ui/PixelButton';
import { PixelFrame } from '@/components/ui/PixelFrame';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
      <PixelCard 
        variant="glass" 
        padding="lg" 
        className="max-w-2xl w-full mx-auto"
      >
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
          {/* Profile Image */}
          <div className="flex-shrink-0">
            <PixelFrame
              src="/bohdi.jpg"
              alt="Bohdi"
              width={180}
              height={180}
              frameColor="green"
              frameWidth="thick"
            />
          </div>

          {/* Bio */}
          <div className="text-center md:text-left">
            <h1 
              className="font-pixel text-foamy-green text-xl md:text-2xl mb-4"
              style={{ textShadow: '3px 3px 0px #2d2d2d' }}
            >
              HEY, I&apos;M BOHDI!
            </h1>
            
            <p className="font-lcd text-white text-lg md:text-xl leading-relaxed">
              I&apos;m <span className="text-ocean-blue font-bold">8 years old</span> and 
              I live in <span className="text-foamy-green">San Diego</span>. I&apos;m into 
              soccer, piano, gymnastics, Jiu Jitsu, and making stuff with my dad.
            </p>
            
            <p className="font-lcd text-gray-300 text-lg mt-4">
              I built this website to share some tools I think are cool — like a 
              calculator and math games where you can earn coins. Try jumping over 
              the obstacles in the background with{' '}
              <kbd className="px-2 py-1 bg-ocean-blue text-white font-pixel text-xs border-2 border-pixel-black">
                SPACE
              </kbd>{' '}
              while you&apos;re here!
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t-4 border-pixel-shadow my-6" />

        {/* Quick Links */}
        <div className="space-y-4">
          <h2 
            className="font-pixel text-ocean-blue text-sm text-center mb-6"
            style={{ textShadow: '2px 2px 0px #2d2d2d' }}
          >
            CHECK OUT MY STUFF
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Calculator */}
            <Link href="/calculator" className="block">
              <PixelButton
                variant="primary"
                size="lg"
                icon={Calculator}
                className="w-full"
              >
                Calculator
              </PixelButton>
            </Link>

            {/* Math Challenge */}
            <Link href="/math" className="block">
              <PixelButton
                variant="secondary"
                size="lg"
                icon={Brain}
                className="w-full"
              >
                Math
              </PixelButton>
            </Link>

            {/* Future Game (disabled) */}
            <PixelButton
              variant="ghost"
              size="lg"
              icon={Gamepad2}
              disabled
              className="w-full opacity-50"
              title="Coming Soon!"
            >
              Game
            </PixelButton>
          </div>

          <p className="text-center font-lcd text-gray-500 text-sm mt-4">
            Earn coins by solving math problems and spend them on game themes!
          </p>
        </div>

        {/* Fun stats */}
        <div className="mt-8 pt-6 border-t-4 border-pixel-shadow">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="font-pixel text-foamy-green text-lg">8</div>
              <div className="font-lcd text-gray-400 text-sm">Years Old</div>
            </div>
            <div>
              <div className="font-pixel text-ocean-blue text-lg">5+</div>
              <div className="font-lcd text-gray-400 text-sm">Hobbies</div>
            </div>
            <div>
              <div className="font-pixel text-sunset-orange text-lg">∞</div>
              <div className="font-lcd text-gray-400 text-sm">Fun Level</div>
            </div>
          </div>
        </div>
      </PixelCard>
    </div>
  );
}
