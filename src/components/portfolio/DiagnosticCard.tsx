import { DiagnosticResult, RiskTolerance } from '@/types/portfolio';
import { StatusBadge } from './StatusBadge';
import { EducationPopup } from './EducationPopup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ChevronRight, 
  Shield, 
  ShieldAlert, 
  TrendingUp, 
  DollarSign, 
  Receipt, 
  PieChart, 
  BarChart3, 
  Umbrella, 
  Settings2, 
  ClipboardCheck,
  Wallet,
  FileQuestion,
  Layers,
  Activity,
  Percent,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_LABELS, ScoringConfig, DEFAULT_SCORING_CONFIG } from '@/lib/scoring-config';

const iconMap: Record<string, LucideIcon> = {
  Shield, ShieldAlert, TrendingUp, DollarSign, Receipt, 
  PieChart, BarChart3, Umbrella, Settings2, ClipboardCheck, Wallet, FileQuestion,
  Layers, Activity, Percent
};

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
  iconName, 
  categoryKey, 
  result, 
  onViewDetails,
  scoringConfig = DEFAULT_SCORING_CONFIG,
  riskTolerance = 'Moderate'
}: DiagnosticCardProps) {
  const IconComponent = iconMap[iconName] || FileQuestion;

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
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-secondary shrink-0">
              <IconComponent size={16} className="text-primary sm:w-[18px] sm:h-[18px]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <CardTitle className="text-xs sm:text-sm font-medium truncate">{name}</CardTitle>
                <EducationPopup 
                  categoryKey={categoryKey} 
                  scoringConfig={scoringConfig}
                  riskTolerance={riskTolerance}
                />
              </div>
              {subtitle && (
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <StatusBadge status={result.status} label={STATUS_LABELS[result.status]} showLabel size="sm" />
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0 space-y-2 sm:space-y-3">
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
          {result.keyFinding}
        </p>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Primary Metric</div>
            <div className="font-mono text-xs sm:text-sm font-medium text-foreground">
              {result.headlineMetric}
            </div>
          </div>
          <div className="flex items-center text-muted-foreground group-hover:text-primary transition-colors">
            <span className="text-[10px] sm:text-xs mr-1 hidden xs:inline">Details</span>
            <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
