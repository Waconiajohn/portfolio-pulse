import { cn } from '@/lib/utils';

interface HealthScoreProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function HealthScore({ score, size = 'md' }: HealthScoreProps) {
  const getColor = () => {
    if (score >= 70) return 'text-status-good';
    if (score >= 40) return 'text-status-warning';
    return 'text-status-critical';
  };

  const getGlow = () => {
    if (score >= 70) return 'glow-good';
    if (score >= 40) return 'glow-warning';
    return 'glow-critical';
  };

  const sizeClasses = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-20 h-20 text-2xl',
    lg: 'w-28 h-28 text-4xl',
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={cn('relative', sizeClasses[size])}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          className={cn(getColor(), 'transition-all duration-700 ease-out')}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <div className={cn(
        'absolute inset-0 flex items-center justify-center font-mono font-semibold',
        getColor(),
        getGlow()
      )}>
        {score}
      </div>
    </div>
  );
}
