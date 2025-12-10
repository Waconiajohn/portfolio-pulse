import { useMemo } from 'react';
import { PortfolioAnalysis } from '@/types/portfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

interface StressTestChartProps {
  analysis: PortfolioAnalysis;
}

const SCENARIOS = [
  { name: '2000 Tech Crash', spImpact: -45, color: 'hsl(0, 84%, 60%)' },
  { name: '2008 Financial', spImpact: -55, color: 'hsl(0, 84%, 60%)' },
  { name: '2020 Covid', spImpact: -34, color: 'hsl(0, 84%, 60%)' },
  { name: '10% Correction', spImpact: -10, color: 'hsl(45, 93%, 47%)' },
  { name: 'Rising Rates', spImpact: -15, color: 'hsl(45, 93%, 47%)' },
];

export function StressTestChart({ analysis }: StressTestChartProps) {
  const data = useMemo(() => {
    const crisisDetails = analysis.diagnostics.crisisResilience.details;
    const scenarios = crisisDetails.scenarios as Array<{ name: string; portfolioImpact: number; spImpact: number }> || [];
    
    // Combine API scenarios with additional ones
    const chartData = SCENARIOS.map(s => {
      const matchedScenario = scenarios.find(sc => sc.name.includes(s.name.split(' ')[0]));
      const portfolioImpact = matchedScenario 
        ? matchedScenario.portfolioImpact * 100 
        : s.spImpact * 0.85; // Estimate based on S&P
      
      return {
        name: s.name,
        portfolio: portfolioImpact,
        sp500: s.spImpact,
        color: s.color,
      };
    });

    return chartData;
  }, [analysis]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Stress Test Scenarios</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" horizontal={true} vertical={false} />
              <XAxis 
                type="number" 
                domain={[-60, 0]}
                tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }}
                width={75}
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'hsl(222, 47%, 10%)', 
                  border: '1px solid hsl(217, 33%, 17%)',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)}%`,
                  name === 'portfolio' ? 'Your Portfolio' : 'S&P 500'
                ]}
              />
              <Bar dataKey="portfolio" name="portfolio" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
              <Bar dataKey="sp500" name="sp500" fill="hsl(215, 20%, 35%)" radius={[0, 4, 4, 0]} opacity={0.5} />
              <ReferenceLine x={0} stroke="hsl(217, 33%, 30%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[hsl(0,84%,60%)]" />
            <span className="text-muted-foreground">Your Portfolio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[hsl(215,20%,35%)] opacity-50" />
            <span className="text-muted-foreground">S&P 500</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Estimated portfolio decline vs. benchmark in historical and hypothetical scenarios
        </p>
      </CardContent>
    </Card>
  );
}
