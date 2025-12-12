import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoalProbabilityVisualizerProps {
  currentPortfolioValue?: number;
  expectedReturn?: number;
  volatility?: number;
  currentAge?: number;
}

export function GoalProbabilityVisualizer({
  currentPortfolioValue = 450000,
  expectedReturn = 0.07,
  volatility = 0.12,
  currentAge = 45,
}: GoalProbabilityVisualizerProps) {
  const [goalAmount, setGoalAmount] = useState(1000000);
  const [targetAge, setTargetAge] = useState(65);
  const [annualContribution, setAnnualContribution] = useState(10000);

  const years = Math.max(targetAge - currentAge, 1);

  // Simplified Monte Carlo-style probability calculation
  const results = useMemo(() => {
    const simulations = 1000;
    const successCount = { count: 0 };
    const outcomes: number[] = [];

    for (let i = 0; i < simulations; i++) {
      let value = currentPortfolioValue;
      for (let y = 0; y < years; y++) {
        // Random return based on expected return and volatility (normal-ish distribution)
        const randomReturn = expectedReturn + volatility * (Math.random() + Math.random() + Math.random() - 1.5);
        value = value * (1 + randomReturn) + annualContribution;
      }
      outcomes.push(value);
      if (value >= goalAmount) {
        successCount.count++;
      }
    }

    outcomes.sort((a, b) => a - b);

    return {
      probability: (successCount.count / simulations) * 100,
      percentile10: outcomes[Math.floor(simulations * 0.1)],
      percentile50: outcomes[Math.floor(simulations * 0.5)],
      percentile90: outcomes[Math.floor(simulations * 0.9)],
    };
  }, [currentPortfolioValue, goalAmount, years, annualContribution, expectedReturn, volatility]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getProbabilityColor = () => {
    if (results.probability >= 75) return 'text-green-500';
    if (results.probability >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  const getProbabilityBg = () => {
    if (results.probability >= 75) return 'bg-green-500';
    if (results.probability >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getRecommendation = () => {
    if (results.probability >= 85) {
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        text: "You're on track! Consider if you're taking more risk than needed.",
        type: 'success',
      };
    }
    if (results.probability >= 75) {
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        text: "Good probability of success. Maintain current strategy.",
        type: 'success',
      };
    }
    if (results.probability >= 50) {
      const increaseNeeded = Math.round(annualContribution * 0.2);
      return {
        icon: <AlertCircle className="h-4 w-4 text-amber-500" />,
        text: `Consider increasing contributions by $${increaseNeeded.toLocaleString()}/year to boost success rate.`,
        type: 'warning',
      };
    }
    return {
      icon: <AlertCircle className="h-4 w-4 text-red-500" />,
      text: "Significant changes needed. Increase contributions, extend timeline, or reduce goal.",
      type: 'error',
    };
  };

  const recommendation = getRecommendation();

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Goal Probability
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Monte Carlo simulation of reaching your financial goal
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Goal Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Goal Amount</Label>
            <Input
              type="number"
              value={goalAmount}
              onChange={(e) => setGoalAmount(Number(e.target.value))}
              className="font-mono text-sm"
              step={50000}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Target Age</Label>
            <Input
              type="number"
              value={targetAge}
              onChange={(e) => setTargetAge(Number(e.target.value))}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Annual Contributions</Label>
            <span className="font-mono text-sm font-medium">${annualContribution.toLocaleString()}</span>
          </div>
          <Slider
            value={[annualContribution]}
            onValueChange={([val]) => setAnnualContribution(val)}
            min={0}
            max={50000}
            step={1000}
            className="py-2"
          />
        </div>

        {/* Probability Display */}
        <div className="text-center py-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Success Probability
          </div>
          <div className={cn('text-5xl font-bold font-mono', getProbabilityColor())}>
            {results.probability.toFixed(0)}%
          </div>
          <div className="mt-2">
            <Progress 
              value={results.probability} 
              className="h-2"
            />
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Based on 1,000 simulations over {years} years
          </div>
        </div>

        {/* Outcome Scenarios */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Projected Outcomes
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
              <div className="text-[10px] text-red-600 dark:text-red-400">Worst Case (90th %ile)</div>
              <div className="font-mono text-sm font-semibold text-red-600 dark:text-red-400">
                {formatCurrency(results.percentile10)}
              </div>
              {results.percentile10 >= goalAmount ? (
                <CheckCircle2 className="h-3 w-3 text-green-500 mx-auto mt-1" />
              ) : (
                <span className="text-[10px] text-red-500">✗</span>
              )}
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/30 text-center">
              <div className="text-[10px] text-muted-foreground">Most Likely (50th %ile)</div>
              <div className="font-mono text-sm font-semibold">
                {formatCurrency(results.percentile50)}
              </div>
              {results.percentile50 >= goalAmount ? (
                <CheckCircle2 className="h-3 w-3 text-green-500 mx-auto mt-1" />
              ) : (
                <span className="text-[10px] text-red-500">✗</span>
              )}
            </div>
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
              <div className="text-[10px] text-green-600 dark:text-green-400">Best Case (10th %ile)</div>
              <div className="font-mono text-sm font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(results.percentile90)}
              </div>
              <CheckCircle2 className="h-3 w-3 text-green-500 mx-auto mt-1" />
            </div>
          </div>
        </div>

        {/* Recommendation */}
        <div className={cn(
          'p-3 rounded-lg border flex gap-3',
          recommendation.type === 'success' ? 'bg-green-500/10 border-green-500/20' :
          recommendation.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20' :
          'bg-red-500/10 border-red-500/20'
        )}>
          {recommendation.icon}
          <p className="text-xs text-muted-foreground">
            <strong>💡 Recommendation:</strong> {recommendation.text}
          </p>
        </div>

        {/* Current Portfolio Info */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Current Portfolio</div>
            <div className="font-mono font-semibold">{formatCurrency(currentPortfolioValue)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Years to Goal</div>
            <div className="font-mono font-semibold">{years} years</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
