import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './card';

type StatusType = 'good' | 'warning' | 'critical' | 'neutral' | 'partner';

interface GradientCardProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: StatusType;
  glow?: boolean;
  interactive?: boolean;
  glass?: boolean;
  children: React.ReactNode;
}

const statusGradients: Record<StatusType, string> = {
  good: 'bg-status-good-gradient',
  warning: 'bg-status-warning-gradient',
  critical: 'bg-status-critical-gradient',
  neutral: '',
  partner: 'bg-gradient-to-br from-partner/10 via-transparent to-transparent',
};

const statusGlows: Record<StatusType, string> = {
  good: 'hover:shadow-glow-green',
  warning: 'hover:shadow-glow-yellow',
  critical: 'hover:shadow-glow-red',
  neutral: 'hover:shadow-soft-lg',
  partner: 'hover:shadow-[0_0_30px_-5px_hsl(280_60%_60%_/_0.3)]',
};

export function GradientCard({
  status = 'neutral',
  glow = false,
  interactive = false,
  glass = false,
  className,
  children,
  ...props
}: GradientCardProps) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border/50',
        statusGradients[status],
        interactive && 'cursor-pointer transition-all duration-300 ease-smooth',
        interactive && 'hover:translate-y-[-2px] hover:border-primary/30 hover:shadow-card-hover',
        interactive && 'active:translate-y-0',
        glow && statusGlows[status],
        glass && 'backdrop-blur-glass bg-card/60',
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
}

// Hero metric card variant
interface HeroMetricCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  status?: StatusType;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function HeroMetricCard({
  title,
  value,
  subtitle,
  status = 'neutral',
  icon,
  action,
  className,
}: HeroMetricCardProps) {
  return (
    <GradientCard status={status} interactive glow className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon && (
              <div className={cn(
                'p-2 rounded-xl',
                status === 'good' && 'bg-status-good/10 text-status-good',
                status === 'warning' && 'bg-status-warning/10 text-status-warning',
                status === 'critical' && 'bg-status-critical/10 text-status-critical',
                status === 'neutral' && 'bg-muted text-muted-foreground',
                status === 'partner' && 'bg-partner/10 text-partner',
              )}>
                {icon}
              </div>
            )}
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </CardTitle>
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {typeof value === 'string' || typeof value === 'number' ? (
            <div className="hero-metric">{value}</div>
          ) : (
            value
          )}
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </GradientCard>
  );
}

// Status indicator card
interface StatusCardProps {
  status: StatusType;
  title: string;
  description: string;
  metric?: string | number;
  metricLabel?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function StatusCard({
  status,
  title,
  description,
  metric,
  metricLabel,
  icon,
  onClick,
  className,
}: StatusCardProps) {
  const statusColors = {
    good: 'border-l-status-good',
    warning: 'border-l-status-warning',
    critical: 'border-l-status-critical',
    neutral: 'border-l-muted',
    partner: 'border-l-partner',
  };

  return (
    <GradientCard 
      status={status} 
      interactive={!!onClick} 
      glow 
      className={cn('border-l-4', statusColors[status], className)}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {icon && (
                <span className={cn(
                  status === 'good' && 'text-status-good',
                  status === 'warning' && 'text-status-warning',
                  status === 'critical' && 'text-status-critical',
                  status === 'neutral' && 'text-muted-foreground',
                  status === 'partner' && 'text-partner',
                )}>
                  {icon}
                </span>
              )}
              <h3 className="font-semibold truncate">{title}</h3>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          </div>
          
          {metric !== undefined && (
            <div className="text-right shrink-0">
              <div className={cn(
                'text-2xl font-mono font-bold',
                status === 'good' && 'text-status-good',
                status === 'warning' && 'text-status-warning',
                status === 'critical' && 'text-status-critical',
              )}>
                {metric}
              </div>
              {metricLabel && (
                <div className="text-xs text-muted-foreground">{metricLabel}</div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </GradientCard>
  );
}

// Glass panel variant for floating elements
interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function GlassPanel({ className, children, ...props }: GlassPanelProps) {
  return (
    <div
      className={cn(
        'rounded-2xl p-4',
        'bg-card/60 backdrop-blur-glass',
        'border border-border/50',
        'shadow-glass',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Metric display component
interface MetricDisplayProps {
  label: string;
  value: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function MetricDisplay({
  label,
  value,
  trend,
  trendValue,
  size = 'md',
  className,
}: MetricDisplayProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div className={cn('space-y-1', className)}>
      <div className="metric-label">{label}</div>
      <div className={cn('font-mono font-bold', sizeClasses[size])}>
        {value}
      </div>
      {trend && trendValue && (
        <div className={cn(
          'flex items-center gap-1 text-xs font-medium',
          trend === 'up' && 'text-status-good',
          trend === 'down' && 'text-status-critical',
          trend === 'neutral' && 'text-muted-foreground',
        )}>
          {trend === 'up' && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          )}
          {trend === 'down' && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          )}
          {trendValue}
        </div>
      )}
    </div>
  );
}
