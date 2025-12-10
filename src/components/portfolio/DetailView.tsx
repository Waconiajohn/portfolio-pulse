import { DiagnosticResult, RiskTolerance, PlanningChecklist, GuaranteedIncomeSource } from '@/types/portfolio';
import { StatusBadge } from './StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Check, AlertCircle, Info, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine, Legend } from 'recharts';
import { ScoringConfig, DEFAULT_SCORING_CONFIG, getEducationContent } from '@/lib/scoring-config';
import { Badge } from '@/components/ui/badge';

interface DetailViewProps {
  name: string;
  categoryKey: string;
  result: DiagnosticResult;
  onClose: () => void;
  scoringConfig?: ScoringConfig;
  riskTolerance?: RiskTolerance;
  clientAge?: number;
}

const CHART_COLORS = [
  'hsl(217, 91%, 60%)',
  'hsl(142, 76%, 46%)',
  'hsl(45, 93%, 47%)',
  'hsl(280, 65%, 60%)',
  'hsl(0, 84%, 60%)',
  'hsl(190, 90%, 50%)',
];

export function DetailView({ 
  name, 
  categoryKey,
  result, 
  onClose,
  scoringConfig = DEFAULT_SCORING_CONFIG,
  riskTolerance = 'Moderate',
  clientAge = 62
}: DetailViewProps) {
  const { details } = result;
  const educationContent = getEducationContent(scoringConfig, riskTolerance);
  const education = educationContent[categoryKey];

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
        <h4 className="text-sm font-medium">Tax-Loss Harvesting Candidates</h4>
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
    if (!details.checklistItems || !details.checklist) return null;
    
    const checklistItems = details.checklistItems as Record<string, { name: string; critical: boolean }>;
    const checklist = details.checklist as PlanningChecklist;

    const items = Object.entries(checklistItems).map(([key, config]) => ({
      key,
      name: config.name,
      critical: config.critical,
      completed: checklist[key as keyof PlanningChecklist] || false,
    }));

    return (
      <div className="space-y-2 col-span-2">
        <h4 className="text-sm font-medium">Planning Checklist Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {items.map(item => (
            <div 
              key={item.key} 
              className={`flex items-center justify-between p-3 rounded border ${
                item.completed 
                  ? 'bg-status-good/5 border-status-good/20' 
                  : item.critical 
                  ? 'bg-status-critical/5 border-status-critical/20' 
                  : 'bg-muted/30 border-border'
              }`}
            >
              <div className="flex items-center gap-2">
                {item.completed ? (
                  <Check size={16} className="text-status-good" />
                ) : (
                  <AlertCircle size={16} className={item.critical ? 'text-status-critical' : 'text-muted-foreground'} />
                )}
                <span className="text-sm">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.critical && !item.completed && (
                  <Badge variant="destructive" className="text-xs">Critical</Badge>
                )}
                <span className={`text-xs ${item.completed ? 'text-status-good' : 'text-muted-foreground'}`}>
                  {item.completed ? 'Complete' : 'Missing'}
                </span>
              </div>
            </div>
          ))}
        </div>
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

        {/* Income Timeline Chart */}
        {sources.length > 0 && clientAge && (
          (() => {
            // Generate timeline data from current age to 95
            const endAge = 95;
            const timelineData = [];
            
            for (let age = clientAge; age <= endAge; age++) {
              const activeSources = sources.filter(s => age >= s.startAge);
              const incomeAtAge = activeSources.reduce((sum, s) => sum + s.monthlyAmount, 0);
              
              timelineData.push({
                age,
                income: incomeAtAge,
                coreExpenses: coreExpenses,
                totalExpenses: totalExpenses,
                coverage: coreExpenses > 0 ? (incomeAtAge / coreExpenses) * 100 : 0,
                activeSources: activeSources.map(s => s.sourceName || SOURCE_TYPE_LABELS[s.sourceType]).join(', '),
              });
            }

            // Find key milestone ages
            const milestones = sources
              .filter(s => s.startAge > clientAge)
              .map(s => ({ age: s.startAge, name: s.sourceName || SOURCE_TYPE_LABELS[s.sourceType] }))
              .sort((a, b) => a.age - b.age);

            // Find age when coverage crosses 100%
            const fullCoverageAge = timelineData.find(d => d.coverage >= 100)?.age;

            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-medium">Income Activation Timeline</h5>
                  {fullCoverageAge && (
                    <Badge variant="outline" className="text-xs bg-status-good/10 text-status-good border-status-good/30">
                      Core covered at age {fullCoverageAge}
                    </Badge>
                  )}
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(142, 76%, 46%)" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="hsl(142, 76%, 46%)" stopOpacity={0.1}/>
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
                          name === 'income' ? 'Guaranteed Income' : name === 'coreExpenses' ? 'Core Expenses' : 'Total Expenses'
                        ]}
                        labelFormatter={(age) => `Age ${age}`}
                      />
                      <Legend 
                        formatter={(value) => 
                          value === 'income' ? 'Guaranteed Income' : 
                          value === 'coreExpenses' ? 'Core Expenses' : 'Total Expenses'
                        }
                      />
                      <Area 
                        type="stepAfter" 
                        dataKey="income" 
                        stroke="hsl(142, 76%, 46%)" 
                        fill="url(#incomeGradient)"
                        strokeWidth={2}
                      />
                      <ReferenceLine 
                        y={coreExpenses} 
                        stroke="hsl(45, 93%, 47%)" 
                        strokeDasharray="5 5"
                        strokeWidth={2}
                      />
                      <ReferenceLine 
                        y={totalExpenses} 
                        stroke="hsl(0, 84%, 60%)" 
                        strokeDasharray="3 3"
                        strokeWidth={1}
                      />
                      {milestones.map((m, i) => (
                        <ReferenceLine 
                          key={i}
                          x={m.age} 
                          stroke="hsl(217, 91%, 60%)" 
                          strokeDasharray="3 3"
                          label={{ value: m.name, position: 'top', fill: 'hsl(217, 91%, 60%)', fontSize: 10 }}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(142, 76%, 46%)' }} />
                    <span className="text-muted-foreground">Guaranteed Income</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5" style={{ backgroundColor: 'hsl(45, 93%, 47%)' }} />
                    <span className="text-muted-foreground">Core Expenses (${coreExpenses.toLocaleString()}/mo)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5" style={{ backgroundColor: 'hsl(0, 84%, 60%)' }} />
                    <span className="text-muted-foreground">Total Expenses (${totalExpenses.toLocaleString()}/mo)</span>
                  </div>
                </div>
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
        {/* Education Summary */}
        {education && (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-2">
              <Info size={16} className="text-primary mt-0.5 shrink-0" />
              <div className="space-y-1">
                <div className="text-sm font-medium text-primary">{education.title}</div>
                <p className="text-xs text-muted-foreground">{education.whatItMeasures}</p>
                {education.riskToleranceNote && (
                  <p className="text-xs text-primary/80 mt-1">{education.riskToleranceNote}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <div className="text-sm text-muted-foreground mb-1">Key Finding</div>
            <div className="font-medium">{result.keyFinding}</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <div className="text-sm text-muted-foreground mb-1">Primary Metric</div>
            <div className="font-mono font-medium">{result.headlineMetric}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderIncomeSecurityCallout()}
          {renderSectorChart()}
          {renderTopPositions()}
          {renderFeeBreakdown()}
          {renderEfficiencyTable()}
          {renderScenarios()}
          {renderTaxHarvestingTable()}
          {renderPlanningChecklist()}
          {renderProtectionRisks()}
          {renderLifetimeIncomeDetail()}
        </div>
      </CardContent>
    </Card>
  );
}
