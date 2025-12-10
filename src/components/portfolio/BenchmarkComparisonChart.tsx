import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PortfolioAnalysis, BenchmarkData, PortfolioVsBenchmarks } from '@/types/portfolio';
import { BENCHMARKS, RISK_FREE_RATE } from '@/lib/constants';
import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BenchmarkComparisonChartProps {
  analysis: PortfolioAnalysis;
  initialValue?: number;
}

function calculateGrowthProjections(
  initialValue: number,
  annualReturn: number,
  fees: number,
  years: number[]
): { year: number; value: number }[] {
  return years.map(year => ({
    year,
    value: initialValue * Math.pow(1 + annualReturn - fees, year),
  }));
}

function getBenchmarkData(initialValue: number): BenchmarkData[] {
  const years = [0, 1, 5, 10, 15, 20];
  
  return Object.entries(BENCHMARKS).map(([key, benchmark]) => {
    const sharpeRatio = benchmark.volatility > 0 
      ? (benchmark.expectedReturn - RISK_FREE_RATE) / benchmark.volatility 
      : 0;
    
    return {
      key,
      name: benchmark.name,
      description: benchmark.description,
      expectedReturn: benchmark.expectedReturn,
      volatility: benchmark.volatility,
      sharpeRatio,
      expenseRatio: benchmark.expenseRatio,
      growthProjections: calculateGrowthProjections(
        initialValue,
        benchmark.expectedReturn,
        benchmark.expenseRatio,
        years
      ),
    };
  });
}

