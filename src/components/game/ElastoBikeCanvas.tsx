'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { CHARACTERS, useCharacterStore } from '@/stores/characterStore';
import { useCoinStore } from '@/stores/coinStore';
import { useElastoStore } from '@/stores/elastoStore';
import { useGameStore } from '@/stores/gameStore';
import { playSound } from '@/lib/sounds';
import { LEVELS } from './elasto/levels';
import { createSim, stepSim, TUNING } from './elasto/physics';
import { drawFrame, type Camera } from './elasto/render';
import type { Input, SimState } from './elasto/types';

const WIDTH = 960;
const HEIGHT = 540;
type Screen = 'levels' | 'playing' | 'crashed' | 'finished';

interface FinishInfo {
  ms: number;
  isNewBest: boolean;
  firstClear: boolean;
  coins: number;
}

function formatMs(ms?: number): string {
  if (ms === undefined) return '--:--.--';
  const centiseconds = Math.floor(ms / 10) % 100;
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}

export default function ElastoBikeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<SimState>(createSim(LEVELS[0]));
  const cameraRef = useRef<Camera>({ x: LEVELS[0].start.x, y: LEVELS[0].start.y });
  const keysRef = useRef(new Set<string>());
  const touchKeysRef = useRef(new Set<string>());
  const turnQueuedRef = useRef(false);
  const screenRef = useRef<Screen>('levels');
  const selectedRef = useRef(0);
  const levelIndexRef = useRef(0);
  const finishHandledRef = useRef(false);
  const lastPickupRef = useRef(0);
  const lastStatusRef = useRef<SimState['status']>('playing');
  const [screen, setScreenState] = useState<Screen>('levels');
  const [selected, setSelectedState] = useState(0);
  const [levelIndex, setLevelIndex] = useState(0);
  const [finishInfo, setFinishInfo] = useState<FinishInfo | null>(null);
  const [crashCounts, setCrashCounts] = useState<Record<number, number>>({});
  const [isTouch] = useState(() => typeof window !== 'undefined' && (
    'ontouchstart' in window || navigator.maxTouchPoints > 0
  ));
  const bestTimes = useElastoStore((state) => state.bestTimes);
  const unlockedLevel = useElastoStore((state) => state.unlockedLevel);

  const setScreen = useCallback((next: Screen) => {
    screenRef.current = next;
    setScreenState(next);
  }, []);

  const setSelected = useCallback((next: number) => {
    selectedRef.current = next;
    setSelectedState(next);
  }, []);

  const startLevel = useCallback((index: number) => {
    if (index > useElastoStore.getState().unlockedLevel) return;
    levelIndexRef.current = index;
    setLevelIndex(index);
    simRef.current = createSim(LEVELS[index]);
    cameraRef.current = { x: LEVELS[index].start.x, y: LEVELS[index].start.y };
    keysRef.current.clear();
    touchKeysRef.current.clear();
    turnQueuedRef.current = false;
    finishHandledRef.current = false;
    lastPickupRef.current = 0;
    lastStatusRef.current = 'playing';
    setFinishInfo(null);
    setScreen('playing');
  }, [setScreen]);

  const showLevelList = useCallback(() => {
    keysRef.current.clear();
    touchKeysRef.current.clear();
    setSelected(levelIndexRef.current);
    setScreen('levels');
  }, [setScreen, setSelected]);

  const finishLevel = useCallback((sim: SimState) => {
    if (finishHandledRef.current) return;
    finishHandledRef.current = true;
    const index = levelIndexRef.current;
    const ms = Math.round((sim.finishTime ?? sim.time) * 1000);
    const result = useElastoStore.getState().recordFinish(index, ms);
    const coins = result.firstClear
      ? 10 + 2 * sim.level.apples.length
      : result.isNewBest ? 3 : 0;
    if (coins > 0) useCoinStore.getState().addCoins(coins);
    if (useGameStore.getState().soundEnabled) playSound('powerup');
    if (result.isNewBest) {
      confetti({ particleCount: 110, spread: 75, origin: { y: 0.55 } });
    }
    setFinishInfo({ ms, ...result, coins });
    setScreen('finished');
  }, [setScreen]);

  useEffect(() => {
    const clearHeld = () => {
      keysRef.current.clear();
      touchKeysRef.current.clear();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') clearHeld();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.code.startsWith('Arrow') || event.code === 'Space') event.preventDefault();

      if (screenRef.current === 'levels') {
        const unlocked = useElastoStore.getState().unlockedLevel;
        if (event.code === 'ArrowLeft') setSelected(Math.max(0, selectedRef.current - 1));
        if (event.code === 'ArrowRight') setSelected(Math.min(unlocked, selectedRef.current + 1));
        if (event.code === 'ArrowUp') setSelected(Math.max(0, selectedRef.current - 5));
        if (event.code === 'ArrowDown') setSelected(Math.min(unlocked, selectedRef.current + 5));
        if (event.code === 'Enter') startLevel(selectedRef.current);
        return;
      }

      if (event.code === 'Escape') {
        showLevelList();
        return;
      }
      if (event.code === 'KeyR') {
        startLevel(levelIndexRef.current);
        return;
      }
      if (event.code === 'Enter' && screenRef.current === 'finished') {
        if (levelIndexRef.current === LEVELS.length - 1) showLevelList();
        else startLevel(levelIndexRef.current + 1);
        return;
      }
      if (event.code === 'Space' && !event.repeat && screenRef.current === 'playing') {
        turnQueuedRef.current = true;
      }
      keysRef.current.add(event.code);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (event.code.startsWith('Arrow') || event.code === 'Space') event.preventDefault();
      keysRef.current.delete(event.code);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearHeld);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearHeld);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [setSelected, showLevelList, startLevel]);

  useEffect(() => {
    let animationFrame = 0;
    let cancelled = false;
    let previous = performance.now();
    let accumulator = 0;

    const run = async () => {
      await Promise.all([
        document.fonts.load("16px 'Press Start 2P'"),
        document.fonts.load('20px VT323'),
      ]);
      if (cancelled) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = WIDTH * dpr;
      canvas.height = HEIGHT * dpr;

      const frame = (now: number) => {
        const elapsed = Math.min(0.05, Math.max(0, (now - previous) / 1000));
        previous = now;
        const sim = simRef.current;
        if (screenRef.current === 'playing') {
          accumulator += elapsed;
          while (accumulator >= TUNING.DT) {
            const keys = keysRef.current;
            const touches = touchKeysRef.current;
            const input: Input = {
              gas: keys.has('ArrowUp') || keys.has('KeyW') || touches.has('gas'),
              brake: keys.has('ArrowDown') || keys.has('KeyS') || touches.has('brake'),
              leanBack: keys.has('ArrowLeft') || keys.has('KeyA') || touches.has('back'),
              leanForward: keys.has('ArrowRight') || keys.has('KeyD') || touches.has('forward'),
              turnAround: turnQueuedRef.current,
            };
            turnQueuedRef.current = false;
            stepSim(sim, input, TUNING.DT);
            if (sim.applePickupCount > lastPickupRef.current) {
              lastPickupRef.current = sim.applePickupCount;
              if (useGameStore.getState().soundEnabled) playSound('coin');
            }
            if (lastStatusRef.current === 'playing' && sim.status === 'crashing') {
              // Count the crash the moment it happens, so pressing R during the tumble still counts toward SKIP.
              const crashedLevel = levelIndexRef.current;
              setCrashCounts((counts) => ({
                ...counts,
                [crashedLevel]: (counts[crashedLevel] ?? 0) + 1,
              }));
              if (useGameStore.getState().soundEnabled) playSound('collision');
            }
            lastStatusRef.current = sim.status;
            if (sim.status === 'finished') {
              finishLevel(sim);
              accumulator = 0;
              break;
            }
            if (sim.status === 'crashed') {
              setScreen('crashed');
              accumulator = 0;
              break;
            }
            accumulator -= TUNING.DT;
          }
        } else {
          accumulator = 0;
        }

        const camera = cameraRef.current;
        const targetX = sim.bike.p.x + sim.bike.dir * 2.5;
        const smoothing = 1 - Math.exp(-7 * elapsed);
        camera.x += (targetX - camera.x) * smoothing;
        camera.y += (sim.bike.p.y - camera.y) * smoothing;
        const selectedCharacter = useCharacterStore.getState().selectedCharacter;
        const riderColor = selectedCharacter ? CHARACTERS[selectedCharacter].primaryColor : '#ff6b4a';
        drawFrame(ctx, sim, camera, {
          width: WIDTH,
          height: HEIGHT,
          dpr,
          scale: 42,
          riderColor,
          bestTimeMs: useElastoStore.getState().bestTimes[levelIndexRef.current],
        });
        animationFrame = requestAnimationFrame(frame);
      };
      animationFrame = requestAnimationFrame(frame);
    };
    void run();
    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
    };
  }, [finishLevel, setScreen]);

  const holdHandlers = (control: string) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      touchKeysRef.current.add(control);
    },
    onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => {
      touchKeysRef.current.delete(control);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    },
    onPointerCancel: () => touchKeysRef.current.delete(control),
    onPointerLeave: () => touchKeysRef.current.delete(control),
  });

  const tapHandlers = (action: 'flip' | 'restart') => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      if (action === 'flip') turnQueuedRef.current = true;
      else startLevel(levelIndex);
    },
    onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    },
    onPointerCancel: () => undefined,
    onPointerLeave: () => undefined,
  });

  const touchButton = 'pointer-events-auto min-h-16 min-w-16 touch-none select-none border-2 border-white/80 bg-pixel-black/60 px-3 py-2 font-pixel text-[9px] text-white shadow-[3px_3px_0_#1a1a1a] active:bg-ocean-blue/80';

  return (
    <div className="w-full max-w-[960px]">
      <div className="relative aspect-video w-full touch-none overflow-hidden border-4 border-pixel-black bg-ocean-blue">
        <canvas
          ref={canvasRef}
          className="block h-full w-full touch-none"
          aria-label="Elasto Bike game"
        />

        {screen === 'levels' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-pixel-black/80 p-3 sm:p-6">
            <h2 className="mb-3 font-pixel text-sm text-foamy-green sm:mb-5 sm:text-xl">CHOOSE A LEVEL</h2>
            <div className="grid w-full max-w-4xl grid-cols-5 gap-1.5 sm:gap-3">
              {LEVELS.map((level, index) => {
                const locked = index > unlockedLevel;
                return (
                  <button
                    key={level.name}
                    type="button"
                    disabled={locked}
                    onClick={() => {
                      setSelected(index);
                      startLevel(index);
                    }}
                    className={`min-h-20 border-2 p-1 text-center transition-colors sm:min-h-28 sm:p-2 ${selected === index ? 'border-foamy-green bg-ocean-blue/70' : 'border-white/40 bg-pixel-shadow/80'} ${locked ? 'cursor-not-allowed opacity-45' : 'hover:border-foamy-green'}`}
                  >
                    <span className="block font-pixel text-xs text-sand-beige sm:text-base">{locked ? '🔒' : index + 1}</span>
                    <span className="mt-1 block font-pixel text-[6px] leading-3 text-white sm:text-[9px]">{level.name}</span>
                    <span className="mt-1 block font-lcd text-[10px] text-yellow-300 sm:text-sm">{formatMs(bestTimes[index])}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 font-lcd text-sm text-sand-beige sm:text-lg">ARROWS + ENTER, OR TAP</p>
          </div>
        )}

        {screen === 'crashed' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-pixel-black/70">
            <h2 className="font-pixel text-3xl text-sunset-orange">OUCH!</h2>
            <p className="mt-4 font-lcd text-2xl text-white">R to retry</p>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => startLevel(levelIndex)} className={touchButton}>RETRY</button>
              <button type="button" onClick={showLevelList} className={touchButton}>LEVELS</button>
              {levelIndex < LEVELS.length - 1 && (crashCounts[levelIndex] ?? 0) >= 8 && (
                <button
                  type="button"
                  onClick={() => {
                    const nextLevel = levelIndex + 1;
                    useElastoStore.getState().unlockLevel(nextLevel);
                    showLevelList();
                    setSelected(nextLevel);
                  }}
                  className={touchButton}
                >
                  SKIP <span className="font-sans text-lg">▶</span>
                </button>
              )}
            </div>
          </div>
        )}

        {screen === 'finished' && finishInfo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-pixel-black/75 text-center motion-reduce:transition-none">
            <h2 className="font-pixel text-2xl text-foamy-green sm:text-3xl">FINISHED!</h2>
            <p className="mt-3 font-lcd text-3xl text-white">{formatMs(finishInfo.ms)}</p>
            {finishInfo.isNewBest && <p className="mt-1 font-pixel text-sm text-yellow-300">NEW BEST!</p>}
            <p className="mt-2 font-lcd text-xl text-yellow-300">+{finishInfo.coins} COINS</p>
            {levelIndex === LEVELS.length - 1 && (
              <p className="mt-3 font-pixel text-sm text-coral-pink">YOU BEAT ALL 10!</p>
            )}
            <div className="mt-5 flex gap-2">
              {levelIndex < LEVELS.length - 1 && (
                <button type="button" onClick={() => startLevel(levelIndex + 1)} className={touchButton}>NEXT</button>
              )}
              <button type="button" onClick={() => startLevel(levelIndex)} className={touchButton}>RETRY</button>
              <button type="button" onClick={showLevelList} className={touchButton}>LEVELS</button>
            </div>
            <p className="mt-3 font-lcd text-base text-gray-200">Enter = next · R = retry · Esc = levels</p>
          </div>
        )}

        {isTouch && screen === 'playing' && (
          <div className="pointer-events-none absolute inset-0 touch-none">
            <div className="pointer-events-auto absolute right-2 top-14 flex gap-2">
              <button
                type="button"
                className={touchButton}
                {...tapHandlers('flip')}
              >FLIP <span className="font-sans text-lg">⟲</span></button>
              <button type="button" className={touchButton} {...tapHandlers('restart')}>RESTART</button>
            </div>
            <div className="pointer-events-auto absolute bottom-2 left-2 flex gap-2">
              <button type="button" className={touchButton} {...holdHandlers('back')}><span className="font-sans text-lg">◀</span> BACK</button>
              <button type="button" className={touchButton} {...holdHandlers('forward')}>FWD <span className="font-sans text-lg">▶</span></button>
            </div>
            <div className="pointer-events-auto absolute bottom-2 right-2 flex items-end gap-2">
              <button type="button" className={`${touchButton} min-h-20 min-w-20`} {...holdHandlers('gas')}>GAS <span className="font-sans text-lg">▲</span></button>
              <button type="button" className={touchButton} {...holdHandlers('brake')}>BRAKE <span className="font-sans text-lg">▼</span></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
