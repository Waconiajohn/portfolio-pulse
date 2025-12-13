import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  format?: 'currency' | 'percentage' | 'compact' | 'number';
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  colorize?: boolean; // true = positive green, negative red
  previousValue?: number; // for change animation
  showChange?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'hero';
}

export function AnimatedNumber({
  value,
  duration = 800,
  format = 'number',
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
  colorize = false,
  previousValue,
  showChange = false,
  size = 'md',
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(previousValue ?? value);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const startValueRef = useRef(previousValue ?? value);

  useEffect(() => {
    if (value === displayValue) return;

    setIsAnimating(true);
    startTimeRef.current = undefined;
    startValueRef.current = displayValue;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const current = startValueRef.current + (value - startValueRef.current) * easeOut;
      setDisplayValue(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
        setIsAnimating(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  const formatValue = (val: number): string => {
    switch (format) {
      case 'currency':
        if (Math.abs(val) >= 1000000) {
          return `$${(val / 1000000).toFixed(decimals || 2)}M`;
        }
        if (Math.abs(val) >= 1000) {
          return `$${(val / 1000).toFixed(decimals || 1)}K`;
        }
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(val);
      
      case 'compact':
        if (Math.abs(val) >= 1000000) {
          return `${(val / 1000000).toFixed(decimals || 1)}M`;
        }
        if (Math.abs(val) >= 1000) {
          return `${(val / 1000).toFixed(decimals || 1)}K`;
        }
        return val.toFixed(decimals);
      
      case 'percentage':
        return `${val.toFixed(decimals || 1)}%`;
      
      default:
        return val.toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
    }
  };

  const getColorClass = () => {
    if (!colorize) return '';
    if (value > 0) return 'text-status-good';
    if (value < 0) return 'text-status-critical';
    return 'text-muted-foreground';
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'text-lg sm:text-xl';
      case 'md':
        return 'text-2xl sm:text-3xl';
      case 'lg':
        return 'text-3xl sm:text-4xl';
      case 'hero':
        return 'text-4xl sm:text-5xl lg:text-6xl';
      default:
        return 'text-2xl sm:text-3xl';
    }
  };

  const change = previousValue !== undefined ? value - previousValue : 0;
  const changePercent = previousValue && previousValue !== 0 
    ? ((value - previousValue) / Math.abs(previousValue)) * 100 
    : 0;

  return (
    <div className="flex flex-col">
      <span
        className={cn(
          'font-mono font-bold tracking-tight tabular-nums transition-colors duration-300',
          getSizeClass(),
          getColorClass(),
          isAnimating && 'animate-number-count',
          className
        )}
      >
        {prefix}
        {formatValue(displayValue)}
        {suffix}
      </span>
      
      {showChange && previousValue !== undefined && (
        <span
          className={cn(
            'text-xs font-medium flex items-center gap-1 mt-1',
            change >= 0 ? 'text-status-good' : 'text-status-critical'
          )}
        >
          {change >= 0 ? (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          )}
          {change >= 0 ? '+' : ''}{formatValue(change)}
          <span className="text-muted-foreground">
            ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
          </span>
        </span>
      )}
    </div>
  );
}

// Simplified variant for inline use
export function AnimatedValue({
  value,
  format = 'number',
  decimals = 0,
  className,
  colorize = false,
}: Pick<AnimatedNumberProps, 'value' | 'format' | 'decimals' | 'className' | 'colorize'>) {
  return (
    <AnimatedNumber
      value={value}
      format={format}
      decimals={decimals}
      className={className}
      colorize={colorize}
      duration={600}
      size="md"
    />
  );
}
