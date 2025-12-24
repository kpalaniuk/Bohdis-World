'use client';

import { HTMLAttributes, forwardRef } from 'react';
import Image from 'next/image';

interface PixelFrameProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  frameColor?: 'green' | 'blue' | 'white' | 'black';
  frameWidth?: 'thin' | 'normal' | 'thick';
}

const frameColors = {
  green: 'border-foamy-green',
  blue: 'border-ocean-blue',
  white: 'border-white',
  black: 'border-pixel-black',
};

const frameWidths = {
  thin: 'border-2',
  normal: 'border-4',
  thick: 'border-8',
};

export const PixelFrame = forwardRef<HTMLDivElement, PixelFrameProps>(
  (
    {
      src,
      alt = 'Image',
      width = 200,
      height = 200,
      frameColor = 'green',
      frameWidth = 'thick',
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={`
          relative
          inline-block
          ${className}
        `}
        {...props}
      >
        {/* Outer decorative frame */}
        <div
          className={`
            relative
            ${frameColors[frameColor]}
            ${frameWidths[frameWidth]}
            bg-pixel-black
            p-2
          `}
          style={{
            boxShadow: '6px 6px 0px #2d2d2d, 10px 10px 0px rgba(0,0,0,0.3)',
          }}
        >
          {/* Inner border */}
          <div className="border-2 border-pixel-shadow p-1">
            {/* Content area */}
            <div className="relative overflow-hidden bg-pixel-black">
              {src ? (
                <Image
                  src={src}
                  alt={alt}
                  width={width}
                  height={height}
                  className="pixelated object-cover"
                  style={{ 
                    imageRendering: 'pixelated',
                  }}
                />
              ) : (
                children
              )}
              
              {/* Subtle scanline overlay */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.5) 2px, rgba(0,0,0,0.5) 4px)',
                }}
              />
            </div>
          </div>
          
          {/* Corner decorations */}
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-foamy-green" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-foamy-green" />
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-foamy-green" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-foamy-green" />
        </div>
      </div>
    );
  }
);

PixelFrame.displayName = 'PixelFrame';

export default PixelFrame;

