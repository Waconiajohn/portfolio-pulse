import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PerformanceMetrics, METRIC_EDUCATION } from '@/types/performance-metrics';
import { RiskTolerance } from '@/types/portfolio';
import { getMetricStatus } from '@/lib/performance-metrics';
import { useAppMode } from '@/contexts/AppModeContext';
import { TrendingUp, TrendingDown, Minus, HelpCircle, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceMetricsCardProps {
  metrics: PerformanceMetrics;
  riskTolerance: RiskTolerance;
}

const METRIC_DISPLAY_ORDER: (keyof PerformanceMetrics)[] = [
  'totalReturn',
  'cagr',
  'sharpeRatio',
  'sortinoRatio',
  'calmarRatio',
  'standardDeviation',
  'beta',
  'maxDrawdown',
  'expenseRatio',
];

const METRIC_LABELS: Record<keyof PerformanceMetrics, string> = {
  totalReturn: 'Total Return',
  cagr: 'CAGR',
  calmarRatio: 'Calmar Ratio',
  standardDeviation: 'Volatility',
  beta: 'Beta',
  sharpeRatio: 'Sharpe Ratio',
  sortinoRatio: 'Sortino Ratio',
  expenseRatio: 'Expense Ratio',
  maxDrawdown: 'Max Drawdown',
  lastUpdated: 'Last Updated',
};

function StatusIcon({ status }: { status: 'good' | 'warning' | 'poor' }) {
  if (status === 'good') return <TrendingUp className="h-3 w-3 text-[hsl(var(--status-good))]" />;
  if (status === 'poor') return <TrendingDown className="h-3 w-3 text-[hsl(var(--status-critical))]" />;
  return <Minus className="h-3 w-3 text-[hsl(var(--status-warning))]" />;
}

export function PerformanceMetricsCard({ metrics, riskTolerance }: PerformanceMetricsCardProps) {
  const { isConsumer, messaging } = useAppMode();
  
  // Calculate overall status
  const statuses = METRIC_DISPLAY_ORDER.map(key => 
    getMetricStatus(key, metrics[key] as number, riskTolerance)
  );
  const goodCount = statuses.filter(s => s.status === 'good').length;
  const poorCount = statuses.filter(s => s.status === 'poor').length;
  
  let overallStatus: 'good' | 'warning' | 'poor' = 'warning';
  if (goodCount >= 6) overallStatus = 'good';
  else if (poorCount >= 3) overallStatus = 'poor';

  const overallBadgeClass = {
    good: 'status-good',
    warning: 'status-warning',
    poor: 'status-critical',
  }[overallStatus];

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Performance Metrics</CardTitle>
          </div>
          <Badge className={overallBadgeClass}>
            {overallStatus === 'good' ? 'Strong' : overallStatus === 'poor' ? 'Needs Work' : 'Mixed'}
          </Badge>
        </div>
        {isConsumer && (
          <p className="text-sm text-muted-foreground mt-1">
            📊 These 9 metrics show how your portfolio is performing and where you can improve.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-1">
        {METRIC_DISPLAY_ORDER.map(key => {
          const status = getMetricStatus(key, metrics[key] as number, riskTolerance);
          const education = METRIC_EDUCATION[key];
          
          return (
            <div
              key={key}
              className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="flex items-center gap-2 text-sm font-medium text-left">
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      {METRIC_LABELS[key]}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs p-3">
                    <p className="font-medium mb-1">{METRIC_LABELS[key]}</p>
                    <p className="text-sm text-muted-foreground">
                      {isConsumer ? education.detailed : education.technical}
                    </p>
                    <p className="text-xs mt-2 text-muted-foreground">{education.goodVsBad}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "font-mono text-sm font-medium",
                  status.status === 'good' && 'text-[hsl(var(--status-good))]',
                  status.status === 'poor' && 'text-[hsl(var(--status-critical))]',
                  status.status === 'warning' && 'text-[hsl(var(--status-warning))]',
                )}>
                  {status.formattedValue}
                </span>
                <div className="flex items-center gap-1">
                  <StatusIcon status={status.status} />
                  <span className={cn(
                    "text-xs",
                    status.status === 'good' && 'text-[hsl(var(--status-good))]',
                    status.status === 'poor' && 'text-[hsl(var(--status-critical))]',
                    status.status === 'warning' && 'text-[hsl(var(--status-warning))]',
                  )}>
                    {status.label}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        
        {isConsumer && (
          <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="text-sm font-medium">💡 What This Means</div>
            <div className="text-xs text-muted-foreground mt-1">
              {overallStatus === 'good' 
                ? "Your portfolio metrics look healthy! You're getting good returns for the risk you're taking."
                : overallStatus === 'poor'
                ? "Several metrics need attention. Focus on reducing fees and improving diversification."
                : "Your portfolio has some strong areas and some that could improve. Review the metrics marked in yellow or red."}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
