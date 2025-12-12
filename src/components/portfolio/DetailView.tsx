import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DiagnosticResult, RiskTolerance, PlanningChecklist, GuaranteedIncomeSource, LifetimeIncomeInputs, GuaranteedIncomeSourceType } from '@/types/portfolio';
import type { CardContract } from '@/domain/cards/types';
import { PerformanceMetrics, MetricStatus, METRIC_EDUCATION } from '@/types/performance-metrics';
import { StatusBadge } from './StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { X, Check, AlertCircle, Info, TrendingUp, TrendingDown, Minus, ChevronDown, Plus, Trash2, DollarSign, Activity } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine, Legend } from 'recharts';
import { ScoringConfig, DEFAULT_SCORING_CONFIG, getEducationContent } from '@/lib/scoring-config';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

interface DetailViewProps {
  name: string;
  categoryKey: string;
  result: DiagnosticResult;
  onClose: () => void;
  scoringConfig?: ScoringConfig;
  riskTolerance?: RiskTolerance;
  clientAge?: number;
  inflationRate?: number;
  checklist?: PlanningChecklist;
  onChecklistUpdate?: (checklist: PlanningChecklist) => void;
  lifetimeIncomeInputs?: LifetimeIncomeInputs;
  onLifetimeIncomeUpdate?: (inputs: LifetimeIncomeInputs) => void;
  card?: CardContract | null;
}

const CHART_COLORS = [
  'hsl(217, 91%, 60%)',
  'hsl(142, 76%, 46%)',
  'hsl(45, 93%, 47%)',
  'hsl(280, 65%, 60%)',
  'hsl(0, 84%, 60%)',
  'hsl(190, 90%, 50%)',
];

function severityBadge(sev?: "NORMAL" | "EXTREME") {
  if (sev === "EXTREME") return <Badge variant="destructive">Extreme</Badge>;
  return <Badge variant="secondary">Normal</Badge>;
}

