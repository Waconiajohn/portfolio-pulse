import { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { CorrelationMatrixResult } from '@/lib/correlation';
import { CORRELATION_COLORSCALE, getHeatmapLayout, getDefaultConfig } from '@/lib/plotly-config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface CorrelationHeatmapProps {
  data: CorrelationMatrixResult;
  title?: string;
  description?: string;
}

export function CorrelationHeatmap({ 
  data, 
  title = 'Correlation Heatmap',
  description = 'High correlation indicates weaker diversification'
}: CorrelationHeatmapProps) {
  const { labels, matrix } = data;

  const plotData = useMemo(() => [{
    z: matrix,
    x: labels,
    y: labels,
    type: 'heatmap' as const,
    zmin: -1,
    zmax: 1,
    colorscale: CORRELATION_COLORSCALE,
    hovertemplate: '<b>%{x}</b> vs <b>%{y}</b><br>ρ = %{z:.2f}<extra></extra>',
    colorbar: {
      title: {
        text: 'Correlation',
        side: 'right' as const,
        font: { size: 10, color: 'hsl(215, 20%, 65%)' }
      },
      tickfont: { size: 9, color: 'hsl(215, 20%, 65%)' },
      thickness: 15,
      len: 0.8,
      tickvals: [-1, -0.5, 0, 0.5, 1],
      ticktext: ['-1.0', '-0.5', '0', '0.5', '1.0'],
    },
    showscale: true,
  }], [matrix, labels]);

  const layout = useMemo(() => getHeatmapLayout('', labels), [labels]);
  const config = useMemo(() => getDefaultConfig(), []);

  if (labels.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center text-muted-foreground text-sm">
            Add holdings to view correlation matrix
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <Plot
            data={plotData}
            layout={layout}
            config={config}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler={true}
          />
        </div>
        <div className="mt-3 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#10b981]" />
            <span>Negative (diversifying)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#fafafa] border border-border" />
            <span>Neutral</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#dc2626]" />
            <span>Positive (concentrating)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
