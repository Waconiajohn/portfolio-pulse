import { ClientInfo, PortfolioAnalysis, RiskTolerance, Holding } from '@/types/portfolio';
import { PortfolioAssumptions } from '@/lib/assumptions';
import { HealthScore } from './HealthScore';
import { MetricCard } from './MetricCard';
import { SettingsPanel } from './SettingsPanel';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FileDown, ChevronDown, Database } from 'lucide-react';
import { generatePDF } from '@/lib/pdf-export';
import { toast } from 'sonner';

interface HeaderProps {
  clientInfo: ClientInfo;
  analysis: PortfolioAnalysis;
  holdings: Holding[];
  notes: string;
  assumptions: PortfolioAssumptions;
  onClientInfoChange: (info: ClientInfo) => void;
  onAssumptionsChange: (assumptions: PortfolioAssumptions) => void;
  onLoadSample: () => void;
}

const RISK_OPTIONS: RiskTolerance[] = ['Conservative', 'Moderate', 'Aggressive'];

export function Header({ 
  clientInfo, 
  analysis, 
  holdings,
  notes,
  assumptions,
  onClientInfoChange, 
  onAssumptionsChange,
  onLoadSample
}: HeaderProps) {
  
  const handleExport = async (type: 'full' | 'summary' | 'recommendations') => {
    try {
      await generatePDF(analysis, holdings, clientInfo, notes, type);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} report exported`);
    } catch (error) {
      toast.error('Failed to export PDF');
      console.error(error);
    }
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4">
        {/* Top row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Portfolio Diagnostic</h1>
              <p className="text-xs text-muted-foreground">Professional Advisory Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onLoadSample} className="gap-2">
              <Database size={14} />
              Load Sample
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <FileDown size={14} />
                  Export PDF
                  <ChevronDown size={12} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem onClick={() => handleExport('full')}>
                  Full Report (2-3 pages)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('summary')}>
                  Executive Summary (1 page)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('recommendations')}>
                  Recommendations Only
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <SettingsPanel assumptions={assumptions} onUpdate={onAssumptionsChange} />
          </div>
        </div>

        {/* Client info row */}
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div className="flex-1 min-w-[200px] max-w-xs">
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
              Client Name
            </label>
            <Input
              value={clientInfo.name}
              onChange={(e) => onClientInfoChange({ ...clientInfo, name: e.target.value })}
              placeholder="Enter client name"
              className="h-9"
            />
          </div>
          <div className="w-40">
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
              Meeting Date
            </label>
            <Input
              type="date"
              value={clientInfo.meetingDate}
              onChange={(e) => onClientInfoChange({ ...clientInfo, meetingDate: e.target.value })}
              className="h-9"
            />
          </div>
          <div className="w-40">
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
              Risk Tolerance
            </label>
            <Select
              value={clientInfo.riskTolerance}
              onValueChange={(v) => onClientInfoChange({ ...clientInfo, riskTolerance: v as RiskTolerance })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RISK_OPTIONS.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Metrics row */}
        <div className="flex items-center gap-6 pt-2 border-t border-border/50">
          <div className="flex items-center gap-4">
            <HealthScore score={analysis.healthScore} size="sm" />
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Health Score</div>
              <div className="text-sm font-medium">
                {analysis.healthScore >= 70 ? 'Healthy' : analysis.healthScore >= 40 ? 'Needs Attention' : 'Critical Issues'}
              </div>
            </div>
          </div>
          
          <div className="h-10 w-px bg-border" />

          <MetricCard
            label="Portfolio Value"
            value={`$${analysis.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            tooltip="Total market value of all holdings"
          />
          
          <MetricCard
            label="Expected Return"
            value={`${(analysis.expectedReturn * 100).toFixed(1)}%`}
            tooltip="Weighted average expected annual return"
            trend={analysis.expectedReturn > 0.06 ? 'up' : 'neutral'}
          />
          
          <MetricCard
            label="Volatility"
            value={`${(analysis.volatility * 100).toFixed(1)}%`}
            tooltip="Expected annual standard deviation"
          />
          
          <MetricCard
            label="Sharpe Ratio"
            value={analysis.sharpeRatio.toFixed(2)}
            tooltip="Risk-adjusted return metric. Higher is better. Benchmark is 0.50."
            trend={analysis.sharpeRatio > 0.5 ? 'up' : analysis.sharpeRatio < 0.3 ? 'down' : 'neutral'}
          />
          
          <MetricCard
            label="Total Fees"
            value={`$${analysis.totalFees.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            subValue={`${((analysis.totalFees / (analysis.totalValue || 1)) * 100).toFixed(2)}%/yr`}
            tooltip="Annual expense ratio fees"
          />
        </div>
      </div>
    </header>
  );
}
