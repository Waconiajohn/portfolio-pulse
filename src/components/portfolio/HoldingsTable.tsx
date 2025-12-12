import { useState, useMemo, useEffect, forwardRef } from 'react';
import { Holding, AccountType, AssetClass } from '@/types/portfolio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Upload, AlertCircle, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { inferAccountSubtype, type AccountBucket } from '@/domain/accounts/inferAccountSubtype';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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

type AccountSubtype = 'brokerage' | 'traditional-ira' | 'roth-ira';

interface AccountGroup {
  subtype: AccountSubtype;
  label: string;
  taxLabel: string;
  holdings: Holding[];
  totalValue: number;
}

function mapBucketToSubtype(bucket: AccountBucket): AccountSubtype {
  switch (bucket) {
    case "Brokerage": return 'brokerage';
    case "Traditional IRA": return 'traditional-ira';
    case "Roth IRA": return 'roth-ira';
    default: return 'brokerage';
  }
}

function groupHoldingsByAccountSubtype(holdings: Holding[]): AccountGroup[] {
  const groups: Record<AccountSubtype, Holding[]> = {
    'brokerage': [],
    'traditional-ira': [],
    'roth-ira': [],
  };

  holdings.forEach(h => {
    const bucket = inferAccountSubtype(h);
    const subtype = mapBucketToSubtype(bucket);
    groups[subtype].push(h);
  });

  const accountConfig: Record<AccountSubtype, { label: string; taxLabel: string }> = {
    'brokerage': { label: 'Brokerage Account', taxLabel: 'Taxable' },
    'traditional-ira': { label: 'Traditional IRA', taxLabel: 'Tax-Deferred' },
    'roth-ira': { label: 'Roth IRA', taxLabel: 'Tax-Free' },
  };

  const order: AccountSubtype[] = ['brokerage', 'traditional-ira', 'roth-ira'];

  return order
    .filter(subtype => groups[subtype].length > 0)
    .map(subtype => ({
      subtype,
      label: accountConfig[subtype].label,
      taxLabel: accountConfig[subtype].taxLabel,
      holdings: groups[subtype],
      totalValue: groups[subtype].reduce((sum, h) => sum + h.shares * h.currentPrice, 0),
    }));
}

interface AllocationBreakdown {
  stocksPct: number;
  bondsPct: number;
  cashPct: number;
  otherPct: number;
}

function computeAllocation(holdings: Holding[]): AllocationBreakdown {
  const totals = { stocks: 0, bonds: 0, cash: 0, other: 0 };
  
  holdings.forEach(h => {
    const value = h.shares * h.currentPrice;
    const assetClass = h.assetClass || 'Other';
    
    if (assetClass === 'US Stocks' || assetClass === 'Intl Stocks') {
      totals.stocks += value;
    } else if (assetClass === 'Bonds') {
      totals.bonds += value;
    } else if (assetClass === 'Cash') {
      totals.cash += value;
    } else {
      totals.other += value;
    }
  });
  
  const total = totals.stocks + totals.bonds + totals.cash + totals.other;
  
  if (total === 0) {
    return { stocksPct: 0, bondsPct: 0, cashPct: 0, otherPct: 0 };
  }
  
  return {
    stocksPct: (totals.stocks / total) * 100,
    bondsPct: (totals.bonds / total) * 100,
    cashPct: (totals.cash / total) * 100,
    otherPct: (totals.other / total) * 100,
  };
}

