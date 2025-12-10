import { useMemo } from 'react';
import { PortfolioAnalysis, Holding } from '@/types/portfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine, Area, ComposedChart, Line
} from 'recharts';

interface EfficientFrontierChartProps {
  analysis: PortfolioAnalysis;
  holdings: Holding[];
}

export function EfficientFrontierChart({ analysis, holdings }: EfficientFrontierChartProps) {
  const data = useMemo(() => {
    // Generate efficient frontier curve points
    const frontierPoints = [];
    for (let vol = 0.02; vol <= 0.25; vol += 0.01) {
      // Simplified efficient frontier formula
      const maxReturn = 0.03 + vol * 0.4; // Risk-free + risk premium
      frontierPoints.push({
        volatility: vol * 100,
        return: maxReturn * 100,
        type: 'frontier'
      });
    }

    // Current portfolio point
    const currentPortfolio = {
      volatility: analysis.volatility * 100,
      return: analysis.expectedReturn * 100,
      type: 'current',
      name: 'Current Portfolio'
    };

    // Optimized portfolio (estimated)
    const optimizedPortfolio = {
      volatility: analysis.volatility * 100 * 0.95,
      return: analysis.expectedReturn * 100 * 1.05,
      type: 'optimized',
      name: 'Optimized Portfolio'
    };

    // Individual holdings
    const holdingPoints = holdings.slice(0, 8).map(h => {
      const assetReturns: Record<string, number> = {
        'US Stocks': 9, 'Intl Stocks': 8, 'Bonds': 3.5, 'Commodities': 5, 'Cash': 2, 'Other': 6
      };
      const assetVols: Record<string, number> = {
        'US Stocks': 16.5, 'Intl Stocks': 19, 'Bonds': 4, 'Commodities': 15, 'Cash': 0.5, 'Other': 12
      };
      return {
        volatility: assetVols[h.assetClass] || 12,
        return: assetReturns[h.assetClass] || 6,
        type: 'holding',
        name: h.ticker
      };
    });

    return { frontierPoints, currentPortfolio, optimizedPortfolio, holdingPoints };
  }, [analysis, holdings]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Efficient Frontier Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" />
              <XAxis 
                dataKey="volatility" 
                type="number" 
                domain={[0, 25]}
                tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }}
                label={{ value: 'Volatility (%)', position: 'bottom', fill: 'hsl(215, 20%, 55%)', fontSize: 11 }}
              />
              <YAxis 
                dataKey="return" 
                type="number" 
                domain={[0, 15]}
                tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }}
                label={{ value: 'Expected Return (%)', angle: -90, position: 'left', fill: 'hsl(215, 20%, 55%)', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'hsl(222, 47%, 10%)', 
                  border: '1px solid hsl(217, 33%, 17%)',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => `${value.toFixed(1)}%`}
              />
              
              {/* Efficient frontier line */}
              <Line 
                data={data.frontierPoints}
                type="monotone"
                dataKey="return"
                stroke="hsl(217, 91%, 60%)"
                strokeWidth={2}
                dot={false}
                name="Efficient Frontier"
              />
              
              {/* Holdings scatter */}
              <Scatter 
                data={data.holdingPoints}
                fill="hsl(215, 20%, 55%)"
                opacity={0.6}
                name="Holdings"
              />
              
              {/* Current portfolio */}
              <Scatter 
                data={[data.currentPortfolio]}
                fill="hsl(45, 93%, 47%)"
                shape="diamond"
                name="Current"
              >
              </Scatter>
              
              {/* Optimized portfolio */}
              <Scatter 
                data={[data.optimizedPortfolio]}
                fill="hsl(142, 76%, 46%)"
                shape="star"
                name="Optimized"
              >
              </Scatter>

              {/* Risk-free rate line */}
              <ReferenceLine y={3} stroke="hsl(215, 20%, 35%)" strokeDasharray="5 5" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[hsl(45,93%,47%)]" />
            <span className="text-muted-foreground">Current Portfolio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[hsl(142,76%,46%)]" />
            <span className="text-muted-foreground">Optimized</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-primary" />
            <span className="text-muted-foreground">Efficient Frontier</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
