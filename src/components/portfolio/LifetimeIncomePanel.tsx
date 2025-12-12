import { useState } from 'react';
import { LifetimeIncomeInputs, GuaranteedIncomeSource, GuaranteedIncomeSourceType } from '@/types/portfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Trash2, Wallet, ChevronDown, DollarSign, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LifetimeIncomePanelProps {
  inputs: LifetimeIncomeInputs;
  onUpdate: (inputs: LifetimeIncomeInputs) => void;
}

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

export function LifetimeIncomePanel({ inputs, onUpdate }: LifetimeIncomePanelProps) {
  const [expensesOpen, setExpensesOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);

  const totalExpenses = inputs.coreLivingExpensesMonthly + inputs.discretionaryExpensesMonthly + inputs.healthcareLongTermCareMonthly;
  const totalGuaranteedIncome = inputs.guaranteedSources
    .filter(s => s.guaranteedForLife)
    .reduce((sum, s) => sum + s.monthlyAmount, 0);
  const coreCoverage = inputs.coreLivingExpensesMonthly > 0 
    ? (totalGuaranteedIncome / inputs.coreLivingExpensesMonthly) * 100 
    : 0;

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
    onUpdate({
      ...inputs,
      guaranteedSources: [...inputs.guaranteedSources, newSource],
    });
    setIncomeOpen(true);
  };

  const updateSource = (id: string, field: keyof GuaranteedIncomeSource, value: unknown) => {
    onUpdate({
      ...inputs,
      guaranteedSources: inputs.guaranteedSources.map(s => 
        s.id === id ? { ...s, [field]: value } : s
      ),
    });
  };

  const removeSource = (id: string) => {
    onUpdate({
      ...inputs,
      guaranteedSources: inputs.guaranteedSources.filter(s => s.id !== id),
    });
  };

  const getCoverageStatus = () => {
    if (coreCoverage >= 100) return { color: 'text-status-good', bg: 'bg-status-good/10 border-status-good/20', label: 'Fully Covered' };
    if (coreCoverage >= 80) return { color: 'text-status-warning', bg: 'bg-status-warning/10 border-status-warning/20', label: 'Mostly Covered' };
    return { color: 'text-status-critical', bg: 'bg-status-critical/10 border-status-critical/20', label: 'Gap Exists' };
  };

  const status = getCoverageStatus();

  return (
    <Card>
      <CardHeader className="pb-2 p-3 sm:p-4 sm:pb-2">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <div className="p-1.5 rounded-lg bg-primary/20">
            <Wallet size={16} className="text-primary" />
          </div>
          Lifetime Income
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
        {/* Summary Row - Always Visible */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-lg bg-muted/50 border border-border">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Monthly Income</div>
            <div className="font-mono text-base font-semibold text-primary">
              ${totalGuaranteedIncome.toLocaleString()}
            </div>
          </div>
          <div className={cn("p-2.5 rounded-lg border", status.bg)}>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Coverage</div>
            <div className={cn("font-mono text-base font-semibold", status.color)}>
              {inputs.coreLivingExpensesMonthly > 0 ? `${coreCoverage.toFixed(0)}%` : '—'}
            </div>
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
                  value={inputs.coreLivingExpensesMonthly || ''}
                  onChange={(e) => onUpdate({ ...inputs, coreLivingExpensesMonthly: parseFloat(e.target.value) || 0 })}
                  placeholder="Housing, food..."
                  className="h-9 font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Discretionary</Label>
                <Input
                  type="number"
                  value={inputs.discretionaryExpensesMonthly || ''}
                  onChange={(e) => onUpdate({ ...inputs, discretionaryExpensesMonthly: parseFloat(e.target.value) || 0 })}
                  placeholder="Travel, dining..."
                  className="h-9 font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Healthcare</Label>
                <Input
                  type="number"
                  value={inputs.healthcareLongTermCareMonthly || ''}
                  onChange={(e) => onUpdate({ ...inputs, healthcareLongTermCareMonthly: parseFloat(e.target.value) || 0 })}
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
                  {inputs.guaranteedSources.length} sources
                </span>
                <ChevronDown size={14} className={cn(
                  "text-muted-foreground transition-transform duration-200",
                  incomeOpen && "rotate-180"
                )} />
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            {inputs.guaranteedSources.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                No income sources yet
              </div>
            ) : (
              <div className="space-y-2">
                {inputs.guaranteedSources.map((source) => (
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
      </CardContent>
    </Card>
  );
}
