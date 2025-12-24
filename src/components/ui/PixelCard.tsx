'use client';

import { HTMLAttributes, forwardRef } from 'react';

interface PixelCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'solid' | 'glass' | 'outline';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  glow?: boolean;
  glowColor?: 'green' | 'blue';
}

const variantStyles = {
  solid: 'bg-pixel-black border-pixel-shadow',
  glass: 'bg-pixel-black/90 backdrop-blur-md border-pixel-shadow',
  outline: 'bg-transparent border-foamy-green',
};

const paddingStyles = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-6',
  lg: 'p-8',
};

export const PixelCard = forwardRef<HTMLDivElement, PixelCardProps>(
  (
    {
      children,
      variant = 'glass',
      padding = 'md',
      glow = false,
      glowColor = 'green',
      className = '',
      ...props
    },
    ref
  ) => {
    const glowStyles = glow
      ? glowColor === 'green'
        ? 'shadow-[0_0_20px_rgba(152,216,170,0.3)]'
        : 'shadow-[0_0_20px_rgba(74,144,217,0.3)]'
      : '';

    return (
      <div
        ref={ref}
        className={`
          border-4
          ${variantStyles[variant]}
          ${paddingStyles[padding]}
          ${glowStyles}
          relative
          ${className}
        `}
        style={{
          boxShadow: glow 
            ? undefined 
            : '6px 6px 0px #2d2d2d, 10px 10px 0px rgba(0,0,0,0.2)',
        }}
        {...props}
      >
        {/* Corner decorations for pixel effect */}
        <div className="absolute top-0 left-0 w-2 h-2 bg-pixel-shadow" />
        <div className="absolute top-0 right-0 w-2 h-2 bg-pixel-shadow" />
        <div className="absolute bottom-0 left-0 w-2 h-2 bg-pixel-shadow" />
        <div className="absolute bottom-0 right-0 w-2 h-2 bg-pixel-shadow" />
        
        {children}
      </div>
    );
  }
);

PixelCard.displayName = 'PixelCard';

export default PixelCard;

