import { DiagnosticStatus } from '@/types/portfolio';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { STATUS_LABELS } from '@/lib/scoring-config';

interface StatusBadgeProps {
  status: DiagnosticStatus;
  showLabel?: boolean;
  label?: string;  // Optional override label
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, showLabel = false, label: customLabel, size = 'md' }: StatusBadgeProps) {
  const config = {
    GREEN: {
      icon: CheckCircle,
      classes: 'status-good',
    },
    YELLOW: {
      icon: AlertTriangle,
      classes: 'status-warning',
    },
    RED: {
      icon: XCircle,
      classes: 'status-critical',
    },
  };

  const { icon: Icon, classes } = config[status];
  const displayLabel = customLabel || STATUS_LABELS[status];
  const iconSize = size === 'sm' ? 14 : 18;

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-medium',
      classes,
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
    )}>
      <Icon size={iconSize} />
      {showLabel && <span>{displayLabel}</span>}
    </div>
  );
}
