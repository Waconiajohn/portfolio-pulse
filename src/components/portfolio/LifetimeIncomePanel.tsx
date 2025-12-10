import { useState } from 'react';
import { LifetimeIncomeInputs, GuaranteedIncomeSource, GuaranteedIncomeSourceType } from '@/types/portfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Wallet, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface LifetimeIncomePanelProps {
  inputs: LifetimeIncomeInputs;
  onUpdate: (inputs: LifetimeIncomeInputs) => void;
}

const SOURCE_TYPE_LABELS: Record<GuaranteedIncomeSourceType, string> = {
  'social-security-client': 'Social Security – Client',
  'social-security-spouse': 'Social Security – Spouse',
  'pension-client': 'Pension – Client',
  'pension-spouse': 'Pension – Spouse',
  'guaranteed-annuity': 'Guaranteed Annuity (SPIA/DIA/FIA)',
  'other-guaranteed': 'Other Guaranteed Income',
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
  };

  const updateSource = (id: string, field: keyof GuaranteedIncomeSource, value: any) => {
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet size={18} className="text-primary" />
          Lifetime Income & Expenses
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info size={14} className="text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Enter monthly expenses and guaranteed income sources to analyze lifetime income security. 
                  The goal is to have guaranteed income cover 100% of core living expenses.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Monthly Expenses Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Monthly Expenses</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Core Living Expenses</Label>
              <Input
                type="number"
                value={inputs.coreLivingExpensesMonthly || ''}
                onChange={(e) => onUpdate({ ...inputs, coreLivingExpensesMonthly: parseFloat(e.target.value) || 0 })}
                placeholder="Housing, food, utilities..."
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Discretionary Expenses</Label>
              <Input
                type="number"
                value={inputs.discretionaryExpensesMonthly || ''}
                onChange={(e) => onUpdate({ ...inputs, discretionaryExpensesMonthly: parseFloat(e.target.value) || 0 })}
                placeholder="Travel, dining, hobbies..."
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Healthcare / LTC</Label>
              <Input
                type="number"
                value={inputs.healthcareLongTermCareMonthly || ''}
                onChange={(e) => onUpdate({ ...inputs, healthcareLongTermCareMonthly: parseFloat(e.target.value) || 0 })}
                placeholder="Medical, insurance..."
                className="font-mono"
              />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
            <span className="text-sm font-medium">Total Monthly Expenses</span>
            <span className="font-mono font-semibold">${totalExpenses.toLocaleString()}/mo</span>
          </div>
        </div>

        {/* Guaranteed Income Sources */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Guaranteed Income Sources</h4>
            <Button variant="outline" size="sm" onClick={addSource} className="gap-1">
              <Plus size={14} />
              Add Source
            </Button>
          </div>

          {inputs.guaranteedSources.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
              No guaranteed income sources added. Click "Add Source" to begin.
            </div>
          ) : (
            <div className="space-y-3">
              {inputs.guaranteedSources.map((source) => (
                <div key={source.id} className="p-3 rounded-lg bg-muted/30 border border-border space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Source Type</Label>
                      <Select
                        value={source.sourceType}
                        onValueChange={(v) => updateSource(source.id, 'sourceType', v)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SOURCE_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{SOURCE_TYPE_LABELS[type]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Name/Description</Label>
                      <Input
                        value={source.sourceName}
                        onChange={(e) => updateSource(source.id, 'sourceName', e.target.value)}
                        placeholder="e.g., Client SS"
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Monthly Amount</Label>
                      <Input
                        type="number"
                        value={source.monthlyAmount || ''}
                        onChange={(e) => updateSource(source.id, 'monthlyAmount', parseFloat(e.target.value) || 0)}
                        placeholder="$0"
                        className="h-8 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Start Age</Label>
                      <Input
                        type="number"
                        value={source.startAge}
                        onChange={(e) => updateSource(source.id, 'startAge', parseInt(e.target.value) || 65)}
                        className="h-8 font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`inflation-${source.id}`}
                          checked={source.inflationAdj}
                          onCheckedChange={(checked) => updateSource(source.id, 'inflationAdj', checked)}
                        />
                        <Label htmlFor={`inflation-${source.id}`} className="text-xs cursor-pointer">
                          Inflation Adjusted
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`lifetime-${source.id}`}
                          checked={source.guaranteedForLife}
                          onCheckedChange={(checked) => updateSource(source.id, 'guaranteedForLife', checked)}
                        />
                        <Label htmlFor={`lifetime-${source.id}`} className="text-xs cursor-pointer">
                          Guaranteed for Life
                        </Label>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeSource(source.id)}
                      className="h-7 w-7 text-destructive hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="text-xs text-muted-foreground">Guaranteed Lifetime Income</div>
              <div className="font-mono text-lg font-semibold text-primary">
                ${totalGuaranteedIncome.toLocaleString()}/mo
              </div>
            </div>
            <div className={`p-3 rounded-lg border ${
              coreCoverage >= 100 ? 'bg-status-good/10 border-status-good/20' :
              coreCoverage >= 80 ? 'bg-status-warning/10 border-status-warning/20' :
              'bg-status-critical/10 border-status-critical/20'
            }`}>
              <div className="text-xs text-muted-foreground">Core Expense Coverage</div>
              <div className={`font-mono text-lg font-semibold ${
                coreCoverage >= 100 ? 'text-status-good' :
                coreCoverage >= 80 ? 'text-status-warning' :
                'text-status-critical'
              }`}>
                {coreCoverage.toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
