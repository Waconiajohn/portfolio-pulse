import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, TrendingDown, Info } from 'lucide-react';

interface FeeImpactCalculatorProps {
  initialPortfolioValue?: number;
  currentFeeRate?: number;
}

export function FeeImpactCalculator({ 
  initialPortfolioValue = 250000, 
  currentFeeRate = 0.0085 
}: FeeImpactCalculatorProps) {
  const [portfolioValue, setPortfolioValue] = useState(initialPortfolioValue);
  const [feeRate, setFeeRate] = useState(currentFeeRate * 100);
  const [years, setYears] = useState(30);
  const [annualReturn, setAnnualReturn] = useState(7);

  const calculations = useMemo(() => {
    const currentFee = feeRate / 100;
    const lowFee = 0.0025; // 0.25% as comparison
    const returnRate = annualReturn / 100;

    // Calculate future value with current fees
    const fvWithCurrentFees = portfolioValue * Math.pow(1 + returnRate - currentFee, years);
    
    // Calculate future value with low fees
    const fvWithLowFees = portfolioValue * Math.pow(1 + returnRate - lowFee, years);
    
    // Difference (cost of higher fees)
    const feeCost = fvWithLowFees - fvWithCurrentFees;
    
    // Total fees paid over time (rough estimate)
    const totalFeesPaid = portfolioValue * currentFee * years * 1.5; // Simplified estimate

    return {
      withCurrentFees: fvWithCurrentFees,
      withLowFees: fvWithLowFees,
      feeCost,
      totalFeesPaid,
      costPer10bps: feeCost / ((currentFee - lowFee) * 1000),
    };
  }, [portfolioValue, feeRate, years, annualReturn]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Fee Impact Calculator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          See how fees compound over time and impact your wealth
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Starting Portfolio</Label>
            <Input
              type="number"
              value={portfolioValue}
              onChange={(e) => setPortfolioValue(Number(e.target.value))}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Annual Return (%)</Label>
            <Input
              type="number"
              value={annualReturn}
              onChange={(e) => setAnnualReturn(Number(e.target.value))}
              className="font-mono text-sm"
              step={0.5}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Annual Fee Rate</Label>
            <span className="font-mono text-sm font-medium">{feeRate.toFixed(2)}%</span>
          </div>
          <Slider
            value={[feeRate]}
            onValueChange={([val]) => setFeeRate(val)}
            min={0.1}
            max={2.0}
            step={0.05}
            className="py-2"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Time Horizon</Label>
            <span className="font-mono text-sm font-medium">{years} years</span>
          </div>
          <Slider
            value={[years]}
            onValueChange={([val]) => setYears(val)}
            min={5}
            max={40}
            step={5}
            className="py-2"
          />
        </div>

        {/* Results */}
        <div className="space-y-3 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <div className="text-xs text-muted-foreground">With Your Fees ({feeRate.toFixed(2)}%)</div>
              <div className="font-mono text-lg font-semibold">{formatCurrency(calculations.withCurrentFees)}</div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div>
              <div className="text-xs text-green-600 dark:text-green-400">If Fees Were 0.25%</div>
              <div className="font-mono text-lg font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(calculations.withLowFees)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <div>
                <div className="text-xs text-red-600 dark:text-red-400">Lost to Higher Fees</div>
                <div className="font-mono text-lg font-semibold text-red-600 dark:text-red-400">
                  {formatCurrency(calculations.feeCost)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Educational callout */}
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="flex gap-2">
            <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-600 dark:text-blue-400">
              <strong>Every 0.1% in fees</strong> costs you approximately{' '}
              <span className="font-mono font-semibold">
                {formatCurrency(Math.abs(calculations.costPer10bps))}
              </span>{' '}
              over {years} years! Consider low-cost index funds to keep more of your returns.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
