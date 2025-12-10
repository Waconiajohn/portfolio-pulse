import { useState } from 'react';
import { PortfolioAssumptions, DEFAULT_ASSUMPTIONS, AssetAssumptions } from '@/lib/assumptions';
import { AssetClass, RiskTolerance } from '@/types/portfolio';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface SettingsPanelProps {
  assumptions: PortfolioAssumptions;
  onUpdate: (assumptions: PortfolioAssumptions) => void;
}

const ASSET_CLASSES: AssetClass[] = ['US Stocks', 'Intl Stocks', 'Bonds', 'Commodities', 'Cash', 'Other'];
const RISK_LEVELS: RiskTolerance[] = ['Conservative', 'Moderate', 'Aggressive'];

export function SettingsPanel({ assumptions, onUpdate }: SettingsPanelProps) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<PortfolioAssumptions>(assumptions);

  const updateAssetClass = (asset: AssetClass, field: keyof AssetAssumptions, value: number) => {
    setLocal({
      ...local,
      assetClasses: {
        ...local.assetClasses,
        [asset]: {
          ...local.assetClasses[asset],
          [field]: value,
        },
      },
    });
  };

  const updateTargetVolatility = (risk: RiskTolerance, value: number) => {
    setLocal({
      ...local,
      targetVolatility: {
        ...local.targetVolatility,
        [risk]: value,
      },
    });
  };

  const handleSave = () => {
    onUpdate(local);
    setOpen(false);
    toast.success('Assumptions saved');
  };

  const handleReset = () => {
    setLocal(DEFAULT_ASSUMPTIONS);
    toast.info('Reset to defaults');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings size={16} />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings size={20} />
            Analysis Assumptions
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="returns" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="returns">Returns & Volatility</TabsTrigger>
            <TabsTrigger value="fees">Default Fees</TabsTrigger>
            <TabsTrigger value="risk">Risk Targets</TabsTrigger>
          </TabsList>

          <TabsContent value="returns" className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-4 text-xs font-medium text-muted-foreground uppercase tracking-wider pb-2 border-b">
              <div>Asset Class</div>
              <div>Expected Return (%)</div>
              <div>Volatility (%)</div>
            </div>
            {ASSET_CLASSES.map(asset => (
              <div key={asset} className="grid grid-cols-3 gap-4 items-center">
                <Label className="font-medium">{asset}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={(local.assetClasses[asset].expectedReturn * 100).toFixed(1)}
                  onChange={(e) => updateAssetClass(asset, 'expectedReturn', parseFloat(e.target.value) / 100 || 0)}
                  className="h-8 font-mono"
                />
                <Input
                  type="number"
                  step="0.1"
                  value={(local.assetClasses[asset].volatility * 100).toFixed(1)}
                  onChange={(e) => updateAssetClass(asset, 'volatility', parseFloat(e.target.value) / 100 || 0)}
                  className="h-8 font-mono"
                />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="fees" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4 text-xs font-medium text-muted-foreground uppercase tracking-wider pb-2 border-b">
              <div>Asset Class</div>
              <div>Default Expense Ratio (%)</div>
            </div>
            {ASSET_CLASSES.map(asset => (
              <div key={asset} className="grid grid-cols-2 gap-4 items-center">
                <Label className="font-medium">{asset}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={(local.assetClasses[asset].defaultExpenseRatio * 100).toFixed(2)}
                  onChange={(e) => updateAssetClass(asset, 'defaultExpenseRatio', parseFloat(e.target.value) / 100 || 0)}
                  className="h-8 font-mono"
                />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="risk" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs font-medium text-muted-foreground uppercase tracking-wider pb-2 border-b">
                <div>Risk Profile</div>
                <div>Target Volatility (%)</div>
              </div>
              {RISK_LEVELS.map(risk => (
                <div key={risk} className="grid grid-cols-2 gap-4 items-center">
                  <Label className="font-medium">{risk}</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={(local.targetVolatility[risk] * 100).toFixed(1)}
                    onChange={(e) => updateTargetVolatility(risk, parseFloat(e.target.value) / 100 || 0)}
                    className="h-8 font-mono"
                  />
                </div>
              ))}
            </div>

            <div className="pt-4 border-t space-y-4">
              <div className="grid grid-cols-2 gap-4 items-center">
                <Label className="font-medium">Risk-Free Rate (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={(local.riskFreeRate * 100).toFixed(1)}
                  onChange={(e) => setLocal({ ...local, riskFreeRate: parseFloat(e.target.value) / 100 || 0 })}
                  className="h-8 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 items-center">
                <Label className="font-medium">Inflation Rate (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={(local.inflationRate * 100).toFixed(1)}
                  onChange={(e) => setLocal({ ...local, inflationRate: parseFloat(e.target.value) / 100 || 0 })}
                  className="h-8 font-mono"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4 border-t mt-4">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw size={14} />
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
