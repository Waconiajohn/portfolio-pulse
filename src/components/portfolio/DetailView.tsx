import { DiagnosticResult } from '@/types/portfolio';
import { StatusBadge } from './StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DetailViewProps {
  name: string;
  result: DiagnosticResult;
  onClose: () => void;
}

const CHART_COLORS = [
  'hsl(217, 91%, 60%)',
  'hsl(142, 76%, 46%)',
  'hsl(45, 93%, 47%)',
  'hsl(280, 65%, 60%)',
  'hsl(0, 84%, 60%)',
  'hsl(190, 90%, 50%)',
];

export function DetailView({ name, result, onClose }: DetailViewProps) {
  const { details } = result;

  const renderSectorChart = () => {
    if (!details.sectorWeights) return null;
    
    const data = Object.entries(details.sectorWeights as Record<string, number>)
      .filter(([_, weight]) => weight > 0)
      .map(([sector, weight]) => ({
        name: sector,
        value: Math.round(weight * 100),
      }))
      .sort((a, b) => b.value - a.value);

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Sector Allocation</h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}%`}
                labelLine={false}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(222, 47%, 10%)', 
                  border: '1px solid hsl(217, 33%, 17%)',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderTopPositions = () => {
    if (!details.topPositions && !details.top10) return null;
    
    const positions = (details.topPositions || details.top10) as Array<{ ticker: string; weight: number }>;
    const data = positions.slice(0, 5).map(p => ({
      name: p.ticker,
      value: Math.round(p.weight * 100),
    }));

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Top Holdings</h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <XAxis type="number" unit="%" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 12 }} width={50} />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'hsl(222, 47%, 10%)', 
                  border: '1px solid hsl(217, 33%, 17%)',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${value}%`, 'Weight']}
              />
              <Bar dataKey="value" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderFeeBreakdown = () => {
    if (!details.holdingFees) return null;
    
    const fees = (details.holdingFees as Array<{ ticker: string; expenseRatio: number; annualFee: number }>)
      .slice(0, 5);

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Fee Breakdown</h4>
        <div className="space-y-2">
          {fees.map(fee => (
            <div key={fee.ticker} className="flex items-center justify-between text-sm">
              <span className="font-mono">{fee.ticker}</span>
              <div className="text-right">
                <span className="font-mono">{(fee.expenseRatio * 100).toFixed(2)}%</span>
                <span className="text-muted-foreground ml-2">
                  (${fee.annualFee.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr)
                </span>
              </div>
            </div>
          ))}
        </div>
        {details.tenYearImpact && (
          <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <div className="text-sm text-muted-foreground">10-Year Fee Impact</div>
            <div className="font-mono text-lg font-semibold text-destructive">
              ${(details.tenYearImpact as number).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderEfficiencyTable = () => {
    if (!details.holdingEfficiency) return null;
    
    const efficiency = details.holdingEfficiency as Array<{ ticker: string; sharpe: number; contribution: string; weight: number }>;

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Holding Efficiency</h4>
        <div className="space-y-1">
          {efficiency.map(h => (
            <div key={h.ticker} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
              <span className="font-mono">{h.ticker}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  Sharpe: {h.sharpe.toFixed(2)}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  h.contribution === 'GOOD' ? 'status-good' : 
                  h.contribution === 'NEUTRAL' ? 'status-warning' : 'status-critical'
                }`}>
                  {h.contribution}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderScenarios = () => {
    if (!details.scenarios) return null;
    
    const scenarios = details.scenarios as Array<{ name: string; portfolioImpact: number; spImpact: number }>;

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Crisis Scenarios</h4>
        <div className="space-y-2">
          {scenarios.map(s => (
            <div key={s.name} className="p-3 rounded bg-muted/30">
              <div className="text-sm font-medium mb-2">{s.name}</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">Your Portfolio</div>
                  <div className="font-mono text-destructive">
                    {(s.portfolioImpact * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">S&P 500</div>
                  <div className="font-mono text-muted-foreground">
                    {(s.spImpact * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="animate-slide-up">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <CardTitle>{name}</CardTitle>
          <StatusBadge status={result.status} showLabel />
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X size={18} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <div className="text-sm text-muted-foreground mb-1">Key Finding</div>
            <div className="font-medium">{result.keyFinding}</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <div className="text-sm text-muted-foreground mb-1">Headline Metric</div>
            <div className="font-mono font-medium">{result.headlineMetric}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderSectorChart()}
          {renderTopPositions()}
          {renderFeeBreakdown()}
          {renderEfficiencyTable()}
          {renderScenarios()}
        </div>
      </CardContent>
    </Card>
  );
}
