import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Target, 
  TrendingUp, 
  BarChart3, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MonteCarloSimulationProps {
  portfolioValue?: number;
  expectedReturn?: number;
  volatility?: number;
  currentAge?: number;
}

interface SimulationResult {
  outcomes: number[];
  successRate: number;
  percentiles: {
    p5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
  };
  histogram: { range: string; count: number; percentage: number }[];
  scenarioBreakdown: {
    excellent: number;
    good: number;
    adequate: number;
    poor: number;
    failure: number;
  };
}

export function MonteCarloSimulation({
  portfolioValue: initialValue = 500000,
  expectedReturn: initialReturn = 0.07,
  volatility: initialVolatility = 0.15,
  currentAge: initialAge = 45,
}: MonteCarloSimulationProps) {
  const [portfolioValue, setPortfolioValue] = useState(initialValue);
  const [goalAmount, setGoalAmount] = useState(1500000);
  const [targetAge, setTargetAge] = useState(65);
  const [currentAge, setCurrentAge] = useState(initialAge);
  const [annualContribution, setAnnualContribution] = useState(20000);
  const [expectedReturn, setExpectedReturn] = useState(initialReturn * 100);
  const [volatility, setVolatility] = useState(initialVolatility * 100);
  const [numSimulations, setNumSimulations] = useState(5000);
  const [isRunning, setIsRunning] = useState(false);

  const years = Math.max(targetAge - currentAge, 1);

  const formatCompact = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };
  // Run Monte Carlo simulation
  const results = useMemo((): SimulationResult => {
    const outcomes: number[] = [];
    const returnRate = expectedReturn / 100;
    const vol = volatility / 100;

    // Box-Muller transform for normal distribution
    const randomNormal = () => {
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    };

    for (let sim = 0; sim < numSimulations; sim++) {
      let value = portfolioValue;
      for (let year = 0; year < years; year++) {
        // Log-normal returns with drift
        const annualReturn = returnRate + vol * randomNormal();
        value = value * (1 + annualReturn) + annualContribution;
      }
      outcomes.push(value);
    }

    outcomes.sort((a, b) => a - b);

    // Calculate percentiles
    const getPercentile = (p: number) => outcomes[Math.floor(outcomes.length * p / 100)];
    const percentiles = {
      p5: getPercentile(5),
      p10: getPercentile(10),
      p25: getPercentile(25),
      p50: getPercentile(50),
      p75: getPercentile(75),
      p90: getPercentile(90),
      p95: getPercentile(95),
    };

    // Success rate
    const successCount = outcomes.filter(o => o >= goalAmount).length;
    const successRate = (successCount / numSimulations) * 100;

    // Build histogram
    const minVal = Math.min(...outcomes);
    const maxVal = Math.max(...outcomes);
    const bucketCount = 12;
    const bucketSize = (maxVal - minVal) / bucketCount;
    const histogram: { range: string; count: number; percentage: number }[] = [];
    
    for (let i = 0; i < bucketCount; i++) {
      const rangeStart = minVal + i * bucketSize;
      const rangeEnd = rangeStart + bucketSize;
      const count = outcomes.filter(o => o >= rangeStart && o < rangeEnd).length;
      histogram.push({
        range: `${formatCompact(rangeStart)}-${formatCompact(rangeEnd)}`,
        count,
        percentage: (count / numSimulations) * 100,
      });
    }

    // Scenario breakdown
    const scenarioBreakdown = {
      excellent: outcomes.filter(o => o >= goalAmount * 1.5).length / numSimulations * 100,
      good: outcomes.filter(o => o >= goalAmount && o < goalAmount * 1.5).length / numSimulations * 100,
      adequate: outcomes.filter(o => o >= goalAmount * 0.8 && o < goalAmount).length / numSimulations * 100,
      poor: outcomes.filter(o => o >= goalAmount * 0.5 && o < goalAmount * 0.8).length / numSimulations * 100,
      failure: outcomes.filter(o => o < goalAmount * 0.5).length / numSimulations * 100,
    };

    return { outcomes, successRate, percentiles, histogram, scenarioBreakdown };
  }, [portfolioValue, goalAmount, years, annualContribution, expectedReturn, volatility, numSimulations]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };


  const getSuccessColor = () => {
    if (results.successRate >= 80) return 'text-green-500';
    if (results.successRate >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getSuccessBg = () => {
    if (results.successRate >= 80) return 'bg-green-500';
    if (results.successRate >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Monte Carlo Simulation
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {numSimulations.toLocaleString()} scenarios
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Probability analysis of reaching your financial goal
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="results">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="results" className="text-xs">Results</TabsTrigger>
            <TabsTrigger value="distribution" className="text-xs">Distribution</TabsTrigger>
            <TabsTrigger value="inputs" className="text-xs">Inputs</TabsTrigger>
          </TabsList>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-5 mt-4">
            {/* Success Probability */}
            <div className="text-center p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                Probability of Reaching Goal
              </div>
              <div className={cn('text-5xl font-bold font-mono', getSuccessColor())}>
                {results.successRate.toFixed(1)}%
              </div>
              <Progress 
                value={results.successRate} 
                className="h-2 mt-3"
              />
              <div className="text-xs text-muted-foreground mt-2">
                Goal: {formatCurrency(goalAmount)} in {years} years
              </div>
            </div>

            {/* Scenario Breakdown */}
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Outcome Scenarios
              </Label>
              <div className="space-y-2">
                <ScenarioBar 
                  label="Excellent" 
                  sublabel={`≥${formatCurrency(goalAmount * 1.5)}`}
                  percentage={results.scenarioBreakdown.excellent} 
                  color="bg-green-500" 
                  icon={<CheckCircle2 className="h-3 w-3" />}
                />
                <ScenarioBar 
                  label="Good" 
                  sublabel={`${formatCurrency(goalAmount)}-${formatCurrency(goalAmount * 1.5)}`}
                  percentage={results.scenarioBreakdown.good} 
                  color="bg-emerald-400" 
                  icon={<CheckCircle2 className="h-3 w-3" />}
                />
                <ScenarioBar 
                  label="Adequate" 
                  sublabel={`${formatCurrency(goalAmount * 0.8)}-${formatCurrency(goalAmount)}`}
                  percentage={results.scenarioBreakdown.adequate} 
                  color="bg-amber-400" 
                  icon={<AlertTriangle className="h-3 w-3" />}
                />
                <ScenarioBar 
                  label="Poor" 
                  sublabel={`${formatCurrency(goalAmount * 0.5)}-${formatCurrency(goalAmount * 0.8)}`}
                  percentage={results.scenarioBreakdown.poor} 
                  color="bg-orange-500" 
                  icon={<AlertTriangle className="h-3 w-3" />}
                />
                <ScenarioBar 
                  label="Failure" 
                  sublabel={`<${formatCurrency(goalAmount * 0.5)}`}
                  percentage={results.scenarioBreakdown.failure} 
                  color="bg-red-500" 
                  icon={<XCircle className="h-3 w-3" />}
                />
              </div>
            </div>

            {/* Key Percentiles */}
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Outcome Percentiles
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <PercentileCard label="Worst 5%" value={results.percentiles.p5} goal={goalAmount} />
                <PercentileCard label="10th %ile" value={results.percentiles.p10} goal={goalAmount} />
                <PercentileCard label="25th %ile" value={results.percentiles.p25} goal={goalAmount} />
                <PercentileCard label="Median" value={results.percentiles.p50} goal={goalAmount} highlight />
                <PercentileCard label="75th %ile" value={results.percentiles.p75} goal={goalAmount} />
                <PercentileCard label="Best 5%" value={results.percentiles.p95} goal={goalAmount} />
              </div>
            </div>
          </TabsContent>

          {/* Distribution Tab */}
          <TabsContent value="distribution" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Outcome Distribution Histogram
              </Label>
              <div className="space-y-1">
                {results.histogram.map((bucket, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-24 text-[10px] text-muted-foreground font-mono truncate">
                      {bucket.range}
                    </div>
                    <div className="flex-1 h-5 bg-muted/30 rounded overflow-hidden relative">
                      <div 
                        className={cn(
                          'h-full rounded transition-all',
                          idx < results.histogram.length * 0.3 ? 'bg-red-500/70' :
                          idx < results.histogram.length * 0.5 ? 'bg-amber-500/70' :
                          'bg-green-500/70'
                        )}
                        style={{ width: `${Math.max(bucket.percentage * 3, 2)}%` }}
                      />
                    </div>
                    <div className="w-12 text-[10px] text-muted-foreground font-mono text-right">
                      {bucket.percentage.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Goal marker info */}
              <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="font-medium">Goal Target:</span>
                  <span className="font-mono">{formatCurrency(goalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Statistical Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <div className="text-xs text-muted-foreground">Mean Outcome</div>
                <div className="font-mono font-semibold">
                  {formatCurrency(results.outcomes.reduce((a, b) => a + b, 0) / results.outcomes.length)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <div className="text-xs text-muted-foreground">Median Outcome</div>
                <div className="font-mono font-semibold">
                  {formatCurrency(results.percentiles.p50)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <div className="text-xs text-muted-foreground">Minimum</div>
                <div className="font-mono font-semibold text-red-500">
                  {formatCurrency(Math.min(...results.outcomes))}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <div className="text-xs text-muted-foreground">Maximum</div>
                <div className="font-mono font-semibold text-green-500">
                  {formatCurrency(Math.max(...results.outcomes))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Inputs Tab */}
          <TabsContent value="inputs" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Current Portfolio</Label>
                <Input
                  type="number"
                  value={portfolioValue}
                  onChange={(e) => setPortfolioValue(Number(e.target.value))}
                  className="font-mono text-sm h-9"
                  step={10000}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Goal Amount</Label>
                <Input
                  type="number"
                  value={goalAmount}
                  onChange={(e) => setGoalAmount(Number(e.target.value))}
                  className="font-mono text-sm h-9"
                  step={50000}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Current Age</Label>
                <Input
                  type="number"
                  value={currentAge}
                  onChange={(e) => setCurrentAge(Number(e.target.value))}
                  className="font-mono text-sm h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Target Age</Label>
                <Input
                  type="number"
                  value={targetAge}
                  onChange={(e) => setTargetAge(Number(e.target.value))}
                  className="font-mono text-sm h-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Annual Contributions</Label>
                <span className="font-mono text-sm">${annualContribution.toLocaleString()}</span>
              </div>
              <Slider
                value={[annualContribution]}
                onValueChange={([val]) => setAnnualContribution(val)}
                min={0}
                max={100000}
                step={1000}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Expected Return (%)</Label>
                <span className="font-mono text-sm">{expectedReturn.toFixed(1)}%</span>
              </div>
              <Slider
                value={[expectedReturn]}
                onValueChange={([val]) => setExpectedReturn(val)}
                min={2}
                max={15}
                step={0.5}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Volatility (%)</Label>
                <span className="font-mono text-sm">{volatility.toFixed(1)}%</span>
              </div>
              <Slider
                value={[volatility]}
                onValueChange={([val]) => setVolatility(val)}
                min={5}
                max={30}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Simulations</Label>
                <span className="font-mono text-sm">{numSimulations.toLocaleString()}</span>
              </div>
              <Slider
                value={[numSimulations]}
                onValueChange={([val]) => setNumSimulations(val)}
                min={1000}
                max={10000}
                step={1000}
              />
            </div>

            {/* Info box */}
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex gap-2">
                <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Monte Carlo simulations model thousands of possible future scenarios using random
                  variations in returns. Higher volatility means wider outcome ranges.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Helper component for scenario bars
function ScenarioBar({ 
  label, 
  sublabel, 
  percentage, 
  color, 
  icon 
}: { 
  label: string; 
  sublabel: string;
  percentage: number; 
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 flex items-center gap-1 text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex-1 h-5 bg-muted/30 rounded overflow-hidden">
        <div 
          className={cn('h-full rounded transition-all', color)}
          style={{ width: `${Math.max(percentage, 1)}%` }}
        />
      </div>
      <div className="w-16 text-right">
        <div className="text-xs font-mono font-medium">{percentage.toFixed(1)}%</div>
      </div>
    </div>
  );
}

// Helper component for percentile cards
function PercentileCard({ 
  label, 
  value, 
  goal, 
  highlight 
}: { 
  label: string; 
  value: number; 
  goal: number;
  highlight?: boolean;
}) {
  const meetsGoal = value >= goal;
  
  const formatCurrency = (val: number) => {
    if (val >= 1000000) {
      return `$${(val / 1000000).toFixed(2)}M`;
    }
    return `$${(val / 1000).toFixed(0)}K`;
  };
  
  return (
    <div className={cn(
      'p-2 rounded-lg text-center border',
      highlight ? 'bg-primary/10 border-primary/30' : 'bg-muted/30 border-border/30'
    )}>
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
      <div className={cn(
        'font-mono text-sm font-semibold',
        meetsGoal ? 'text-green-500' : 'text-red-500'
      )}>
        {formatCurrency(value)}
      </div>
      {meetsGoal ? (
        <CheckCircle2 className="h-3 w-3 text-green-500 mx-auto mt-0.5" />
      ) : (
        <XCircle className="h-3 w-3 text-red-500 mx-auto mt-0.5" />
      )}
    </div>
  );
}
