import { useState } from 'react';
import { Holding, AccountType, AssetClass } from '@/types/portfolio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HoldingsTableProps {
  holdings: Holding[];
  onUpdate: (holdings: Holding[]) => void;
}

const ASSET_CLASSES: AssetClass[] = ['US Stocks', 'Intl Stocks', 'Bonds', 'Commodities', 'Cash', 'Other'];
const ACCOUNT_TYPES: AccountType[] = ['Taxable', 'Tax-Advantaged'];

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

export function HoldingsTable({ holdings, onUpdate }: HoldingsTableProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addHolding = () => {
    onUpdate([...holdings, createEmptyHolding()]);
  };

  const removeHolding = (id: string) => {
    onUpdate(holdings.filter(h => h.id !== id));
  };

  const updateHolding = (id: string, field: keyof Holding, value: string | number) => {
    const newErrors = { ...errors };
    
    // Validation
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

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').slice(1); // Skip header
      const newHoldings: Holding[] = lines
        .filter(line => line.trim())
        .map(line => {
          const [ticker, name, shares, price, cost, account, assetClass] = line.split(',').map(s => s.trim());
          return {
            id: crypto.randomUUID(),
            ticker: ticker || '',
            name: name || '',
            shares: parseFloat(shares) || 0,
            currentPrice: parseFloat(price) || 0,
            costBasis: parseFloat(cost) || 0,
            accountType: (account as AccountType) || 'Taxable',
            assetClass: (assetClass as AssetClass) || 'US Stocks',
          };
        });
      onUpdate([...holdings, ...newHoldings]);
    };
    reader.readAsText(file);
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
              onChange={handleCSVUpload}
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