export function BenchmarkComparisonChart({ analysis, initialValue = 100000 }: BenchmarkComparisonChartProps) {
  const comparisonData: PortfolioVsBenchmarks = useMemo(() => {
    const years = [0, 1, 5, 10, 15, 20];
    const portfolioFees = analysis.totalValue > 0 ? analysis.totalFees / analysis.totalValue : 0;
    
    const portfolio: BenchmarkData = {
      key: 'portfolio',
      name: 'Your Portfolio',
      description: 'Current holdings',
      expectedReturn: analysis.expectedReturn,
      volatility: analysis.volatility,
      sharpeRatio: analysis.sharpeRatio,
      expenseRatio: portfolioFees,
      growthProjections: calculateGrowthProjections(
        initialValue,
        analysis.expectedReturn,
        portfolioFees,
        years
      ),
    };
    
    return {
      portfolio,
      benchmarks: getBenchmarkData(initialValue),
    };
  }, [analysis, initialValue]);

  // Metrics comparison data for bar chart
  const metricsData = useMemo(() => {
    const { portfolio, benchmarks } = comparisonData;
    const sp500 = benchmarks.find(b => b.key === 'sp500');
    const balanced = benchmarks.find(b => b.key === 'balanced60_40');
    
    return [
      {
        metric: 'Return',
        'Your Portfolio': portfolio.expectedReturn * 100,
        'S&P 500': (sp500?.expectedReturn || 0) * 100,
        '60/40': (balanced?.expectedReturn || 0) * 100,
      },
      {
        metric: 'Volatility',
        'Your Portfolio': portfolio.volatility * 100,
        'S&P 500': (sp500?.volatility || 0) * 100,
        '60/40': (balanced?.volatility || 0) * 100,
      },
      {
        metric: 'Sharpe',
        'Your Portfolio': portfolio.sharpeRatio,
        'S&P 500': sp500?.sharpeRatio || 0,
        '60/40': balanced?.sharpeRatio || 0,
      },
      {
        metric: 'Fees',
        'Your Portfolio': portfolio.expenseRatio * 100,
        'S&P 500': (sp500?.expenseRatio || 0) * 100,
        '60/40': (balanced?.expenseRatio || 0) * 100,
      },
    ];
  }, [comparisonData]);

  // Growth projection data for line chart
  const growthData = useMemo(() => {
    const { portfolio, benchmarks } = comparisonData;
    const sp500 = benchmarks.find(b => b.key === 'sp500');
    const balanced = benchmarks.find(b => b.key === 'balanced60_40');
    
    return portfolio.growthProjections.map((p, i) => ({
      year: p.year,
      'Your Portfolio': p.value,
      'S&P 500': sp500?.growthProjections[i]?.value || 0,
      '60/40': balanced?.growthProjections[i]?.value || 0,
    }));
  }, [comparisonData]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const { portfolio, benchmarks } = comparisonData;
    const sp500 = benchmarks.find(b => b.key === 'sp500');
    const balanced = benchmarks.find(b => b.key === 'balanced60_40');
    
    const returnVsSp = portfolio.expectedReturn - (sp500?.expectedReturn || 0);
    const returnVsBalanced = portfolio.expectedReturn - (balanced?.expectedReturn || 0);
    const sharpeVsSp = portfolio.sharpeRatio - (sp500?.sharpeRatio || 0);
    const sharpeVsBalanced = portfolio.sharpeRatio - (balanced?.sharpeRatio || 0);
    const feeSavingsVsSp = (sp500?.expenseRatio || 0) - portfolio.expenseRatio;
    
    // 20-year growth comparison
    const portfolio20yr = portfolio.growthProjections.find(p => p.year === 20)?.value || 0;
    const sp50020yr = sp500?.growthProjections.find(p => p.year === 20)?.value || 0;
    const balanced20yr = balanced?.growthProjections.find(p => p.year === 20)?.value || 0;
    
    return {
      returnVsSp,
      returnVsBalanced,
      sharpeVsSp,
      sharpeVsBalanced,
      feeSavingsVsSp,
      portfolio20yr,
      sp50020yr,
      balanced20yr,
      growthVsSp: portfolio20yr - sp50020yr,
      growthVsBalanced: portfolio20yr - balanced20yr,
    };
  }, [comparisonData]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  const formatPercent = (value: number, decimals = 1) => `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;

  const TrendIcon = ({ value }: { value: number }) => {
    if (value > 0.001) return <TrendingUp className="h-4 w-4 text-status-good" />;
    if (value < -0.001) return <TrendingDown className="h-4 w-4 text-status-bad" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  if (analysis.totalValue === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Compare to Benchmark
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Add holdings to compare your portfolio against common benchmarks like S&P 500 and 60/40 portfolios.</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Add holdings to see benchmark comparison</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          Compare to Benchmark
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Compare your portfolio's expected return, risk, and efficiency against common benchmark portfolios. Higher Sharpe ratio = better risk-adjusted returns.</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Metrics Bar Chart */}
        <div>
          <h4 className="text-sm font-medium mb-3">Key Metrics Comparison</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metricsData} layout="vertical" margin={{ left: 60, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis dataKey="metric" type="category" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} width={60} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number, name: string) => {
                    if (name.includes('Sharpe')) return [value.toFixed(2), name];
                    return [`${value.toFixed(2)}%`, name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Your Portfolio" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="S&P 500" fill="hsl(var(--status-warning))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="60/40" fill="hsl(var(--status-good))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Growth Projection Line Chart */}
        <div>
          <h4 className="text-sm font-medium mb-3">Projected Growth of $100,000</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData} margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="year" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  label={{ value: 'Years', position: 'insideBottom', offset: -5, fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                  labelFormatter={(label) => `Year ${label}`}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Your Portfolio" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="S&P 500" stroke="hsl(var(--status-warning))" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="60/40" stroke="hsl(var(--status-good))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary Stats Table */}
        <div>
          <h4 className="text-sm font-medium mb-3">Performance Summary</h4>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Metric</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">vs S&P 500</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">vs 60/40</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3">Expected Return</td>
                  <td className="px-4 py-3 text-right">
                    <span className="flex items-center justify-end gap-1">
                      <TrendIcon value={summaryStats.returnVsSp} />
                      <span className={summaryStats.returnVsSp >= 0 ? 'text-status-good' : 'text-status-bad'}>
                        {formatPercent(summaryStats.returnVsSp * 100)}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="flex items-center justify-end gap-1">
                      <TrendIcon value={summaryStats.returnVsBalanced} />
                      <span className={summaryStats.returnVsBalanced >= 0 ? 'text-status-good' : 'text-status-bad'}>
                        {formatPercent(summaryStats.returnVsBalanced * 100)}
                      </span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Sharpe Ratio (Risk-Adjusted)</td>
                  <td className="px-4 py-3 text-right">
                    <span className="flex items-center justify-end gap-1">
                      <TrendIcon value={summaryStats.sharpeVsSp} />
                      <span className={summaryStats.sharpeVsSp >= 0 ? 'text-status-good' : 'text-status-bad'}>
                        {summaryStats.sharpeVsSp >= 0 ? '+' : ''}{summaryStats.sharpeVsSp.toFixed(2)}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="flex items-center justify-end gap-1">
                      <TrendIcon value={summaryStats.sharpeVsBalanced} />
                      <span className={summaryStats.sharpeVsBalanced >= 0 ? 'text-status-good' : 'text-status-bad'}>
                        {summaryStats.sharpeVsBalanced >= 0 ? '+' : ''}{summaryStats.sharpeVsBalanced.toFixed(2)}
                      </span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3">20-Year Projected Value</td>
                  <td className="px-4 py-3 text-right">
                    <span className="flex items-center justify-end gap-1">
                      <TrendIcon value={summaryStats.growthVsSp} />
                      <span className={summaryStats.growthVsSp >= 0 ? 'text-status-good' : 'text-status-bad'}>
                        {summaryStats.growthVsSp >= 0 ? '+' : ''}{formatCurrency(summaryStats.growthVsSp)}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="flex items-center justify-end gap-1">
                      <TrendIcon value={summaryStats.growthVsBalanced} />
                      <span className={summaryStats.growthVsBalanced >= 0 ? 'text-status-good' : 'text-status-bad'}>
                        {summaryStats.growthVsBalanced >= 0 ? '+' : ''}{formatCurrency(summaryStats.growthVsBalanced)}
                      </span>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            * Projections assume constant returns and do not account for market volatility or sequence of returns risk.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}