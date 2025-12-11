import { useState } from 'react';
import { Holding, AccountType, AssetClass } from '@/types/portfolio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Upload, AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface HoldingsTableProps {
  holdings: Holding[];
  onUpdate: (holdings: Holding[]) => void;
}

const ASSET_CLASSES: AssetClass[] = ['US Stocks', 'Intl Stocks', 'Bonds', 'Commodities', 'Cash', 'Other'];
const ACCOUNT_TYPES: AccountType[] = ['Taxable', 'Tax-Advantaged'];

const CSV_FIELDS = [
  { key: 'ticker', label: 'Ticker', required: true },
  { key: 'name', label: 'Name', required: false },
  { key: 'shares', label: 'Shares', required: true },
  { key: 'currentPrice', label: 'Current Price', required: true },
  { key: 'costBasis', label: 'Cost Basis', required: false },
  { key: 'accountType', label: 'Account Type', required: false },
  { key: 'assetClass', label: 'Asset Class', required: false },
  { key: 'expenseRatio', label: 'Expense Ratio', required: false },
] as const;

type CSVFieldKey = typeof CSV_FIELDS[number]['key'];

interface CSVMappingState {
  headers: string[];
  rows: string[][];
  mapping: Record<CSVFieldKey, number | null>;
}

function createEmptyHolding(): Holding {
  return {
    id: crypto.randomUUID(),
    ticker: '',
    name: '',
    shares: 0,
    currentPrice: 0,
    costBasis: 0,
    accountType: 'Taxable',
    assetClass: 'US Stocks',
  };
}

function autoDetectColumn(header: string, field: CSVFieldKey): boolean {
  const h = header.toLowerCase().trim();
  const patterns: Record<CSVFieldKey, string[]> = {
    ticker: ['ticker', 'symbol', 'stock'],
    name: ['name', 'description', 'holding', 'security'],
    shares: ['shares', 'quantity', 'qty', 'units'],
    currentPrice: ['price', 'current', 'market', 'value'],
    costBasis: ['cost', 'basis', 'purchase'],
    accountType: ['account', 'type', 'acct'],
    assetClass: ['asset', 'class', 'category'],
    expenseRatio: ['expense', 'ratio', 'fee', 'er'],
  };
  return patterns[field]?.some(p => h.includes(p)) || false;
}

function parseCSVValue(value: string, field: CSVFieldKey): string | number | undefined {
  const trimmed = value?.trim() || '';
  
  switch (field) {
    case 'shares':
    case 'currentPrice':
    case 'costBasis': {
      const num = parseFloat(trimmed.replace(/[$,]/g, ''));
      return isNaN(num) || num < 0 ? undefined : num;
    }
    case 'expenseRatio': {
      let num = parseFloat(trimmed.replace(/[%,]/g, ''));
      if (num > 1) num = num / 100; // Convert from percentage
      return isNaN(num) || num < 0 ? undefined : num;
    }
    case 'accountType':
      if (trimmed.toLowerCase().includes('tax') && trimmed.toLowerCase().includes('adv')) {
        return 'Tax-Advantaged';
      }
      return 'Taxable';
    case 'assetClass':
      if (trimmed.toLowerCase().includes('int')) return 'Intl Stocks';
      if (trimmed.toLowerCase().includes('bond')) return 'Bonds';
      if (trimmed.toLowerCase().includes('comm')) return 'Commodities';
      if (trimmed.toLowerCase().includes('cash')) return 'Cash';
      if (trimmed.toLowerCase().includes('stock') || trimmed.toLowerCase().includes('equity')) return 'US Stocks';
      return 'Other';
    default:
      return trimmed;
  }
}

