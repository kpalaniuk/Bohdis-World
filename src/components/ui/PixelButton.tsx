'use client';

import { ButtonHTMLAttributes, forwardRef, useState } from 'react';
import { LucideIcon } from 'lucide-react';

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

const variantStyles = {
  primary: {
    base: 'bg-ocean-blue text-white border-pixel-black',
    hover: 'hover:bg-[#5ba0e9]',
    active: 'bg-[#3a80c9]',
  },
  secondary: {
    base: 'bg-foamy-green text-pixel-black border-pixel-black',
    hover: 'hover:bg-[#a8e8ba]',
    active: 'bg-[#88c89a]',
  },
  success: {
    base: 'bg-foamy-green text-pixel-black border-pixel-black',
    hover: 'hover:bg-[#a8e8ba]',
    active: 'bg-[#88c89a]',
  },
  danger: {
    base: 'bg-sunset-orange text-white border-pixel-black',
    hover: 'hover:bg-[#ff7b5a]',
    active: 'bg-[#e55b3a]',
  },
  ghost: {
    base: 'bg-transparent text-foamy-green border-foamy-green',
    hover: 'hover:bg-foamy-green/10',
    active: 'bg-foamy-green/20',
  },
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-8 py-4 text-base',
};

export const PixelButton = forwardRef<HTMLButtonElement, PixelButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      icon: Icon,
      iconPosition = 'left',
      isLoading = false,
      className = '',
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const [isPressed, setIsPressed] = useState(false);

    const handleMouseDown = () => setIsPressed(true);
    const handleMouseUp = () => setIsPressed(false);
    const handleMouseLeave = () => setIsPressed(false);

    const styles = variantStyles[variant];
    const sizeStyle = sizeStyles[size];

    return (
      <button
        ref={ref}
        className={`
          relative
          font-pixel
          ${sizeStyle}
          ${styles.base}
          ${!disabled && styles.hover}
          border-4
          transition-transform
          duration-75
          cursor-pointer
          select-none
          uppercase
          tracking-wider
          ${isPressed && !disabled ? 'translate-x-1 translate-y-1' : ''}
          ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
        style={{
          boxShadow: isPressed || disabled 
            ? 'inset 2px 2px 0px rgba(0,0,0,0.3)' 
            : '4px 4px 0px #2d2d2d',
        }}
        disabled={disabled || isLoading}
        onClick={onClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        {...props}
      >
        <span className="flex items-center justify-center gap-2">
          {isLoading ? (
            <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {Icon && iconPosition === 'left' && <Icon size={size === 'sm' ? 14 : size === 'md' ? 18 : 22} />}
              {children}
              {Icon && iconPosition === 'right' && <Icon size={size === 'sm' ? 14 : size === 'md' ? 18 : 22} />}
            </>
          )}
        </span>
      </button>
    );
  }
);

PixelButton.displayName = 'PixelButton';

export default PixelButton;

