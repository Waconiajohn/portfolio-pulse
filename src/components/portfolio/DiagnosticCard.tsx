import { DiagnosticResult, RiskTolerance } from '@/types/portfolio';
import { StatusBadge } from './StatusBadge';
import { EducationPopup } from './EducationPopup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, ArrowRight, Sparkles, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
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
  animationDelay?: number; // For staggered entrance
}

// Plain English explanations for different metric types
const getPlainEnglishExplanation = (status: 'GREEN' | 'YELLOW' | 'RED', categoryKey: string): string => {
  const explanations: Record<string, Record<string, string>> = {
    diversification: {
      GREEN: "Your investments are well spread out, reducing risk.",
      YELLOW: "Some areas could use more variety to protect you better.",
      RED: "Too much in one basket could hurt if markets drop.",
    },
    concentration: {
      GREEN: "No single investment dominates your portfolio.",
      YELLOW: "A few holdings are getting large – worth watching.",
      RED: "One investment is too dominant – this is risky.",
    },
    expenseRatio: {
      GREEN: "You're keeping costs low – more money stays invested.",
      YELLOW: "Fees are moderate – there's room to save more.",
      RED: "High fees are eating into your returns.",
    },
    taxEfficiency: {
      GREEN: "Great job placing investments in tax-smart accounts.",
      YELLOW: "Some tweaks could reduce your tax bill.",
      RED: "You may be paying more taxes than necessary.",
    },
    riskScore: {
      GREEN: "Your risk level matches your tolerance well.",
      YELLOW: "Risk is slightly off from your comfort zone.",
      RED: "Your portfolio risk doesn't match your goals.",
    },
    incomeGap: {
      GREEN: "Retirement income looks secure – well planned!",
      YELLOW: "A small gap exists – some adjustments may help.",
      RED: "Significant income shortfall projected – action needed.",
    },
    estatePlanning: {
      GREEN: "Your estate documents are in good shape.",
      YELLOW: "Some planning items need attention.",
      RED: "Important estate planning is missing.",
    },
    default: {
      GREEN: "This area looks healthy.",
      YELLOW: "There's room for improvement here.",
      RED: "This needs your attention.",
    },
  };

  const category = explanations[categoryKey] || explanations.default;
  return category[status] || explanations.default[status];
};

// Get action button text based on status
const getActionText = (status: 'GREEN' | 'YELLOW' | 'RED'): string => {
  switch (status) {
    case 'RED':
      return 'Fix This';
    case 'YELLOW':
      return 'Improve';
    case 'GREEN':
      return 'View Details';
    default:
      return 'View Details';
  }
};

