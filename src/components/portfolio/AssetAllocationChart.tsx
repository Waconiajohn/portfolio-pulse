import { useMemo } from 'react';
import { PortfolioAnalysis, Holding, AssetClass } from '@/types/portfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface AssetAllocationChartProps {
  holdings: Holding[];
  totalValue: number;
}

const COLORS: Record<AssetClass, string> = {
  'US Stocks': 'hsl(217, 91%, 60%)',
  'Intl Stocks': 'hsl(190, 90%, 50%)',
  'Bonds': 'hsl(142, 76%, 46%)',
  'Commodities': 'hsl(45, 93%, 47%)',
  'Cash': 'hsl(215, 20%, 55%)',
  'Other': 'hsl(280, 65%, 60%)',
};

export function AssetAllocationChart({ holdings, totalValue }: AssetAllocationChartProps) {
  const data = useMemo(() => {
    const allocation: Record<AssetClass, number> = {
      'US Stocks': 0, 'Intl Stocks': 0, 'Bonds': 0, 'Commodities': 0, 'Cash': 0, 'Other': 0
    };

    holdings.forEach(h => {
      const value = h.shares * h.currentPrice;
      allocation[h.assetClass] += value;
    });

    return Object.entries(allocation)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({
        name,
        value: Math.round(value),
        percentage: totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : '0',
        color: COLORS[name as AssetClass],
      }))
      .sort((a, b) => b.value - a.value);
  }, [holdings, totalValue]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Asset Allocation</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
          Add holdings to see allocation
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Asset Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'hsl(222, 47%, 10%)', 
                  border: '1px solid hsl(217, 33%, 17%)',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
              />
              <Legend 
                formatter={(value, entry) => {
                  const item = data.find(d => d.name === value);
                  return <span className="text-xs">{value} ({item?.percentage}%)</span>;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
