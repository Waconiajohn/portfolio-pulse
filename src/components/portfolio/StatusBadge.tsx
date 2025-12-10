import { DiagnosticStatus } from '@/types/portfolio';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: DiagnosticStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, showLabel = false, size = 'md' }: StatusBadgeProps) {
  const config = {
    GREEN: {
      icon: CheckCircle,
      label: 'Good',
      classes: 'status-good',
    },
    YELLOW: {
      icon: AlertTriangle,
      label: 'Warning',
      classes: 'status-warning',
    },
    RED: {
      icon: XCircle,
      label: 'Critical',
      classes: 'status-critical',
    },
  };

  const { icon: Icon, label, classes } = config[status];
  const iconSize = size === 'sm' ? 14 : 18;

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-medium',
      classes,
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
    )}>
      <Icon size={iconSize} />
      {showLabel && <span>{label}</span>}
    </div>
  );
}