export function DiagnosticCard({ 
  name, 
  subtitle,
  categoryKey, 
  result, 
  onViewDetails,
  scoringConfig = DEFAULT_SCORING_CONFIG,
  riskTolerance = 'Moderate',
  animationDelay = 0,
}: DiagnosticCardProps) {

  const getStatusGradient = () => {
    if (result.status === 'GREEN') return 'card-status-good';
    if (result.status === 'YELLOW') return 'card-status-warning';
    return 'card-status-critical';
  };

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

  const getStatusIcon = () => {
    if (result.status === 'GREEN') return <CheckCircle2 className="h-5 w-5 text-status-good" />;
    if (result.status === 'YELLOW') return <AlertTriangle className="h-5 w-5 text-status-warning" />;
    return <XCircle className="h-5 w-5 text-status-critical" />;
  };

  const getMetricColor = () => {
    if (result.status === 'GREEN') return 'text-status-good';
    if (result.status === 'YELLOW') return 'text-status-warning';
    return 'text-status-critical';
  };

  const plainEnglish = getPlainEnglishExplanation(result.status, categoryKey);
  const actionText = getActionText(result.status);

  return (
    <Card 
      className={cn(
        'card-interactive cursor-pointer group border-l-4 touch-manipulation overflow-hidden',
        'transition-all duration-300 rounded-2xl',
        getStatusGradient(),
        getGlowClass(),
        getStatusBorderClass(),
        animationDelay > 0 && 'opacity-0',
      )} 
      style={{
        animation: animationDelay > 0 ? `cardEntrance 0.5s ease-out ${animationDelay * 0.1}s forwards` : undefined,
      }}
      onClick={onViewDetails}
    >
      <CardHeader className="pb-2 p-4 sm:p-5 sm:pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <CardTitle className="text-base sm:text-lg font-semibold truncate">{name}</CardTitle>
              <EducationPopup 
                categoryKey={categoryKey} 
                scoringConfig={scoringConfig}
                riskTolerance={riskTolerance}
              />
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1 ml-7">
                {subtitle}
              </p>
            )}
          </div>
          <StatusBadge status={result.status} label={STATUS_LABELS[result.status]} showLabel size="sm" />
        </div>
      </CardHeader>
      
      <CardContent className="p-4 sm:p-5 pt-0 sm:pt-0 space-y-4">
        {/* Hero Metric Display */}
        {result.headlineMetric && (
          <div className="flex items-baseline gap-2">
            <span className={cn(
              'text-3xl sm:text-4xl font-mono font-bold tracking-tight',
              getMetricColor()
            )}>
              {result.headlineMetric}
            </span>
            {result.score !== undefined && (
              <span className="text-sm text-muted-foreground">
                score
              </span>
            )}
          </div>
        )}
        
        {/* Key Finding */}
        <p className="text-sm text-foreground/90 line-clamp-2 leading-relaxed">
          {result.keyFinding}
        </p>
        
        {/* Plain English Explanation */}
        <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
          <p className="text-xs text-muted-foreground flex items-start gap-2">
            <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
            <span className="italic">{plainEnglish}</span>
          </p>
        </div>
        
        {/* Action Button */}
        <Button 
          variant={result.status === 'RED' ? 'destructive' : result.status === 'YELLOW' ? 'secondary' : 'outline'}
          size="sm"
          className={cn(
            'w-full mt-2 group-hover:translate-x-0 transition-all',
            result.status === 'GREEN' && 'hover:bg-status-good/10 hover:text-status-good hover:border-status-good/30'
          )}
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
        >
          {actionText}
          <ArrowRight size={14} className="ml-1.5 transition-transform group-hover:translate-x-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

// Compact variant for mobile carousels
export function DiagnosticCardCompact({ 
  name, 
  categoryKey, 
  result, 
  onViewDetails,
}: Pick<DiagnosticCardProps, 'name' | 'categoryKey' | 'result' | 'onViewDetails'>) {

  const getStatusGradient = () => {
    if (result.status === 'GREEN') return 'card-status-good';
    if (result.status === 'YELLOW') return 'card-status-warning';
    return 'card-status-critical';
  };

  const getStatusBorderClass = () => {
    if (result.status === 'GREEN') return 'border-l-status-good';
    if (result.status === 'YELLOW') return 'border-l-status-warning';
    return 'border-l-status-critical';
  };

  const getMetricColor = () => {
    if (result.status === 'GREEN') return 'text-status-good';
    if (result.status === 'YELLOW') return 'text-status-warning';
    return 'text-status-critical';
  };

  return (
    <Card 
      className={cn(
        'card-interactive cursor-pointer border-l-4 touch-manipulation min-w-[280px] snap-center',
        'transition-all duration-300 rounded-2xl',
        getStatusGradient(),
        getStatusBorderClass(),
      )} 
      onClick={onViewDetails}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm truncate pr-2">{name}</h3>
          <StatusBadge status={result.status} size="sm" />
        </div>
        
        {result.headlineMetric && (
          <div className={cn('text-2xl font-mono font-bold', getMetricColor())}>
            {result.headlineMetric}
          </div>
        )}
        
        <p className="text-xs text-muted-foreground line-clamp-2">
          {result.keyFinding}
        </p>
        
        <button className="flex items-center text-xs font-medium text-primary">
          View details
          <ChevronRight size={12} className="ml-0.5" />
        </button>
      </CardContent>
    </Card>
  );
}
