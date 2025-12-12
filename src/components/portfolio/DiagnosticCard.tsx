import { DiagnosticResult, RiskTolerance } from '@/types/portfolio';
import { StatusBadge } from './StatusBadge';
import { EducationPopup } from './EducationPopup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_LABELS, ScoringConfig, DEFAULT_SCORING_CONFIG } from '@/lib/scoring-config';

interface DiagnosticCardProps {
  name: string;
  subtitle?: string;
  iconName: string;
  categoryKey: string;
  result: DiagnosticResult;
  onViewDetails: () => void;
  scoringConfig?: ScoringConfig;
  riskTolerance?: RiskTolerance;
}

interface DiagnosticCardProps {
  name: string;
  subtitle?: string;
  iconName: string;
  categoryKey: string;
  result: DiagnosticResult;
  onViewDetails: () => void;
  scoringConfig?: ScoringConfig;
  riskTolerance?: RiskTolerance;
}

export function DiagnosticCard({ 
  name, 
  subtitle,
  categoryKey, 
  result, 
  onViewDetails,
  scoringConfig = DEFAULT_SCORING_CONFIG,
  riskTolerance = 'Moderate'
}: DiagnosticCardProps) {

  const getGlowClass = () => {
    if (result.status === 'GREEN') return 'hover:glow-good';
    if (result.status === 'YELLOW') return 'hover:glow-warning';
    return 'hover:glow-critical';
  };

  const getStatusBorderClass = () => {
    if (result.status === 'GREEN') return 'border-l-status-good';
    if (result.status === 'YELLOW') return 'border-l-status-warning';
    return 'border-l-status-critical';
  };

  return (
    <Card 
      className={cn(
        'card-interactive cursor-pointer group border-l-4 touch-manipulation',
        getGlowClass(),
        getStatusBorderClass()
      )} 
      onClick={onViewDetails}
    >
      <CardHeader className="pb-2 p-3 sm:p-4 sm:pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-sm sm:text-base font-semibold truncate">{name}</CardTitle>
              <EducationPopup 
                categoryKey={categoryKey} 
                scoringConfig={scoringConfig}
                riskTolerance={riskTolerance}
              />
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <StatusBadge status={result.status} label={STATUS_LABELS[result.status]} showLabel size="sm" />
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0 space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {result.keyFinding}
        </p>
        <button 
          className="flex items-center text-xs font-medium text-primary group-hover:underline transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
        >
          View details
          <ChevronRight size={14} className="ml-0.5 transition-transform group-hover:translate-x-1" />
        </button>
      </CardContent>
    </Card>
  );
}