export function DetailView({
  name, 
  categoryKey,
  result, 
  onClose,
  scoringConfig = DEFAULT_SCORING_CONFIG,
  riskTolerance = 'Moderate',
  clientAge = 62,
  inflationRate = 0.025,
  checklist,
  onChecklistUpdate,
  lifetimeIncomeInputs,
  onLifetimeIncomeUpdate,
  card
}: DetailViewProps) {
  const navigate = useNavigate();
  const { details } = result;
  const educationContent = getEducationContent(scoringConfig, riskTolerance);
  const education = educationContent[categoryKey];
  const [viewMode, setViewMode] = useState<'nominal' | 'real'>('nominal');
  const [expensesOpen, setExpensesOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);

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
    
    const efficiency = details.holdingEfficiency as Array<{ 
      ticker: string; 
      sharpe: number; 
      contribution: string; 
      weight: number;
      pctOfTarget?: number;
    }>;

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Holding Efficiency</h4>
        <div className="text-xs text-muted-foreground mb-2">
          Target: ≥90% of Sharpe target = Good, 70-90% = Below Target, &lt;70% = Poor
        </div>
        <div className="space-y-1">
          {efficiency.map(h => (
            <div key={h.ticker} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
              <span className="font-mono">{h.ticker}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  Sharpe: {h.sharpe.toFixed(2)} {h.pctOfTarget !== undefined && `(${h.pctOfTarget}%)`}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  h.contribution === 'GOOD' ? 'status-good' : 
                  h.contribution === 'BELOW TARGET' ? 'status-warning' : 'status-critical'
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

  const renderProtectionRisks = () => {
    if (!details.riskDetails) return null;
    
    const risks = details.riskDetails as Array<{ 
      name: string;
      label: string;
      score: number;
      maxScore: number;
      severity: string;
      description: string;
      mitigation: string;
    }>;

    const getSeverityColor = (severity: string) => {
      switch (severity) {
        case 'CRITICAL': return 'status-critical';
        case 'HIGH': return 'status-warning';
        case 'MODERATE': return 'bg-yellow-500/20 text-yellow-600';
        default: return 'status-good';
      }
    };

    return (
      <div className="space-y-3 col-span-2">
        <h4 className="text-sm font-medium">Risk Category Breakdown</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {risks.map(risk => (
            <div 
              key={risk.name} 
              className={`p-3 rounded border ${
                risk.severity === 'CRITICAL' ? 'bg-status-critical/5 border-status-critical/30' :
                risk.severity === 'HIGH' ? 'bg-status-warning/5 border-status-warning/30' :
                'bg-muted/30 border-border'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{risk.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{risk.score}/{risk.maxScore}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${getSeverityColor(risk.severity)}`}>
                    {risk.severity}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{risk.description}</p>
              {(risk.severity === 'HIGH' || risk.severity === 'CRITICAL') && (
                <p className="text-xs text-primary">💡 {risk.mitigation}</p>
              )}
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

  const renderTaxEfficiencyFullTable = () => {
    const allHoldings = details.allHoldings as Array<{
      ticker: string;
      name: string;
      accountType: string;
      value: number;
      gainLoss: number;
      gainLossPct: number;
      harvestable: boolean;
    }> | undefined;

    if (!allHoldings || allHoldings.length === 0) return null;

    const totalHarvestable = details.totalHarvestable as number || 0;
    const estimatedTaxSavings = details.estimatedTaxSavings as number || 0;

    return (
      <div className="space-y-3 col-span-2">
        <h4 className="text-sm font-medium">All Holdings - Gain/Loss & Harvestable Status</h4>
        
        {/* Education callout */}
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-start gap-2">
          <Info size={16} className="text-primary mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Tax-loss harvesting</span> applies ONLY to taxable/brokerage accounts, not IRAs or 401(k)s. 
            Losses in qualified accounts cannot be deducted. Watch for wash sale rules (no repurchase within 30 days).
          </div>
        </div>

        {/* Summary stats */}
        {totalHarvestable > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-status-good/10 border border-status-good/20">
              <div className="text-xs text-muted-foreground">Harvestable Losses</div>
              <div className="font-mono font-semibold text-status-good">
                ${totalHarvestable.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-status-good/10 border border-status-good/20">
              <div className="text-xs text-muted-foreground">Est. Tax Savings (25%)</div>
              <div className="font-mono font-semibold text-status-good">
                ${estimatedTaxSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>
        )}

        {/* Full holdings table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2 font-medium">Holding</th>
                <th className="text-left p-2 font-medium">Account</th>
                <th className="text-right p-2 font-medium">Value</th>
                <th className="text-right p-2 font-medium">Gain/Loss</th>
                <th className="text-center p-2 font-medium">Harvestable?</th>
              </tr>
            </thead>
            <tbody>
              {allHoldings.map((h, idx) => (
                <tr 
                  key={`${h.ticker}-${idx}`} 
                  className={cn(
                    'border-t border-border',
                    h.harvestable && 'bg-status-good/5'
                  )}
                >
                  <td className="p-2">
                    <div className="font-mono font-medium">{h.ticker}</div>
                    {h.name && <div className="text-xs text-muted-foreground truncate max-w-[150px]">{h.name}</div>}
                  </td>
                  <td className="p-2">
                    <Badge variant="outline" className="text-xs">
                      {h.accountType}
                    </Badge>
                  </td>
                  <td className="p-2 text-right font-mono">
                    ${h.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td className={cn(
                    'p-2 text-right font-mono',
                    h.gainLoss >= 0 ? 'value-positive' : 'value-negative'
                  )}>
                    <div>{h.gainLoss >= 0 ? '+' : ''}{h.gainLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    <div className="text-xs opacity-70">
                      ({h.gainLoss >= 0 ? '+' : ''}{h.gainLossPct.toFixed(1)}%)
                    </div>
                  </td>
                  <td className="p-2 text-center">
                    {h.gainLoss < 0 ? (
                      <span className={cn(
                        'text-xs px-2 py-1 rounded',
                        h.harvestable 
                          ? 'status-good font-medium' 
                          : 'bg-muted text-muted-foreground'
                      )}>
                        {h.harvestable ? '✓ Yes' : 'N/A (Qualified)'}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTaxHarvestingTable = () => {
    if (!details.lossCandidates) return null;
    
    const candidates = details.lossCandidates as Array<{ 
      ticker: string; 
      accountType: string; 
      unrealizedLoss: number; 
      harvestable: boolean;
    }>;

    if (candidates.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Tax-Loss Harvesting Candidates (Summary)</h4>
        <div className="text-xs text-muted-foreground mb-2">
          Only losses in taxable accounts can be harvested. Watch for wash sale rules when replacing positions.
        </div>
        <div className="space-y-1">
          {candidates.map(c => (
            <div key={c.ticker} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="font-mono">{c.ticker}</span>
                <Badge variant="outline" className="text-xs">
                  {c.accountType}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-destructive">
                  -${c.unrealizedLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  c.harvestable ? 'status-good' : 'bg-muted text-muted-foreground'
                }`}>
                  {c.harvestable ? 'Harvestable (Taxable)' : 'N/A - Qualified'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPlanningChecklist = () => {
    if (!details.checklistItems || !checklist || !onChecklistUpdate) return null;
    
    const checklistItems = details.checklistItems as Record<string, { name: string; description: string; critical: boolean; priority: string }>;

    const handleToggle = (key: string) => {
      onChecklistUpdate({ ...checklist, [key]: !checklist[key as keyof PlanningChecklist] });
    };

    const priorityOrder = ['ASAP', 'Soon', 'Routine'];
    const groupedItems = priorityOrder.map(priority => ({
      priority,
      items: Object.entries(checklistItems)
        .filter(([_, config]) => config.priority === priority)
        .map(([key, config]) => ({
          key,
          name: config.name,
          description: config.description,
          critical: config.critical,
          completed: checklist[key as keyof PlanningChecklist] || false,
        }))
    })).filter(group => group.items.length > 0);

    const priorityConfig: Record<string, { label: string; className: string }> = {
      'ASAP': { label: 'ASAP', className: 'bg-status-critical/20 text-status-critical border-status-critical/30' },
      'Soon': { label: 'Soon', className: 'bg-status-warning/20 text-status-warning border-status-warning/30' },
      'Routine': { label: 'Routine', className: 'bg-muted text-muted-foreground border-border' },
    };

    return (
      <div className="space-y-4 col-span-2">
        <h4 className="text-sm font-medium">Planning Checklist</h4>
        {groupedItems.map(({ priority, items }) => (
          <div key={priority} className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn('text-xs', priorityConfig[priority]?.className)}>
                {priorityConfig[priority]?.label || priority}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {items.filter(item => item.completed).length}/{items.length}
              </span>
            </div>
            <div className="space-y-1">
              {items.map(item => (
                <div 
                  key={item.key} 
                  className={cn(
                    'flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors hover:bg-muted/50',
                    item.completed 
                      ? 'bg-status-good/5 border-status-good/20 opacity-60' 
                      : item.critical 
                      ? 'bg-status-critical/5 border-status-critical/20' 
                      : 'bg-muted/30 border-border'
                  )}
                  onClick={() => handleToggle(item.key)}
                >
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={() => handleToggle(item.key)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className={cn('font-medium text-sm', item.completed && 'line-through')}>
                      {item.name}
                    </div>
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  </div>
                  {item.critical && !item.completed && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Critical</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderLifetimeIncomeDetail = () => {
    if (categoryKey !== 'lifetimeIncomeSecurity') return null;
    
    const sources = (details.sources || []) as GuaranteedIncomeSource[];
    const coreExpenses = details.coreExpensesMonthly as number;
    const discretionary = details.discretionaryMonthly as number;
    const healthcare = details.healthcareMonthly as number;
    const totalExpenses = details.totalExpensesMonthly as number;
    const guaranteedIncome = details.guaranteedLifetimeIncomeMonthly as number;
    const coreCoverage = details.coreCoveragePct as number;
    const totalCoverage = details.totalCoveragePct as number;
    const shortfall = details.shortfallCoreMonthly as number;
    const surplus = details.surplusForLifestyleMonthly as number;

    if (!coreExpenses && sources.length === 0) return null;

    const coverageChartData = [
      { name: 'Covered', value: Math.min(guaranteedIncome, coreExpenses), fill: 'hsl(142, 76%, 46%)' },
      { name: 'Shortfall', value: shortfall, fill: 'hsl(0, 84%, 60%)' },
    ].filter(d => d.value > 0);

    const SOURCE_TYPE_LABELS: Record<string, string> = {
      'social-security-client': 'SS (Client)',
      'social-security-spouse': 'SS (Spouse)',
      'pension-client': 'Pension (Client)',
      'pension-spouse': 'Pension (Spouse)',
      'guaranteed-annuity': 'Annuity',
      'other-guaranteed': 'Other',
    };

    return (
      <div className="space-y-4 col-span-2">
        <h4 className="text-sm font-medium">Lifetime Income Analysis</h4>
        
        {/* Coverage Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <div className="text-xs text-muted-foreground">Core Expenses</div>
            <div className="font-mono font-semibold">${coreExpenses.toLocaleString()}/mo</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <div className="text-xs text-muted-foreground">Discretionary</div>
            <div className="font-mono font-semibold">${discretionary.toLocaleString()}/mo</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <div className="text-xs text-muted-foreground">Healthcare/LTC</div>
            <div className="font-mono font-semibold">${healthcare.toLocaleString()}/mo</div>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="text-xs text-muted-foreground">Guaranteed Income</div>
            <div className="font-mono font-semibold text-primary">${guaranteedIncome.toLocaleString()}/mo</div>
          </div>
        </div>

        {/* Coverage Chart */}
        {coverageChartData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={coverageChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: $${value.toLocaleString()}`}
                    labelLine={false}
                  >
                    {coverageChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(222, 47%, 10%)', 
                      border: '1px solid hsl(217, 33%, 17%)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}/mo`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-3">
              <div className={`p-3 rounded-lg border ${
                coreCoverage >= 1 ? 'bg-status-good/10 border-status-good/20' :
                coreCoverage >= 0.8 ? 'bg-status-warning/10 border-status-warning/20' :
                'bg-status-critical/10 border-status-critical/20'
              }`}>
                <div className="text-xs text-muted-foreground">Core Expense Coverage</div>
                <div className={`font-mono text-2xl font-semibold ${
                  coreCoverage >= 1 ? 'text-status-good' :
                  coreCoverage >= 0.8 ? 'text-status-warning' : 'text-status-critical'
                }`}>
                  {(coreCoverage * 100).toFixed(0)}%
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <div className="text-xs text-muted-foreground">Total Expense Coverage</div>
                <div className="font-mono text-xl font-semibold">{(totalCoverage * 100).toFixed(0)}%</div>
              </div>
              {shortfall > 0 && (
                <div className="p-3 rounded-lg bg-status-critical/10 border-status-critical/20">
                  <div className="text-xs text-muted-foreground">Monthly Shortfall</div>
                  <div className="font-mono font-semibold text-status-critical">-${shortfall.toLocaleString()}/mo</div>
                </div>
              )}
              {surplus > 0 && (
                <div className="p-3 rounded-lg bg-status-good/10 border-status-good/20">
                  <div className="text-xs text-muted-foreground">Surplus for Lifestyle</div>
                  <div className="font-mono font-semibold text-status-good">+${surplus.toLocaleString()}/mo</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Income Timeline Chart with Inflation Projections */}
        {sources.length > 0 && clientAge && (
          (() => {
            // Generate timeline data from current age to 95 with inflation adjustments
            const endAge = 95;
            const timelineData = [];
            
            for (let age = clientAge; age <= endAge; age++) {
              const yearsFromNow = age - clientAge;
              const inflationFactor = Math.pow(1 + inflationRate, yearsFromNow);
              
              // Expenses grow with inflation each year (nominal)
              const inflatedCoreExpenses = coreExpenses * inflationFactor;
              const inflatedTotalExpenses = totalExpenses * inflationFactor;
              
              // Calculate income at this age, separating COLA vs non-COLA
              const activeSources = sources.filter(s => age >= s.startAge);
              let colaIncomeAtAge = 0;
              let nonColaIncomeAtAge = 0;
              
              activeSources.forEach(source => {
                const yearsActive = age - source.startAge;
                if (source.inflationAdj) {
                  // COLA sources grow with inflation from their start date
                  colaIncomeAtAge += source.monthlyAmount * Math.pow(1 + inflationRate, yearsActive);
                } else {
                  // Non-COLA sources stay flat (nominal)
                  nonColaIncomeAtAge += source.monthlyAmount;
                }
              });
              
              const totalIncomeAtAge = colaIncomeAtAge + nonColaIncomeAtAge;
              
              // For "real" view, discount everything back to today's dollars
              if (viewMode === 'real') {
                timelineData.push({
                  age,
                  colaIncome: colaIncomeAtAge / inflationFactor,
                  nonColaIncome: nonColaIncomeAtAge / inflationFactor,
                  totalIncome: totalIncomeAtAge / inflationFactor,
                  coreExpenses: coreExpenses, // Stays flat in real terms
                  totalExpenses: totalExpenses,
                  coverage: coreExpenses > 0 ? (totalIncomeAtAge / inflationFactor / coreExpenses) * 100 : 0,
                  activeSources: activeSources.map(s => s.sourceName || SOURCE_TYPE_LABELS[s.sourceType]).join(', '),
                });
              } else {
                // Nominal view - show actual dollar amounts
                timelineData.push({
                  age,
                  colaIncome: colaIncomeAtAge,
                  nonColaIncome: nonColaIncomeAtAge,
                  totalIncome: totalIncomeAtAge,
                  coreExpenses: inflatedCoreExpenses,
                  totalExpenses: inflatedTotalExpenses,
                  coverage: inflatedCoreExpenses > 0 ? (totalIncomeAtAge / inflatedCoreExpenses) * 100 : 0,
                  activeSources: activeSources.map(s => s.sourceName || SOURCE_TYPE_LABELS[s.sourceType]).join(', '),
                });
              }
            }

            // Find key milestone ages
            const milestones = sources
              .filter(s => s.startAge > clientAge)
              .map(s => ({ age: s.startAge, name: s.sourceName || SOURCE_TYPE_LABELS[s.sourceType] }))
              .sort((a, b) => a.age - b.age);

            // Calculate purchasing power stats
            const today = timelineData[0];
            const age20Years = timelineData.find(d => d.age === clientAge + 20);
            const coverageToday = today?.coverage || 0;
            const coverage20Years = age20Years?.coverage || 0;
            
            // Calculate non-COLA purchasing power loss over 20 years
            const nonColaSourcesValue = sources
              .filter(s => !s.inflationAdj && s.guaranteedForLife)
              .reduce((sum, s) => sum + s.monthlyAmount, 0);
            const purchasingPowerLoss20Years = nonColaSourcesValue > 0 
              ? ((1 - 1 / Math.pow(1 + inflationRate, 20)) * 100)
              : 0;

            // Find age when coverage crosses 100%
            const fullCoverageAge = timelineData.find(d => d.coverage >= 100)?.age;

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <h5 className="text-sm font-medium">Income Activation Timeline</h5>
                    <ToggleGroup 
                      type="single" 
                      value={viewMode} 
                      onValueChange={(v) => v && setViewMode(v as 'nominal' | 'real')}
                      size="sm"
                    >
                      <ToggleGroupItem value="nominal" className="text-xs px-2 h-7">
                        Nominal $
                      </ToggleGroupItem>
                      <ToggleGroupItem value="real" className="text-xs px-2 h-7">
                        Real (Today's $)
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                  {fullCoverageAge && (
                    <Badge variant="outline" className="text-xs bg-status-good/10 text-status-good border-status-good/30">
                      Core covered at age {fullCoverageAge}
                    </Badge>
                  )}
                </div>
                
                {/* Inflation info callout */}
                <div className="text-xs text-muted-foreground p-2 rounded bg-muted/30 border border-border">
                  {viewMode === 'nominal' ? (
                    <>Showing future dollar amounts at <span className="font-mono text-primary">{(inflationRate * 100).toFixed(1)}%</span> annual inflation. Expenses grow; COLA income grows; non-COLA stays flat.</>
                  ) : (
                    <>Showing all values in today's purchasing power. Non-COLA income loses value over time.</>
                  )}
                </div>
                
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colaIncomeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(142, 76%, 46%)" stopOpacity={0.5}/>
                          <stop offset="95%" stopColor="hsl(142, 76%, 46%)" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="nonColaIncomeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.5}/>
                          <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="age" 
                        tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }}
                        tickFormatter={(age) => `${age}`}
                      />
                      <YAxis 
                        tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: 'hsl(222, 47%, 10%)', 
                          border: '1px solid hsl(217, 33%, 17%)',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number, name: string) => [
                          `$${value.toLocaleString()}/mo`,
                          name === 'colaIncome' ? 'COLA Income' : 
                          name === 'nonColaIncome' ? 'Non-COLA Income' :
                          name === 'coreExpenses' ? 'Core Expenses' : 'Total Expenses'
                        ]}
                        labelFormatter={(age) => `Age ${age}`}
                      />
                      <Legend 
                        formatter={(value) => 
                          value === 'colaIncome' ? 'COLA Income (inflation-adjusted)' : 
                          value === 'nonColaIncome' ? 'Non-COLA Income (fixed)' :
                          value === 'coreExpenses' ? 'Core Expenses' : 'Total Expenses'
                        }
                      />
                      <Area 
                        type="stepAfter" 
                        dataKey="colaIncome" 
                        stackId="1"
                        stroke="hsl(142, 76%, 46%)" 
                        fill="url(#colaIncomeGradient)"
                        strokeWidth={2}
                      />
                      <Area 
                        type="stepAfter" 
                        dataKey="nonColaIncome" 
                        stackId="1"
                        stroke="hsl(217, 91%, 60%)" 
                        fill="url(#nonColaIncomeGradient)"
                        strokeWidth={2}
                      />
                      <ReferenceLine 
                        y={viewMode === 'nominal' ? timelineData[0]?.coreExpenses : coreExpenses} 
                        stroke="hsl(45, 93%, 47%)" 
                        strokeDasharray="5 5"
                        strokeWidth={2}
                      />
                      <ReferenceLine 
                        y={viewMode === 'nominal' ? timelineData[0]?.totalExpenses : totalExpenses} 
                        stroke="hsl(0, 84%, 60%)" 
                        strokeDasharray="3 3"
                        strokeWidth={1}
                      />
                      {milestones.map((m, i) => (
                        <ReferenceLine 
                          key={i}
                          x={m.age} 
                          stroke="hsl(280, 65%, 60%)" 
                          strokeDasharray="3 3"
                          label={{ value: m.name, position: 'top', fill: 'hsl(280, 65%, 60%)', fontSize: 10 }}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Legend */}
                <div className="flex flex-wrap gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(142, 76%, 46%)' }} />
                    <span className="text-muted-foreground">COLA Income</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(217, 91%, 60%)' }} />
                    <span className="text-muted-foreground">Non-COLA Income</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5" style={{ backgroundColor: 'hsl(45, 93%, 47%)' }} />
                    <span className="text-muted-foreground">Core Expenses</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5" style={{ backgroundColor: 'hsl(0, 84%, 60%)' }} />
                    <span className="text-muted-foreground">Total Expenses</span>
                  </div>
                </div>
                
                {/* Purchasing Power Summary */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="text-xs text-muted-foreground">Coverage Today</div>
                    <div className={`font-mono font-semibold text-lg ${
                      coverageToday >= 100 ? 'text-status-good' : coverageToday >= 80 ? 'text-status-warning' : 'text-status-critical'
                    }`}>
                      {coverageToday.toFixed(0)}%
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="text-xs text-muted-foreground">Coverage at Age {clientAge + 20}</div>
                    <div className={`font-mono font-semibold text-lg ${
                      coverage20Years >= 100 ? 'text-status-good' : coverage20Years >= 80 ? 'text-status-warning' : 'text-status-critical'
                    }`}>
                      {coverage20Years.toFixed(0)}%
                    </div>
                  </div>
                  {nonColaSourcesValue > 0 && (
                    <div className="p-3 rounded-lg bg-status-warning/10 border border-status-warning/20">
                      <div className="text-xs text-muted-foreground">Non-COLA Value Lost (20yr)</div>
                      <div className="font-mono font-semibold text-lg text-status-warning">
                        -{purchasingPowerLoss20Years.toFixed(0)}%
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Inflation Risk Warning */}
                {nonColaSourcesValue > 0 && (
                  <div className="p-3 rounded-lg bg-status-warning/10 border border-status-warning/20 flex items-start gap-2">
                    <AlertCircle size={16} className="text-status-warning mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <span className="font-medium text-status-warning">Inflation Risk:</span>{' '}
                      <span className="text-muted-foreground">
                        ${nonColaSourcesValue.toLocaleString()}/mo of your guaranteed income is not inflation-adjusted. 
                        At {(inflationRate * 100).toFixed(1)}% annual inflation, this loses ~{purchasingPowerLoss20Years.toFixed(0)}% 
                        of purchasing power over 20 years.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()
        )}

        {/* Income Sources Table */}
        {sources.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium">Guaranteed Income Sources</h5>
            <div className="space-y-1">
              {sources.map((source) => (
                <div key={source.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{source.sourceName || SOURCE_TYPE_LABELS[source.sourceType]}</span>
                    <Badge variant="outline" className="text-xs">{SOURCE_TYPE_LABELS[source.sourceType]}</Badge>
                    <Badge variant="outline" className="text-xs">Starts age {source.startAge}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono">${source.monthlyAmount.toLocaleString()}/mo</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      source.guaranteedForLife ? 'status-good' : 'bg-muted text-muted-foreground'
                    }`}>
                      {source.guaranteedForLife ? 'Lifetime ✓' : 'Term'}
                    </span>
                    {source.inflationAdj && (
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">COLA</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Insight */}
        {coreCoverage >= 1 && (
          <div className="p-3 rounded-lg bg-status-good/10 border border-status-good/20">
            <div className="flex items-start gap-2">
              <Check size={16} className="text-status-good mt-0.5 shrink-0" />
              <div className="text-sm">
                <span className="font-medium text-status-good">Income Secure:</span>{' '}
                <span className="text-muted-foreground">
                  Your essential living expenses are fully funded by guaranteed lifetime income. 
                  The investment portfolio can be managed for discretionary spending and legacy goals 
                  without risking your basic lifestyle.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render income security callout for Risk-Adjusted detail view
  const renderIncomeSecurityCallout = () => {
    if (categoryKey !== 'riskAdjusted') return null;
    const incomeSecured = details.incomeSecured as boolean;
    const incomeSecurityNote = details.incomeSecurityNote as string;
    const goalType = details.goalType as 'full' | 'discretionary-only';
    
    if (!incomeSecured && !incomeSecurityNote) return null;

    return (
      <div className={`p-3 rounded-lg border col-span-2 ${
        incomeSecured 
          ? 'bg-status-good/10 border-status-good/20' 
          : 'bg-primary/5 border-primary/20'
      }`}>
        <div className="flex items-start gap-2">
          {incomeSecured ? (
            <Check size={16} className="text-status-good mt-0.5 shrink-0" />
          ) : (
            <TrendingUp size={16} className="text-primary mt-0.5 shrink-0" />
          )}
          <div className="text-sm">
            {incomeSecured ? (
              <>
                <span className="font-medium text-status-good">Lifestyle Floor Guaranteed:</span>{' '}
                <span className="text-muted-foreground">
                  Goal probability reflects discretionary and legacy goals only. Your essential living expenses 
                  are already secured by guaranteed lifetime income, regardless of market performance.
                </span>
              </>
            ) : (
              <>
                <span className="font-medium text-primary">Income Note:</span>{' '}
                <span className="text-muted-foreground">{incomeSecurityNote}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render Performance Metrics detail view
  const renderPerformanceMetricsDetail = () => {
    if (categoryKey !== 'performanceMetrics') return null;
    
    const metrics = details.metrics as PerformanceMetrics;
    const metricStatuses = details.metricStatuses as Record<string, MetricStatus>;
    
    if (!metrics || !metricStatuses) return null;

    const StatusIcon = ({ status }: { status: 'good' | 'warning' | 'poor' }) => {
      if (status === 'good') return <TrendingUp size={14} className="text-status-good" />;
      if (status === 'poor') return <TrendingDown size={14} className="text-status-critical" />;
      return <Minus size={14} className="text-status-warning" />;
    };

    const METRIC_DISPLAY_ORDER: (keyof PerformanceMetrics)[] = [
      'totalReturn',
      'cagr',
      'sharpeRatio',
      'sortinoRatio',
      'calmarRatio',
      'standardDeviation',
      'beta',
      'maxDrawdown',
      'expenseRatio',
    ];

    const METRIC_LABELS: Record<string, string> = {
      totalReturn: 'Total Return',
      cagr: 'Avg Return (CAGR)',
      sharpeRatio: 'Sharpe Ratio',
      sortinoRatio: 'Sortino Ratio',
      calmarRatio: 'Calmar Ratio',
      standardDeviation: 'Volatility (Std Dev)',
      beta: 'Beta',
      maxDrawdown: 'Max Drawdown',
      expenseRatio: 'Expense Ratio',
    };

    return (
      <div className="space-y-4 col-span-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Activity size={16} className="text-primary" />
          All Performance Metrics
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {METRIC_DISPLAY_ORDER.map((key) => {
            const metricStatus = metricStatuses[key];
            if (!metricStatus) return null;
            
            const education = METRIC_EDUCATION[key];

            return (
              <div 
                key={key}
                className={cn(
                  'p-3 rounded-lg border transition-colors',
                  metricStatus.status === 'good' && 'bg-status-good/5 border-status-good/20',
                  metricStatus.status === 'warning' && 'bg-status-warning/5 border-status-warning/20',
                  metricStatus.status === 'poor' && 'bg-status-critical/5 border-status-critical/20'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {METRIC_LABELS[key] || key}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <StatusIcon status={metricStatus.status} />
                    <span className={cn(
                      'text-xs font-medium',
                      metricStatus.status === 'good' && 'text-status-good',
                      metricStatus.status === 'warning' && 'text-status-warning',
                      metricStatus.status === 'poor' && 'text-status-critical'
                    )}>
                      {metricStatus.label}
                    </span>
                  </div>
                </div>
                <div className="font-mono text-lg font-semibold">
                  {metricStatus.formattedValue}
                </div>
                {education && (
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                    {education.brief}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-primary mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground">
              Performance metrics provide a comprehensive view of your portfolio's risk-adjusted returns. 
              Focus on maintaining a balance between growth (Return, CAGR) and risk management (Sharpe, Max Drawdown).
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Lifetime Income Inputs Editor (for lifetimeIncomeSecurity category)
  const renderLifetimeIncomeInputsEditor = () => {
    if (categoryKey !== 'lifetimeIncomeSecurity' || !lifetimeIncomeInputs || !onLifetimeIncomeUpdate) return null;

    const SOURCE_TYPE_LABELS: Record<GuaranteedIncomeSourceType, string> = {
      'social-security-client': 'Social Security – Client',
      'social-security-spouse': 'Social Security – Spouse',
      'pension-client': 'Pension – Client',
      'pension-spouse': 'Pension – Spouse',
      'guaranteed-annuity': 'Guaranteed Annuity',
      'other-guaranteed': 'Other Guaranteed',
    };

    const SOURCE_TYPES: GuaranteedIncomeSourceType[] = [
      'social-security-client',
      'social-security-spouse',
      'pension-client',
      'pension-spouse',
      'guaranteed-annuity',
      'other-guaranteed',
    ];

    const totalExpenses = lifetimeIncomeInputs.coreLivingExpensesMonthly + 
      lifetimeIncomeInputs.discretionaryExpensesMonthly + 
      lifetimeIncomeInputs.healthcareLongTermCareMonthly;
    
    const totalGuaranteedIncome = lifetimeIncomeInputs.guaranteedSources
      .filter(s => s.guaranteedForLife)
      .reduce((sum, s) => sum + s.monthlyAmount, 0);

    const addSource = () => {
      const newSource: GuaranteedIncomeSource = {
        id: crypto.randomUUID(),
        sourceName: '',
        sourceType: 'social-security-client',
        monthlyAmount: 0,
        startAge: 65,
        inflationAdj: true,
        guaranteedForLife: true,
      };
      onLifetimeIncomeUpdate({
        ...lifetimeIncomeInputs,
        guaranteedSources: [...lifetimeIncomeInputs.guaranteedSources, newSource],
      });
      setIncomeOpen(true);
    };

    const updateSource = (id: string, field: keyof GuaranteedIncomeSource, value: unknown) => {
      onLifetimeIncomeUpdate({
        ...lifetimeIncomeInputs,
        guaranteedSources: lifetimeIncomeInputs.guaranteedSources.map(s => 
          s.id === id ? { ...s, [field]: value } : s
        ),
      });
    };

    const removeSource = (id: string) => {
      onLifetimeIncomeUpdate({
        ...lifetimeIncomeInputs,
        guaranteedSources: lifetimeIncomeInputs.guaranteedSources.filter(s => s.id !== id),
      });
    };

    return (
      <div className="space-y-3 col-span-2 p-4 rounded-lg bg-muted/20 border border-border">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <DollarSign size={16} className="text-primary" />
          Edit Income & Expenses
        </h4>

        {/* Summary Row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-lg bg-muted/50 border border-border">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Expenses</div>
            <div className="font-mono text-base font-semibold">${totalExpenses.toLocaleString()}/mo</div>
          </div>
          <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Guaranteed Income</div>
            <div className="font-mono text-base font-semibold text-primary">${totalGuaranteedIncome.toLocaleString()}/mo</div>
          </div>
        </div>

        {/* Collapsible Expenses Section */}
        <Collapsible open={expensesOpen} onOpenChange={setExpensesOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <DollarSign size={14} className="text-muted-foreground" />
                <span className="text-xs font-medium">Monthly Expenses</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">
                  ${totalExpenses.toLocaleString()}/mo
                </span>
                <ChevronDown size={14} className={cn(
                  "text-muted-foreground transition-transform duration-200",
                  expensesOpen && "rotate-180"
                )} />
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            <div className="space-y-2 p-2.5 rounded-lg bg-muted/20 border border-border">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Core Living</Label>
                <Input
                  type="number"
                  value={lifetimeIncomeInputs.coreLivingExpensesMonthly || ''}
                  onChange={(e) => onLifetimeIncomeUpdate({ ...lifetimeIncomeInputs, coreLivingExpensesMonthly: parseFloat(e.target.value) || 0 })}
                  placeholder="Housing, food..."
                  className="h-9 font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Discretionary</Label>
                <Input
                  type="number"
                  value={lifetimeIncomeInputs.discretionaryExpensesMonthly || ''}
                  onChange={(e) => onLifetimeIncomeUpdate({ ...lifetimeIncomeInputs, discretionaryExpensesMonthly: parseFloat(e.target.value) || 0 })}
                  placeholder="Travel, dining..."
                  className="h-9 font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Healthcare</Label>
                <Input
                  type="number"
                  value={lifetimeIncomeInputs.healthcareLongTermCareMonthly || ''}
                  onChange={(e) => onLifetimeIncomeUpdate({ ...lifetimeIncomeInputs, healthcareLongTermCareMonthly: parseFloat(e.target.value) || 0 })}
                  placeholder="Medical, LTC..."
                  className="h-9 font-mono text-sm"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Collapsible Income Sources Section */}
        <Collapsible open={incomeOpen} onOpenChange={setIncomeOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-muted-foreground" />
                <span className="text-xs font-medium">Income Sources</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {lifetimeIncomeInputs.guaranteedSources.length} sources
                </span>
                <ChevronDown size={14} className={cn(
                  "text-muted-foreground transition-transform duration-200",
                  incomeOpen && "rotate-180"
                )} />
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            {lifetimeIncomeInputs.guaranteedSources.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                No income sources yet
              </div>
            ) : (
              <div className="space-y-2">
                {lifetimeIncomeInputs.guaranteedSources.map((source) => (
                  <div key={source.id} className="p-2.5 rounded-lg bg-muted/20 border border-border space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Type</Label>
                        <Select
                          value={source.sourceType}
                          onValueChange={(v) => updateSource(source.id, 'sourceType', v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SOURCE_TYPES.map(type => (
                              <SelectItem key={type} value={type} className="text-xs">
                                {SOURCE_TYPE_LABELS[type]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Amount</Label>
                        <Input
                          type="number"
                          value={source.monthlyAmount || ''}
                          onChange={(e) => updateSource(source.id, 'monthlyAmount', parseFloat(e.target.value) || 0)}
                          placeholder="$0"
                          className="h-8 font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <Checkbox
                            id={`inflation-${source.id}`}
                            checked={source.inflationAdj}
                            onCheckedChange={(checked) => updateSource(source.id, 'inflationAdj', checked)}
                            className="h-3.5 w-3.5"
                          />
                          <Label htmlFor={`inflation-${source.id}`} className="text-[10px] cursor-pointer">
                            COLA
                          </Label>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Checkbox
                            id={`lifetime-${source.id}`}
                            checked={source.guaranteedForLife}
                            onCheckedChange={(checked) => updateSource(source.id, 'guaranteedForLife', checked)}
                            className="h-3.5 w-3.5"
                          />
                          <Label htmlFor={`lifetime-${source.id}`} className="text-[10px] cursor-pointer">
                            Lifetime
                          </Label>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeSource(source.id)}
                        className="h-6 w-6 text-destructive hover:text-destructive"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" size="sm" onClick={addSource} className="w-full gap-1.5 h-8 text-xs">
              <Plus size={12} />
              Add Income Source
            </Button>
          </CollapsibleContent>
        </Collapsible>
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
        {/* Section 1: Why this matters */}
        {card?.whyItMatters && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Why this matters</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{card.whyItMatters}</p>
            {card.contextLabel && (
              <div className="mt-2 p-2 rounded-md bg-primary/10 border border-primary/20">
                <span className="text-sm font-medium text-primary">{card.contextLabel}</span>
                <span className="text-sm text-muted-foreground ml-1">
                  — consider focusing improvements here first.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Section 2: What's driving this */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">What's driving this</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="text-xs text-muted-foreground mb-1">Key Finding</div>
              <div className="text-sm font-medium">{result.keyFinding}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="text-xs text-muted-foreground mb-1">Primary Metric</div>
              <div className="font-mono text-sm font-medium">{result.headlineMetric}</div>
            </div>
          </div>
        </div>

        {/* Section 3: Suggested actions */}
        {card?.actions && card.actions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Suggested actions</h3>
            <div className="flex flex-wrap gap-2">
              {card.actions.map((a, idx) => (
                <Button
                  key={`${a.kind}-${idx}`}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (a.deepLink) {
                      navigate(a.deepLink);
                    }
                  }}
                >
                  {a.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {card?.recommendations && card.recommendations.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Recommendations</h3>
            <div className="space-y-2">
              {card.recommendations
                .slice()
                .sort((x, y) => (x.priority ?? 99) - (y.priority ?? 99))
                .map((r) => (
                  <div key={r.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{r.title}</div>
                        {r.description && (
                          <div className="mt-1 text-sm text-muted-foreground">{r.description}</div>
                        )}
                        {r.impact && (
                          <div className="mt-1 text-xs text-muted-foreground">Impact: {r.impact}</div>
                        )}
                      </div>
                      {typeof r.priority === "number" && (
                        <Badge variant="outline" className="shrink-0">
                          Priority {r.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Section 4: Learn more (collapsible) */}
        {education && (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold hover:text-primary transition-colors">
              <ChevronDown className="h-4 w-4" />
              Learn more
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-2">
                  <Info size={16} className="text-primary mt-0.5 shrink-0" />
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-primary">{education.title}</div>
                    <p className="text-xs text-muted-foreground">{education.whatItMeasures}</p>
                    {education.riskToleranceNote && (
                      <p className="text-xs text-primary/80">{education.riskToleranceNote}</p>
                    )}
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Detailed visualizations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderIncomeSecurityCallout()}
          {renderLifetimeIncomeInputsEditor()}
          {renderPerformanceMetricsDetail()}
          {renderSectorChart()}
          {renderTopPositions()}
          {renderFeeBreakdown()}
          {renderEfficiencyTable()}
          {renderScenarios()}
          {renderTaxEfficiencyFullTable()}
          {renderTaxHarvestingTable()}
          {renderPlanningChecklist()}
          {renderProtectionRisks()}
          {renderLifetimeIncomeDetail()}
        </div>
      </CardContent>
    </Card>
  );
}
