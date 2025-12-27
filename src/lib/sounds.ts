// Sound effects utility using Web Audio API
// Creates simple 8-bit style sound effects programmatically

import { useGameStore } from '@/stores/gameStore';

type SoundType = 'jump' | 'doubleJump' | 'collision' | 'coin' | 'powerup' | 'gameOver' | 'obstaclePass';

class SoundManager {
  private audioContext: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    // Initialize audio context on first user interaction
    if (typeof window !== 'undefined') {
      try {
        this.soundEnabled = useGameStore.getState().soundEnabled;
        
        // Subscribe to sound enabled changes
        useGameStore.subscribe((state) => {
          this.soundEnabled = state.soundEnabled;
        });
      } catch (e) {
        // Store might not be initialized yet, default to enabled
        this.soundEnabled = true;
      }
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.warn('Web Audio API not supported');
        return null;
      }
    }
    
    // Resume context if suspended (required for autoplay policies)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    return this.audioContext;
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'square',
    volume: number = 0.1,
    startFrequency?: number
  ) {
    if (!this.soundEnabled) return;
    
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(startFrequency || frequency, ctx.currentTime);
      
      if (startFrequency && startFrequency !== frequency) {
        oscillator.frequency.exponentialRampToValueAtTime(frequency, ctx.currentTime + duration * 0.1);
      }
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      // Silently fail if audio can't be played
    }
  }

  playJump() {
    this.playTone(400, 0.1, 'square', 0.15);
  }

  playDoubleJump() {
    this.playTone(500, 0.08, 'square', 0.15);
    setTimeout(() => {
      this.playTone(600, 0.08, 'square', 0.15);
    }, 50);
  }

  playCollision() {
    // Low descending tone
    this.playTone(200, 0.2, 'sawtooth', 0.2, 300);
  }

  playCoin() {
    // Quick ascending chime
    this.playTone(800, 0.1, 'sine', 0.15, 600);
  }

  playPowerUp() {
    // Rising arpeggio
    [400, 500, 600].forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.15, 'sine', 0.2);
      }, i * 50);
    });
  }

  playGameOver() {
    // Descending sad tone
    this.playTone(300, 0.3, 'sawtooth', 0.25, 400);
    setTimeout(() => {
      this.playTone(200, 0.3, 'sawtooth', 0.25, 250);
    }, 200);
  }

  playObstaclePass() {
    // Quick success sound
    this.playTone(600, 0.05, 'square', 0.1);
  }
}

// Singleton instance
let soundManager: SoundManager | null = null;

export function getSoundManager(): SoundManager {
  if (!soundManager) {
    soundManager = new SoundManager();
  }
  return soundManager;
}

// Convenience functions
export function playSound(type: SoundType) {
  const manager = getSoundManager();
  switch (type) {
    case 'jump':
      manager.playJump();
      break;
    case 'doubleJump':
      manager.playDoubleJump();
      break;
    case 'collision':
      manager.playCollision();
      break;
    case 'coin':
      manager.playCoin();
      break;
    case 'powerup':
      manager.playPowerUp();
      break;
    case 'gameOver':
      manager.playGameOver();
      break;
    case 'obstaclePass':
      manager.playObstaclePass();
      break;
  }
}

