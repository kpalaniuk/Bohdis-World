'use client';

import { useState } from 'react';
import { Check, Zap, Brain, Coins, Shield, ArrowUp } from 'lucide-react';
import { PixelCard } from '@/components/ui/PixelCard';
import { PixelButton } from '@/components/ui/PixelButton';
import { useCharacterStore, CHARACTERS, CharacterType, CharacterDef } from '@/stores/characterStore';
import { useAuth } from '@/contexts/AuthContext';

export function CharacterSelector() {
  const { user } = useAuth();
  const { selectCharacter } = useCharacterStore();
  const [selectedType, setSelectedType] = useState<CharacterType | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const characterList = Object.values(CHARACTERS);

  const handleSelect = (type: CharacterType) => {
    setSelectedType(type);
    setIsConfirming(false);
  };

  const handleConfirm = () => {
    if (selectedType) {
      selectCharacter(selectedType);
    }
  };

  const selectedCharacter = selectedType ? CHARACTERS[selectedType] : null;

  return (
    <div className="min-h-screen overflow-y-auto py-4 md:py-8">
      <div className="min-h-full flex items-start md:items-center justify-center px-4 md:px-8">
        <PixelCard variant="glass" padding="lg" className="max-w-4xl w-full my-auto">
          {/* Header */}
          <div className="text-center mb-6 md:mb-8">
            <h1 
              className="font-pixel text-foamy-green text-lg md:text-2xl mb-2 md:mb-3"
              style={{ textShadow: '3px 3px 0px #2d2d2d' }}
            >
              CHOOSE YOUR CHARACTER!
            </h1>
            <p className="font-lcd text-gray-300 text-base md:text-lg">
              Hey {user?.displayName || user?.username || 'Player'}! Pick your adventure buddy.
            </p>
            <p className="font-lcd text-gray-500 text-xs md:text-sm mt-1 md:mt-2">
              Each character has unique strengths in different games!
            </p>
          </div>

        {/* Character Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
          {characterList.map((char) => (
            <CharacterCard
              key={char.type}
              character={char}
              isSelected={selectedType === char.type}
              onClick={() => handleSelect(char.type)}
            />
          ))}
        </div>

        {/* Selected Character Details */}
        {selectedCharacter && (
          <div className="border-t-4 border-pixel-shadow pt-4 md:pt-6">
            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
              {/* Character Preview */}
              <div 
                className="w-20 h-20 md:w-32 md:h-32 mx-auto md:mx-0 flex-shrink-0 flex items-center justify-center border-4 border-pixel-black"
                style={{ 
                  backgroundColor: selectedCharacter.primaryColor,
                  boxShadow: '4px 4px 0px #2d2d2d'
                }}
              >
                <span className="text-4xl md:text-6xl">{selectedCharacter.emoji}</span>
              </div>

              {/* Character Info */}
              <div className="flex-1">
                <h3 
                  className="font-pixel text-base md:text-lg mb-1 md:mb-2 text-center md:text-left"
                  style={{ color: selectedCharacter.primaryColor, textShadow: '2px 2px 0px #2d2d2d' }}
                >
                  {selectedCharacter.name}
                </h3>
                <p className="font-lcd text-gray-300 text-sm md:text-base mb-3 md:mb-4 text-center md:text-left">
                  {selectedCharacter.description}
                </p>

                {/* Strengths */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <StrengthBar 
                    icon={Brain} 
                    label="Math Bonus" 
                    value={selectedCharacter.strengths.mathSpeed} 
                    maxValue={3}
                    color="#98D8AA"
                  />
                  <StrengthBar 
                    icon={ArrowUp} 
                    label="Jump Height" 
                    value={(selectedCharacter.strengths.jumpHeight - 0.9) * 10} 
                    maxValue={2.5}
                    color="#4A90D9"
                  />
                  <StrengthBar 
                    icon={Coins} 
                    label="Coin Bonus" 
                    value={selectedCharacter.strengths.coinBonus * 4} 
                    maxValue={1}
                    color="#FFD700"
                  />
                  <StrengthBar 
                    icon={Shield} 
                    label="Shield Power" 
                    value={(selectedCharacter.strengths.shieldDuration - 0.8) * 2} 
                    maxValue={1.4}
                    color="#9B59B6"
                  />
                </div>
              </div>
            </div>

            {/* Confirm Button */}
            <div className="mt-4 md:mt-6 flex gap-3 md:gap-4">
              {!isConfirming ? (
                <PixelButton
                  variant="primary"
                  size="lg"
                  onClick={() => setIsConfirming(true)}
                  className="w-full"
                >
                  SELECT {selectedCharacter.name.toUpperCase()}
                </PixelButton>
              ) : (
                <>
                  <PixelButton
                    variant="ghost"
                    size="lg"
                    onClick={() => setIsConfirming(false)}
                    className="flex-1"
                  >
                    BACK
                  </PixelButton>
                  <PixelButton
                    variant="secondary"
                    size="lg"
                    icon={Check}
                    onClick={handleConfirm}
                    className="flex-1"
                  >
                    CONFIRM!
                  </PixelButton>
                </>
              )}
            </div>
          </div>
        )}
        </PixelCard>
      </div>
    </div>
  );
}

interface CharacterCardProps {
  character: CharacterDef;
  isSelected: boolean;
  onClick: () => void;
}

function CharacterCard({ character, isSelected, onClick }: CharacterCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative p-3 md:p-4 border-4 transition-all duration-200
        ${isSelected 
          ? 'border-foamy-green bg-foamy-green/10 scale-105' 
          : 'border-pixel-shadow bg-pixel-black/50 hover:border-gray-500 hover:bg-pixel-shadow/30'
        }
      `}
      style={{ 
        boxShadow: isSelected ? '4px 4px 0px #2d2d2d' : '2px 2px 0px #1a1a1a',
      }}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-5 h-5 md:w-6 md:h-6 bg-foamy-green border-2 border-pixel-black flex items-center justify-center">
          <Check size={12} className="text-pixel-black" />
        </div>
      )}

      {/* Character emoji */}
      <div 
        className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 md:mb-3 flex items-center justify-center border-2 border-pixel-black"
        style={{ backgroundColor: character.primaryColor }}
      >
        <span className="text-2xl md:text-3xl">{character.emoji}</span>
      </div>

      {/* Character name */}
      <h4 
        className="font-pixel text-[10px] md:text-xs text-center truncate"
        style={{ color: isSelected ? character.primaryColor : '#ffffff' }}
      >
        {character.name}
      </h4>

      {/* Quick stats */}
      <div className="mt-1 md:mt-2 flex justify-center gap-1">
        {character.strengths.mathSpeed > 1 && (
          <span className="text-[8px] md:text-[10px]" title="Math bonus">🧠</span>
        )}
        {character.strengths.jumpHeight > 1.05 && (
          <span className="text-[8px] md:text-[10px]" title="Jump bonus">⬆️</span>
        )}
        {character.strengths.coinBonus > 0.1 && (
          <span className="text-[8px] md:text-[10px]" title="Coin bonus">💰</span>
        )}
        {character.strengths.shieldDuration > 1.1 && (
          <span className="text-[8px] md:text-[10px]" title="Shield bonus">🛡️</span>
        )}
      </div>
    </button>
  );
}

interface StrengthBarProps {
  icon: React.ComponentType<{ size: number; className?: string; style?: React.CSSProperties }>;
  label: string;
  value: number;
  maxValue: number;
  color: string;
}

function StrengthBar({ icon: Icon, label, value, maxValue, color }: StrengthBarProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);

  return (
    <div className="flex items-center gap-2">
      <Icon size={14} style={{ color }} />
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <span className="font-lcd text-gray-400 text-xs">{label}</span>
        </div>
        <div className="h-2 bg-pixel-shadow border border-pixel-black">
          <div 
            className="h-full transition-all duration-300"
            style={{ 
              width: `${percentage}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>
    </div>
  );
}

