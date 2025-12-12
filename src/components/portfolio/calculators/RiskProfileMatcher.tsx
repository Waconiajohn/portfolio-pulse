import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RiskTolerance } from '@/types/portfolio';
import { Shield, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RiskProfileMatcherProps {
  riskTolerance: RiskTolerance;
  actualVolatility: number;
  expectedReturn: number;
}

const RISK_TARGETS: Record<RiskTolerance, { volatility: number; label: string; emoji: string }> = {
  Conservative: { volatility: 0.08, label: 'Conservative', emoji: '🛡️' },
  Moderate: { volatility: 0.12, label: 'Moderate', emoji: '⚖️' },
  Aggressive: { volatility: 0.16, label: 'Aggressive', emoji: '🚀' },
};

export function RiskProfileMatcher({ 
  riskTolerance, 
  actualVolatility,
  expectedReturn 
}: RiskProfileMatcherProps) {
  const target = RISK_TARGETS[riskTolerance];
  const targetVolatility = target.volatility;
  const volatilityDiff = actualVolatility - targetVolatility;
  const isOverRisk = volatilityDiff > 0.02;
  const isUnderRisk = volatilityDiff < -0.02;
  const isAligned = !isOverRisk && !isUnderRisk;

  const getStatusColor = () => {
    if (isAligned) return 'text-green-500';
    if (isOverRisk) return 'text-amber-500';
    return 'text-blue-500';
  };

  const getStatusIcon = () => {
    if (isAligned) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (isOverRisk) return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    return <Shield className="h-5 w-5 text-blue-500" />;
  };

  const getStatusMessage = () => {
    if (isAligned) {
      return "Your portfolio's risk level matches your selected tolerance.";
    }
    if (isOverRisk) {
      return `Your portfolio is riskier than your ${riskTolerance.toLowerCase()} profile suggests. Consider rebalancing toward bonds or less volatile assets.`;
    }
    return `Your portfolio is more conservative than needed. You may be sacrificing returns without adding value.`;
  };

  // Historical context for volatility
  const getHistoricalContext = () => {
    const actualPct = actualVolatility * 100;
    if (actualPct > 18) {
      return "With this volatility, you might see 15-20% drops in bad years (like 2022).";
    }
    if (actualPct > 12) {
      return "You could experience 10-15% declines in bad years, roughly once every 3-4 years.";
    }
    return "Your portfolio should have smaller swings, typically under 10% in down years.";
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Risk Profile Match
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Compare your actual portfolio risk to your selected tolerance
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Profile Display */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
          <div className="flex items-center gap-2">
            <span className="text-xl">{target.emoji}</span>
            <div>
              <div className="text-xs text-muted-foreground">Your Risk Tolerance</div>
              <div className="font-medium">{target.label}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Target Volatility</div>
            <div className="font-mono font-medium">{(targetVolatility * 100).toFixed(0)}%</div>
          </div>
        </div>

        {/* Volatility Comparison */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Actual Volatility</span>
            <span className={cn('font-mono font-semibold', getStatusColor())}>
              {(actualVolatility * 100).toFixed(1)}%
            </span>
          </div>

          {/* Visual bar comparison */}
          <div className="relative h-8 bg-muted/30 rounded-lg overflow-hidden">
            {/* Target marker */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-foreground/50 z-10"
              style={{ left: `${Math.min((targetVolatility / 0.25) * 100, 100)}%` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap">
                Target
              </div>
            </div>
            
            {/* Actual bar */}
            <div 
              className={cn(
                'absolute top-2 bottom-2 left-0 rounded-r transition-all',
                isAligned ? 'bg-green-500' : isOverRisk ? 'bg-amber-500' : 'bg-blue-500'
              )}
              style={{ width: `${Math.min((actualVolatility / 0.25) * 100, 100)}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0%</span>
            <span>Low Risk</span>
            <span>Moderate</span>
            <span>High Risk</span>
            <span>25%</span>
          </div>
        </div>

        {/* Status Message */}
        <div className={cn(
          'p-3 rounded-lg border flex gap-3',
          isAligned ? 'bg-green-500/10 border-green-500/20' :
          isOverRisk ? 'bg-amber-500/10 border-amber-500/20' :
          'bg-blue-500/10 border-blue-500/20'
        )}>
          {getStatusIcon()}
          <div>
            <p className={cn('text-sm font-medium', getStatusColor())}>
              {isAligned ? 'Well Aligned' : isOverRisk ? 'Higher Than Expected' : 'Lower Than Expected'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {getStatusMessage()}
            </p>
          </div>
        </div>

        {/* Historical Context */}
        <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
          <p className="text-xs text-muted-foreground">
            📊 <strong>What This Means:</strong> {getHistoricalContext()}
          </p>
        </div>

        {/* Expected Return vs Risk */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/30 text-center">
            <div className="text-xs text-muted-foreground">Expected Return</div>
            <div className="font-mono text-lg font-semibold text-green-500">
              {(expectedReturn * 100).toFixed(1)}%
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 text-center">
            <div className="text-xs text-muted-foreground">Return/Risk Ratio</div>
            <div className="font-mono text-lg font-semibold">
              {(expectedReturn / actualVolatility).toFixed(2)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