export function HoldingsTable({ holdings, onUpdate }: HoldingsTableProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvState, setCsvState] = useState<CSVMappingState | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const addHolding = () => {
    onUpdate([...holdings, createEmptyHolding()]);
  };

  const removeHolding = (id: string) => {
    onUpdate(holdings.filter(h => h.id !== id));
  };

  const updateHolding = (id: string, field: keyof Holding, value: string | number) => {
    const newErrors = { ...errors };
    
    if (field === 'shares' || field === 'currentPrice' || field === 'costBasis') {
      const numValue = Number(value);
      if (numValue < 0) {
        newErrors[`${id}-${field}`] = 'Cannot be negative';
        setErrors(newErrors);
        return;
      }
      delete newErrors[`${id}-${field}`];
    }
    
    setErrors(newErrors);
    onUpdate(holdings.map(h => h.id === id ? { ...h, [field]: value } : h));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').map(line => 
        line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
      ).filter(line => line.some(cell => cell));
      
      if (lines.length < 2) {
        toast.error('CSV must have header row and at least one data row');
        return;
      }

      const headers = lines[0];
      const rows = lines.slice(1);

      // Auto-detect column mappings
      const mapping: Record<CSVFieldKey, number | null> = {} as Record<CSVFieldKey, number | null>;
      CSV_FIELDS.forEach(field => {
        const index = headers.findIndex(h => autoDetectColumn(h, field.key));
        mapping[field.key] = index >= 0 ? index : null;
      });

      setCsvState({ headers, rows, mapping });
      setCsvDialogOpen(true);
      setValidationErrors([]);
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const updateMapping = (field: CSVFieldKey, columnIndex: number | null) => {
    if (!csvState) return;
    setCsvState({
      ...csvState,
      mapping: { ...csvState.mapping, [field]: columnIndex },
    });
  };

  const validateAndImport = () => {
    if (!csvState) return;

    const errors: string[] = [];
    const { mapping, rows } = csvState;

    // Check required fields are mapped
    CSV_FIELDS.filter(f => f.required).forEach(field => {
      if (mapping[field.key] === null || mapping[field.key] === undefined) {
        errors.push(`Required field "${field.label}" is not mapped`);
      }
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Parse rows
    const newHoldings: Holding[] = [];
    const rowErrors: string[] = [];

    rows.forEach((row, rowIndex) => {
      const getValue = (field: CSVFieldKey) => {
        const colIndex = mapping[field];
        return colIndex !== null && colIndex !== undefined ? row[colIndex] : '';
      };

      const ticker = parseCSVValue(getValue('ticker'), 'ticker') as string;
      const shares = parseCSVValue(getValue('shares'), 'shares') as number | undefined;
      const currentPrice = parseCSVValue(getValue('currentPrice'), 'currentPrice') as number | undefined;

      // Validate required fields
      if (!ticker) {
        rowErrors.push(`Row ${rowIndex + 2}: Missing ticker`);
        return;
      }
      if (shares === undefined) {
        rowErrors.push(`Row ${rowIndex + 2}: Invalid shares value`);
        return;
      }
      if (currentPrice === undefined) {
        rowErrors.push(`Row ${rowIndex + 2}: Invalid price value`);
        return;
      }

      const holding: Holding = {
        id: crypto.randomUUID(),
        ticker: ticker.toUpperCase(),
        name: (parseCSVValue(getValue('name'), 'name') as string) || ticker,
        shares,
        currentPrice,
        costBasis: (parseCSVValue(getValue('costBasis'), 'costBasis') as number) ?? currentPrice,
        accountType: (parseCSVValue(getValue('accountType'), 'accountType') as AccountType) || 'Taxable',
        assetClass: (parseCSVValue(getValue('assetClass'), 'assetClass') as AssetClass) || 'US Stocks',
        expenseRatio: parseCSVValue(getValue('expenseRatio'), 'expenseRatio') as number | undefined,
      };

      newHoldings.push(holding);
    });

    if (rowErrors.length > 0) {
      setValidationErrors(rowErrors.slice(0, 5)); // Show first 5 errors
      if (rowErrors.length > 5) {
        setValidationErrors([...rowErrors.slice(0, 5), `... and ${rowErrors.length - 5} more errors`]);
      }
      return;
    }

    // Success - add holdings and close dialog
    onUpdate([...holdings, ...newHoldings]);
    setCsvDialogOpen(false);
    setCsvState(null);
    toast.success(`Imported ${newHoldings.length} holdings`);
  };

  const totalValue = holdings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {holdings.length} holdings · Total: <span className="font-mono font-medium text-foreground">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload size={14} className="mr-1.5" />
                Import CSV
              </span>
            </Button>
          </label>
          <Button size="sm" onClick={addHolding}>
            <Plus size={14} className="mr-1.5" />
            Add Holding
          </Button>
        </div>
      </div>

      {/* CSV Mapping Dialog */}
      <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Map CSV Columns</DialogTitle>
            <DialogDescription>
              Match your CSV columns to the required fields. Required fields are marked with *.
            </DialogDescription>
          </DialogHeader>

          {csvState && (
            <div className="space-y-4">
              {/* Column Mapping */}
              <div className="grid grid-cols-2 gap-3">
                {CSV_FIELDS.map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-sm">
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <Select
                      value={csvState.mapping[field.key]?.toString() ?? 'none'}
                      onValueChange={(v) => updateMapping(field.key, v === 'none' ? null : parseInt(v))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Not mapped --</SelectItem>
                        {csvState.headers.map((header, idx) => (
                          <SelectItem key={idx} value={idx.toString()}>
                            {header || `Column ${idx + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Preview (first 3 rows)</Label>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        {CSV_FIELDS.filter(f => csvState.mapping[f.key] !== null).slice(0, 5).map(field => (
                          <TableHead key={field.key} className="text-xs">{field.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvState.rows.slice(0, 3).map((row, rowIdx) => (
                        <TableRow key={rowIdx}>
                          {CSV_FIELDS.filter(f => csvState.mapping[f.key] !== null).slice(0, 5).map(field => {
                            const colIdx = csvState.mapping[field.key];
                            return (
                              <TableCell key={field.key} className="text-xs font-mono">
                                {colIdx !== null ? row[colIdx] || '-' : '-'}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground">
                  {csvState.rows.length} total rows to import
                </p>
              </div>

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 space-y-1">
                  <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                    <AlertCircle size={14} />
                    Validation Errors
                  </div>
                  <ul className="text-xs text-destructive space-y-0.5">
                    {validationErrors.map((err, idx) => (
                      <li key={idx}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCsvDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={validateAndImport}>
              <Check size={14} className="mr-1.5" />
              Import Holdings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-24">Ticker</TableHead>
              <TableHead className="w-32">Name</TableHead>
              <TableHead className="w-24 text-right">Shares</TableHead>
              <TableHead className="w-28 text-right">Price</TableHead>
              <TableHead className="w-28 text-right">Cost Basis</TableHead>
              <TableHead className="w-32">Account</TableHead>
              <TableHead className="w-32">Asset Class</TableHead>
              <TableHead className="w-28 text-right">Value</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No holdings added. Click "Add Holding" or import a CSV file.
                </TableCell>
              </TableRow>
            ) : (
              holdings.map((holding) => {
                const value = holding.shares * holding.currentPrice;
                const gainLoss = value - (holding.shares * holding.costBasis);
                
                return (
                  <TableRow key={holding.id} className="group">
                    <TableCell>
                      <Input
                        value={holding.ticker}
                        onChange={(e) => updateHolding(holding.id, 'ticker', e.target.value.toUpperCase())}
                        placeholder="AAPL"
                        className="h-8 font-mono uppercase"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={holding.name}
                        onChange={(e) => updateHolding(holding.id, 'name', e.target.value)}
                        placeholder="Apple Inc."
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={holding.shares || ''}
                        onChange={(e) => updateHolding(holding.id, 'shares', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className={cn('h-8 font-mono text-right', errors[`${holding.id}-shares`] && 'border-destructive')}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={holding.currentPrice || ''}
                        onChange={(e) => updateHolding(holding.id, 'currentPrice', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className={cn('h-8 font-mono text-right', errors[`${holding.id}-currentPrice`] && 'border-destructive')}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={holding.costBasis || ''}
                        onChange={(e) => updateHolding(holding.id, 'costBasis', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className={cn('h-8 font-mono text-right', errors[`${holding.id}-costBasis`] && 'border-destructive')}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={holding.accountType}
                        onValueChange={(v) => updateHolding(holding.id, 'accountType', v as AccountType)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACCOUNT_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={holding.assetClass}
                        onValueChange={(v) => updateHolding(holding.id, 'assetClass', v as AssetClass)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSET_CLASSES.map(ac => (
                            <SelectItem key={ac} value={ac}>{ac}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-mono font-medium">
                        ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                      <div className={cn(
                        'text-xs font-mono',
                        gainLoss >= 0 ? 'value-positive' : 'value-negative'
                      )}>
                        {gainLoss >= 0 ? '+' : ''}{((gainLoss / (holding.shares * holding.costBasis || 1)) * 100).toFixed(1)}%
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        onClick={() => removeHolding(holding.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
