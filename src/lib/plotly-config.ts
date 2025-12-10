// Centralized Plotly configuration for consistent styling across all charts

// Dark theme colors matching the advisor UI
export const PLOTLY_COLORS = {
  background: 'rgba(0,0,0,0)',
  paper: 'rgba(0,0,0,0)',
  text: 'hsl(210, 40%, 98%)', // foreground
  textMuted: 'hsl(215, 20%, 65%)', // muted-foreground
  grid: 'rgba(255,255,255,0.1)',
  primary: 'hsl(217, 91%, 60%)', // primary
  accent: 'hsl(142, 76%, 36%)', // status-good
  warning: 'hsl(45, 93%, 47%)', // status-warning
  danger: 'hsl(0, 84%, 60%)', // status-bad
};

// Heatmap color scales
export const CORRELATION_COLORSCALE: Array<[number, string]> = [
  [0, '#10b981'],     // strong negative - green (good diversification)
  [0.25, '#6ee7b7'],  // slight negative
  [0.5, '#fafafa'],   // neutral - white
  [0.75, '#fca5a5'],  // slight positive
  [1, '#dc2626'],     // strong positive - red (poor diversification)
];

// Default layout configuration
export const getDefaultLayout = (overrides?: Record<string, unknown>): Record<string, unknown> => ({
  font: {
    family: 'Inter, system-ui, sans-serif',
    color: PLOTLY_COLORS.text,
    size: 12,
  },
  paper_bgcolor: PLOTLY_COLORS.paper,
  plot_bgcolor: PLOTLY_COLORS.background,
  margin: { l: 60, r: 20, t: 40, b: 60 },
  autosize: true,
  showlegend: false,
  xaxis: {
    gridcolor: PLOTLY_COLORS.grid,
    zerolinecolor: PLOTLY_COLORS.grid,
    tickfont: { color: PLOTLY_COLORS.textMuted, size: 10 },
  },
  yaxis: {
    gridcolor: PLOTLY_COLORS.grid,
    zerolinecolor: PLOTLY_COLORS.grid,
    tickfont: { color: PLOTLY_COLORS.textMuted, size: 10 },
  },
  hoverlabel: {
    bgcolor: 'hsl(222, 47%, 11%)',
    bordercolor: 'hsl(217, 33%, 17%)',
    font: { color: PLOTLY_COLORS.text, family: 'Inter, system-ui, sans-serif' },
  },
  ...overrides,
});

// Default config to trim mode bar for client-facing use
export const getDefaultConfig = (overrides?: Record<string, unknown>): Record<string, unknown> => ({
  displaylogo: false,
  responsive: true,
  modeBarButtonsToRemove: [
    'toImage',
    'lasso2d',
    'select2d',
    'autoScale2d',
    'hoverClosestCartesian',
    'hoverCompareCartesian',
    'toggleSpikelines',
  ],
  displayModeBar: 'hover',
  ...overrides,
});

// Heatmap-specific layout
export const getHeatmapLayout = (title: string, labels: string[]): Record<string, unknown> => ({
  ...getDefaultLayout(),
  title: {
    text: title,
    font: { size: 14, color: PLOTLY_COLORS.text },
    x: 0,
    xanchor: 'left',
  },
  xaxis: {
    side: 'top',
    tickangle: -45,
    tickfont: { color: PLOTLY_COLORS.textMuted, size: 10 },
    gridcolor: 'transparent',
  },
  yaxis: {
    autorange: 'reversed',
    tickfont: { color: PLOTLY_COLORS.textMuted, size: 10 },
    gridcolor: 'transparent',
  },
  margin: { l: 80, r: 40, t: 80, b: 40 },
});