function AllocationBar({ allocation }: { allocation: AllocationBreakdown }) {
  const segments = [
    { key: 'stocks', label: 'Stocks', pct: allocation.stocksPct, color: 'bg-blue-500' },
    { key: 'bonds', label: 'Bonds', pct: allocation.bondsPct, color: 'bg-emerald-500' },
    { key: 'cash', label: 'Cash', pct: allocation.cashPct, color: 'bg-amber-400' },
    { key: 'other', label: 'Other', pct: allocation.otherPct, color: 'bg-purple-500' },
  ].filter(s => s.pct > 0);

  if (segments.length === 0) return null;

  return (
    <div className="w-full space-y-1">
      {/* Bar */}
      <div className="h-2 rounded-full overflow-hidden flex bg-muted">
        {segments.map((seg, idx) => (
          <div
            key={seg.key}
            className={cn(seg.color, idx === 0 && 'rounded-l-full', idx === segments.length - 1 && 'rounded-r-full')}
            style={{ width: `${seg.pct}%` }}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        {segments.map(seg => (
          <div key={seg.key} className="flex items-center gap-1">
            <div className={cn('w-2 h-2 rounded-sm', seg.color)} />
            <span>{seg.label}</span>
            <span className="font-mono">{seg.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

// Strip redundant account type prefixes/suffixes from holding names
function cleanHoldingName(name: string | undefined): string {
  if (!name) return '';
  // Remove common account type prefixes in square brackets at start
  // e.g., "[Brokerage] Vanguard..." -> "Vanguard..."
  // Also remove suffixes in parentheses at end
  return name
    .replace(/^\s*\[(?:Brokerage|Trad IRA|Roth IRA|Traditional IRA|IRA)\]\s*/i, '')
    .replace(/\s*\((?:Traditional IRA|Roth IRA|Brokerage|Taxable|Tax-Advantaged|IRA)\)\s*$/i, '')
    .trim();
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

export const HoldingsTable = forwardRef<HTMLDivElement, HoldingsTableProps>(function HoldingsTable({ holdings, onUpdate }, ref) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvState, setCsvState] = useState<CSVMappingState | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<AccountSubtype, boolean>>({
    'brokerage': true,
    'traditional-ira': true,
    'roth-ira': true,
  });

  // Detect mobile and set initial collapse state (single effect with stable listener)
  useEffect(() => {
    let initialized = false;
    
    const checkMobile = () => {
      const mobile = window.matchMedia("(max-width: 640px)").matches;
      setIsMobile(mobile);
      
      // Only set initial expanded state on first run
      if (!initialized) {
        initialized = true;
        if (mobile) {
          // Mobile: only first section (brokerage) expanded
          setExpandedSections({
            'brokerage': true,
            'traditional-ira': false,
            'roth-ira': false,
          });
        } else {
          // Desktop: all expanded
          setExpandedSections({
            'brokerage': true,
            'traditional-ira': true,
            'roth-ira': true,
          });
        }
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSection = (subtype: AccountSubtype) => {
    setExpandedSections(prev => ({
      ...prev,
      [subtype]: !prev[subtype],
    }));
  };

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
  
  const accountGroups = useMemo(() => groupHoldingsByAccountSubtype(holdings), [holdings]);

  const renderHoldingRow = (holding: Holding) => {
    const value = holding.shares * holding.currentPrice;
    const gainLoss = value - (holding.shares * holding.costBasis);
    
    return (
      <TableRow key={holding.id} className="group">
        <TableCell className="sticky left-0 z-10 bg-background">
          <Input
            value={holding.ticker}
            onChange={(e) => updateHolding(holding.id, 'ticker', e.target.value.toUpperCase())}
            placeholder="AAPL"
            className="h-8 font-mono uppercase"
          />
        </TableCell>
        <TableCell>
          <Input
            value={cleanHoldingName(holding.name)}
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
  };

  return (
    <div ref={ref} className="space-y-4">
      {/* Grand Total Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg bg-muted/50 border">
        <div>
          <div className="text-sm text-muted-foreground">Grand Total</div>
          <div className="text-xl font-bold font-mono">{formatCurrency(totalValue)}</div>
        </div>
        <div className="text-sm text-muted-foreground">
          {holdings.length} holdings across {accountGroups.length} account{accountGroups.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
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

      {/* Holdings by Account Section */}
      {holdings.length === 0 ? (
        <div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
          No holdings added. Click "Add Holding" or import a CSV file.
        </div>
      ) : (
        <div className="space-y-4">
          {accountGroups.map((group, groupIndex) => {
            const percentOfTotal = totalValue > 0 ? (group.totalValue / totalValue) * 100 : 0;
            const isExpanded = expandedSections[group.subtype];
            const allocation = computeAllocation(group.holdings);
            
            return (
              <Collapsible
                key={group.subtype}
                open={isExpanded}
                onOpenChange={() => toggleSection(group.subtype)}
              >
                {/* Account Section Header - Clickable */}
                <CollapsibleTrigger asChild>
                  <div
                    className="w-full p-3 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors cursor-pointer space-y-2"
                  >
                    {/* Top row: account info */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ChevronDown
                          size={18}
                          className={cn(
                            "text-muted-foreground transition-transform duration-200 shrink-0",
                            isExpanded ? "rotate-0" : "-rotate-90"
                          )}
                        />
                        <h3 className="font-semibold text-foreground">{group.label}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {group.taxLabel}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ({group.holdings.length} holding{group.holdings.length !== 1 ? 's' : ''})
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm pl-6 sm:pl-0">
                        <span className="font-mono font-medium">{formatCurrency(group.totalValue)}</span>
                        <span className="text-muted-foreground">
                          {percentOfTotal.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    {/* Allocation bar */}
                    <div className="pl-6">
                      <AllocationBar allocation={allocation} />
                    </div>
                  </div>
                </CollapsibleTrigger>

                {/* Account Holdings Table */}
                <CollapsibleContent className="pt-2">
                  <div className="overflow-x-auto">
                    <div className="rounded-lg border border-border overflow-hidden" style={{ minWidth: '900px' }}>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="sticky left-0 z-10 bg-muted/50" style={{ width: '100px', minWidth: '100px' }}>Ticker</TableHead>
                            <TableHead style={{ width: '200px', minWidth: '200px' }}>Name</TableHead>
                            <TableHead style={{ width: '100px', minWidth: '100px' }} className="text-right">Shares</TableHead>
                            <TableHead style={{ width: '100px', minWidth: '100px' }} className="text-right">Price</TableHead>
                            <TableHead style={{ width: '100px', minWidth: '100px' }} className="text-right">Cost</TableHead>
                            <TableHead style={{ width: '130px', minWidth: '130px' }}>Class</TableHead>
                            <TableHead style={{ width: '120px', minWidth: '120px' }} className="text-right">Value</TableHead>
                            <TableHead style={{ width: '50px', minWidth: '50px' }}></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.holdings.map(renderHoldingRow)}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CollapsibleContent>

                {/* Divider between sections (except last) */}
                {groupIndex < accountGroups.length - 1 && (
                  <div className="pt-2" />
                )}
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
});
