import { PortfolioAnalysis } from '@/types/portfolio';
import { ScoringConfig } from '@/lib/scoring-config';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileMetricsCarouselProps {
  analysis: PortfolioAnalysis;
  scoringConfig: ScoringConfig;
}

interface MetricItemProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
}

function MetricItem({ label, value, subValue, trend }: MetricItemProps) {
  return (
    <div className="flex-shrink-0 min-w-[120px] p-3 bg-card rounded-xl border border-border">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-lg font-semibold font-mono">{value}</span>
        {trend && (
          <span className={cn(
            "flex-shrink-0",
            trend === 'up' && "text-status-good",
            trend === 'down' && "text-status-critical",
            trend === 'neutral' && "text-muted-foreground"
          )}>
            {trend === 'up' && <TrendingUp size={14} />}
            {trend === 'down' && <TrendingDown size={14} />}
            {trend === 'neutral' && <Minus size={14} />}
          </span>
        )}
      </div>
      {subValue && (
        <div className="text-[10px] text-muted-foreground mt-0.5">{subValue}</div>
      )}
    </div>
  );
}

export function MobileMetricsCarousel({ analysis, scoringConfig }: MobileMetricsCarouselProps) {
  const feePercent = ((analysis.totalFees / (analysis.totalValue || 1)) * 100).toFixed(2);
  
  return (
    <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 py-2">
      <div className="flex gap-3 min-w-max pb-1">
        <MetricItem
          label="Portfolio Value"
          value={`$${(analysis.totalValue / 1000).toFixed(0)}K`}
        />
        <MetricItem
          label="Expected Return"
          value={`${(analysis.expectedReturn * 100).toFixed(1)}%`}
          trend={analysis.expectedReturn > 0.06 ? 'up' : 'neutral'}
        />
        <MetricItem
          label="Volatility"
          value={`${(analysis.volatility * 100).toFixed(1)}%`}
        />
        <MetricItem
          label="Sharpe Ratio"
          value={analysis.sharpeRatio.toFixed(2)}
          trend={analysis.sharpeRatio >= scoringConfig.sharpe.portfolioTarget ? 'up' : analysis.sharpeRatio < 0.3 ? 'down' : 'neutral'}
        />
        <MetricItem
          label="Total Fees"
          value={`$${(analysis.totalFees / 1000).toFixed(1)}K`}
          subValue={`${feePercent}%/yr`}
        />
      </div>
    </div>
  );
}
