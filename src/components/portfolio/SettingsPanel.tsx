import { useState } from 'react';
import { PortfolioAssumptions, DEFAULT_ASSUMPTIONS, AssetAssumptions } from '@/lib/assumptions';
import { 
  ScoringConfig, 
  DEFAULT_SCORING_CONFIG, 
  AdviceModel, 
  ADVICE_MODEL_LABELS,
  saveScoringConfig 
} from '@/lib/scoring-config';
import { AssetClass, RiskTolerance } from '@/types/portfolio';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, RotateCcw, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SettingsPanelProps {
  assumptions: PortfolioAssumptions;
  onUpdate: (assumptions: PortfolioAssumptions) => void;
  scoringConfig: ScoringConfig;
  onScoringConfigUpdate: (config: ScoringConfig) => void;
  adviceModel: AdviceModel;
  onAdviceModelChange: (model: AdviceModel) => void;
  advisorFee: number;
  onAdvisorFeeChange: (fee: number) => void;
}

const ASSET_CLASSES: AssetClass[] = ['US Stocks', 'Intl Stocks', 'Bonds', 'Commodities', 'Cash', 'Other'];
const RISK_LEVELS: RiskTolerance[] = ['Conservative', 'Moderate', 'Aggressive'];
const ADVICE_MODELS: AdviceModel[] = ['self-directed', 'advisor-passive', 'advisor-tactical'];

function FieldWithTooltip({ label, tooltip, children }: { label: string; tooltip: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Label className="font-medium flex items-center gap-1.5">
        {label}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info size={12} className="text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Label>
      {children}
    </div>
  );
}

export function SettingsPanel({ 
  assumptions, 
  onUpdate, 
  scoringConfig, 
  onScoringConfigUpdate,
  adviceModel,
  onAdviceModelChange,
  advisorFee,
  onAdvisorFeeChange
}: SettingsPanelProps) {
  const [open, setOpen] = useState(false);
  const [localAssumptions, setLocalAssumptions] = useState<PortfolioAssumptions>(assumptions);
  const [localConfig, setLocalConfig] = useState<ScoringConfig>(scoringConfig);
  const [localAdviceModel, setLocalAdviceModel] = useState<AdviceModel>(adviceModel);
  const [localAdvisorFee, setLocalAdvisorFee] = useState(advisorFee);

  const updateAssetClass = (asset: AssetClass, field: keyof AssetAssumptions, value: number) => {
    setLocalAssumptions({
      ...localAssumptions,
      assetClasses: {
        ...localAssumptions.assetClasses,
        [asset]: {
          ...localAssumptions.assetClasses[asset],
          [field]: value,
        },
      },
    });
  };

  const updateTargetVolatility = (risk: RiskTolerance, value: number) => {
    setLocalAssumptions({
      ...localAssumptions,
      targetVolatility: {
        ...localAssumptions.targetVolatility,
        [risk]: value,
      },
    });
  };

  const updateScoringConfig = (path: string[], value: number | string) => {
    const newConfig = { ...localConfig };
    let current: any = newConfig;
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = { ...current[path[i]] };
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    setLocalConfig(newConfig);
  };

  const handleSave = () => {
    onUpdate(localAssumptions);
    onScoringConfigUpdate(localConfig);
    saveScoringConfig(localConfig);
    onAdviceModelChange(localAdviceModel);
    onAdvisorFeeChange(localAdvisorFee);
    setOpen(false);
    toast.success('Settings saved');
  };

  const handleReset = () => {
    setLocalAssumptions(DEFAULT_ASSUMPTIONS);
    setLocalConfig(DEFAULT_SCORING_CONFIG);
    setLocalAdviceModel('self-directed');
    setLocalAdvisorFee(0);
    toast.info('Reset to defaults');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings size={16} />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings size={20} />
            Benchmarks & Assumptions
          </DialogTitle>
        </DialogHeader>

        {/* Explanatory Note */}
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-primary mt-0.5 shrink-0" />
            <div>
              <span className="font-medium">Note:</span> Some benchmarks are <span className="text-primary font-medium">🔗 risk-linked</span> (e.g., target volatility varies by Conservative/Moderate/Aggressive profile). 
              Others are <span className="font-medium">📌 absolute</span> (e.g., single position concentration {'>'}10% is always flagged regardless of risk profile).
            </div>
          </div>
        </div>

        <Tabs defaultValue="advice" className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="advice">Advice Model</TabsTrigger>
            <TabsTrigger value="risk">Risk & Concentration</TabsTrigger>
            <TabsTrigger value="sharpe">Sharpe & Performance</TabsTrigger>
            <TabsTrigger value="fees">Fee Thresholds</TabsTrigger>
            <TabsTrigger value="returns">Returns</TabsTrigger>
          </TabsList>

          {/* Advice Model Tab */}
          <TabsContent value="advice" className="space-y-6 mt-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <h4 className="font-medium text-sm">Advice Model & Fees</h4>
              <p className="text-xs text-muted-foreground">
                Select your advice model to adjust fee benchmarks accordingly. Self-directed investors should have lower fees than those using full advisory services.
              </p>
              
              <div className="grid grid-cols-2 gap-4 items-center">
                <Label className="font-medium">Advice Model</Label>
                <Select value={localAdviceModel} onValueChange={(v) => setLocalAdviceModel(v as AdviceModel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADVICE_MODELS.map(model => (
                      <SelectItem key={model} value={model}>
                        {ADVICE_MODEL_LABELS[model]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {localAdviceModel !== 'self-directed' && (
                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label className="font-medium">Advisor Fee (%/yr)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={(localAdvisorFee * 100).toFixed(2)}
                    onChange={(e) => setLocalAdvisorFee(parseFloat(e.target.value) / 100 || 0)}
                    className="h-8 font-mono"
                  />
                </div>
              )}
            </div>

            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <h4 className="font-medium text-sm">Goal Probability Bands</h4>
              <p className="text-xs text-muted-foreground">
                Set thresholds for interpreting Monte Carlo success probability.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label className="font-medium">Good (Green) Min %</Label>
                  <Input
                    type="number"
                    value={localConfig.goalProbability.greenMin}
                    onChange={(e) => updateScoringConfig(['goalProbability', 'greenMin'], parseFloat(e.target.value) || 0)}
                    className="h-8 font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label className="font-medium">Warning (Yellow) Min %</Label>
                  <Input
                    type="number"
                    value={localConfig.goalProbability.yellowMin}
                    onChange={(e) => updateScoringConfig(['goalProbability', 'yellowMin'], parseFloat(e.target.value) || 0)}
                    className="h-8 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <h4 className="font-medium text-sm">Planning Gaps</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label className="font-medium">Green Min Complete</Label>
                  <Input
                    type="number"
                    value={localConfig.planningGaps.greenMinComplete}
                    onChange={(e) => updateScoringConfig(['planningGaps', 'greenMinComplete'], parseInt(e.target.value) || 0)}
                    className="h-8 font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label className="font-medium">Yellow Min Complete</Label>
                  <Input
                    type="number"
                    value={localConfig.planningGaps.yellowMinComplete}
                    onChange={(e) => updateScoringConfig(['planningGaps', 'yellowMinComplete'], parseInt(e.target.value) || 0)}
                    className="h-8 font-mono"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Risk & Concentration Tab */}
          <TabsContent value="risk" className="space-y-6 mt-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <h4 className="font-medium text-sm">Concentration Limits</h4>
              <p className="text-xs text-muted-foreground">
                Maximum percentage any single position, sector, or country should represent.
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label className="font-medium">Max Single Position %</Label>
                  <Input
                    type="number"
                    step="1"
                    value={(localConfig.riskManagement.maxSinglePositionPct * 100).toFixed(0)}
                    onChange={(e) => updateScoringConfig(['riskManagement', 'maxSinglePositionPct'], parseFloat(e.target.value) / 100 || 0)}
                    className="h-8 font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label className="font-medium">Max Sector %</Label>
                  <Input
                    type="number"
                    step="1"
                    value={(localConfig.riskManagement.maxSectorPct * 100).toFixed(0)}
                    onChange={(e) => updateScoringConfig(['riskManagement', 'maxSectorPct'], parseFloat(e.target.value) / 100 || 0)}
                    className="h-8 font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label className="font-medium">Max Country %</Label>
                  <Input
                    type="number"
                    step="1"
                    value={(localConfig.riskManagement.maxCountryPct * 100).toFixed(0)}
                    onChange={(e) => updateScoringConfig(['riskManagement', 'maxCountryPct'], parseFloat(e.target.value) / 100 || 0)}
                    className="h-8 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <h4 className="font-medium text-sm">Risk Gap Thresholds</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label className="font-medium">Severe Risk Gap %</Label>
                  <Input
                    type="number"
                    step="1"
                    value={(localConfig.riskManagement.riskGapSevereThreshold * 100).toFixed(0)}
                    onChange={(e) => updateScoringConfig(['riskManagement', 'riskGapSevereThreshold'], parseFloat(e.target.value) / 100 || 0)}
                    className="h-8 font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label className="font-medium">Warning Risk Gap %</Label>
                  <Input
                    type="number"
                    step="1"
                    value={(localConfig.riskManagement.riskGapWarningThreshold * 100).toFixed(0)}
                    onChange={(e) => updateScoringConfig(['riskManagement', 'riskGapWarningThreshold'], parseFloat(e.target.value) / 100 || 0)}
                    className="h-8 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <h4 className="font-medium text-sm">Diversification Thresholds</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label className="font-medium">Small Portfolio Threshold ($)</Label>
                  <Input
                    type="number"
                    step="10000"
                    value={localConfig.diversification.smallPortfolioThreshold}
                    onChange={(e) => updateScoringConfig(['diversification', 'smallPortfolioThreshold'], parseFloat(e.target.value) || 0)}
                    className="h-8 font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label className="font-medium">Top 10 Max Concentration %</Label>
                  <Input
                    type="number"
                    step="5"
                    value={(localConfig.diversification.top10ConcentrationMax * 100).toFixed(0)}
                    onChange={(e) => updateScoringConfig(['diversification', 'top10ConcentrationMax'], parseFloat(e.target.value) / 100 || 0)}
                    className="h-8 font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label className="font-medium">Top 3 Max Concentration %</Label>
                  <Input
                    type="number"
                    step="5"
                    value={(localConfig.diversification.top3ConcentrationMax * 100).toFixed(0)}
                    onChange={(e) => updateScoringConfig(['diversification', 'top3ConcentrationMax'], parseFloat(e.target.value) / 100 || 0)}
                    className="h-8 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <h4 className="font-medium text-sm">Target Volatility by Risk Profile</h4>
              <div className="space-y-3">
                {RISK_LEVELS.map(risk => (
                  <div key={risk} className="grid grid-cols-2 gap-4 items-center">
                    <Label className="font-medium">{risk}</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={(localAssumptions.targetVolatility[risk] * 100).toFixed(1)}
                      onChange={(e) => updateTargetVolatility(risk, parseFloat(e.target.value) / 100 || 0)}
                      className="h-8 font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Sharpe & Performance Tab */}
          <TabsContent value="sharpe" className="space-y-6 mt-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <h4 className="font-medium text-sm">Sharpe Ratio Targets</h4>
              <p className="text-xs text-muted-foreground">
                The Sharpe ratio measures risk-adjusted returns. Higher is better. Historical S&P 500 average is ~0.5.
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label className="font-medium">Portfolio Target</Label>
                  <Input
                    type="number"
                    step="0.05"
                    value={localConfig.sharpe.portfolioTarget.toFixed(2)}
                    onChange={(e) => updateScoringConfig(['sharpe', 'portfolioTarget'], parseFloat(e.target.value) || 0)}
                    className="h-8 font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label className="font-medium">Holding "Good" Threshold</Label>
                  <Input
                    type="number"
                    step="0.05"
                    value={localConfig.sharpe.holdingGoodThreshold.toFixed(2)}
                    onChange={(e) => updateScoringConfig(['sharpe', 'holdingGoodThreshold'], parseFloat(e.target.value) || 0)}
                    className="h-8 font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label className="font-medium">Neutral Offset (below Good)</Label>
                  <Input
                    type="number"
                    step="0.05"
                    value={localConfig.sharpe.holdingNeutralOffset.toFixed(2)}
                    onChange={(e) => updateScoringConfig(['sharpe', 'holdingNeutralOffset'], parseFloat(e.target.value) || 0)}
                    className="h-8 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <h4 className="font-medium text-sm">Crisis Resilience</h4>
              <p className="text-xs text-muted-foreground">
                Thresholds for comparing portfolio crisis performance vs S&P 500.
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label className="font-medium">Better Than S&P Threshold %</Label>
                  <Input
                    type="number"
                    step="1"
                    value={(localConfig.crisisResilience.betterThanSpThreshold * 100).toFixed(0)}
                    onChange={(e) => updateScoringConfig(['crisisResilience', 'betterThanSpThreshold'], parseFloat(e.target.value) / 100 || 0)}
                    className="h-8 font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label className="font-medium">Similar to S&P Range %</Label>
                  <Input
                    type="number"
                    step="1"
                    value={(localConfig.crisisResilience.similarToSpRange * 100).toFixed(0)}
                    onChange={(e) => updateScoringConfig(['crisisResilience', 'similarToSpRange'], parseFloat(e.target.value) / 100 || 0)}
                    className="h-8 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <h4 className="font-medium text-sm">Protection Scoring</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label className="font-medium">High Risk Threshold (1-10)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    max="10"
                    value={localConfig.protection.highRiskThreshold}
                    onChange={(e) => updateScoringConfig(['protection', 'highRiskThreshold'], parseInt(e.target.value) || 0)}
                    className="h-8 font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label className="font-medium">Max High Risk Areas</Label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    max="5"
                    value={localConfig.protection.maxHighRiskAreas}
                    onChange={(e) => updateScoringConfig(['protection', 'maxHighRiskAreas'], parseInt(e.target.value) || 0)}
                    className="h-8 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <h4 className="font-medium text-sm">Status Score Thresholds</h4>
              <p className="text-xs text-muted-foreground">
                Score thresholds for determining GREEN/YELLOW/RED status on diagnostic cards.
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label className="font-medium">Green Min Score</Label>
                  <Input
                    type="number"
                    step="5"
                    value={localConfig.statusThresholds.greenMin}
                    onChange={(e) => updateScoringConfig(['statusThresholds', 'greenMin'], parseFloat(e.target.value) || 0)}
                    className="h-8 font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <Label className="font-medium">Yellow Min Score</Label>
                  <Input
                    type="number"
                    step="5"
                    value={localConfig.statusThresholds.yellowMin}
                    onChange={(e) => updateScoringConfig(['statusThresholds', 'yellowMin'], parseFloat(e.target.value) || 0)}
                    className="h-8 font-mono"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Fee Thresholds Tab */}
          <TabsContent value="fees" className="space-y-6 mt-4">
            <p className="text-xs text-muted-foreground">
              Acceptable total fee ranges depend on the advice model. Self-directed investors should have lower fees.
              Advisory relationships can justify higher fees for comprehensive services.
            </p>

            {ADVICE_MODELS.map(model => (
              <div key={model} className="p-4 bg-muted/50 rounded-lg space-y-4">
                <h4 className="font-medium text-sm">{ADVICE_MODEL_LABELS[model]}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid grid-cols-2 gap-4 items-center">
                    <Label className="font-medium">Green Max %</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={(localConfig.fees[model].greenMax * 100).toFixed(2)}
                      onChange={(e) => {
                        const newFees = { ...localConfig.fees };
                        newFees[model] = { ...newFees[model], greenMax: parseFloat(e.target.value) / 100 || 0 };
                        setLocalConfig({ ...localConfig, fees: newFees });
                      }}
                      className="h-8 font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 items-center">
                    <Label className="font-medium">Yellow Max %</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={(localConfig.fees[model].yellowMax * 100).toFixed(2)}
                      onChange={(e) => {
                        const newFees = { ...localConfig.fees };
                        newFees[model] = { ...newFees[model], yellowMax: parseFloat(e.target.value) / 100 || 0 };
                        setLocalConfig({ ...localConfig, fees: newFees });
                      }}
                      className="h-8 font-mono"
                    />
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Returns Tab */}
          <TabsContent value="returns" className="space-y-4 mt-4">
            <div className="grid grid-cols-4 gap-4 text-xs font-medium text-muted-foreground uppercase tracking-wider pb-2 border-b">
              <div>Asset Class</div>
              <div>Expected Return (%)</div>
              <div>Volatility (%)</div>
              <div>Default Fee (%)</div>
            </div>
            {ASSET_CLASSES.map(asset => (
              <div key={asset} className="grid grid-cols-4 gap-4 items-center">
                <Label className="font-medium">{asset}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={(localAssumptions.assetClasses[asset].expectedReturn * 100).toFixed(1)}
                  onChange={(e) => updateAssetClass(asset, 'expectedReturn', parseFloat(e.target.value) / 100 || 0)}
                  className="h-8 font-mono"
                />
                <Input
                  type="number"
                  step="0.1"
                  value={(localAssumptions.assetClasses[asset].volatility * 100).toFixed(1)}
                  onChange={(e) => updateAssetClass(asset, 'volatility', parseFloat(e.target.value) / 100 || 0)}
                  className="h-8 font-mono"
                />
                <Input
                  type="number"
                  step="0.01"
                  value={(localAssumptions.assetClasses[asset].defaultExpenseRatio * 100).toFixed(2)}
                  onChange={(e) => updateAssetClass(asset, 'defaultExpenseRatio', parseFloat(e.target.value) / 100 || 0)}
                  className="h-8 font-mono"
                />
              </div>
            ))}

            <div className="pt-4 border-t space-y-4">
              <div className="grid grid-cols-2 gap-4 items-center">
                <Label className="font-medium">Risk-Free Rate (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={(localAssumptions.riskFreeRate * 100).toFixed(1)}
                  onChange={(e) => setLocalAssumptions({ ...localAssumptions, riskFreeRate: parseFloat(e.target.value) / 100 || 0 })}
                  className="h-8 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 items-center">
                <Label className="font-medium">Inflation Rate (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={(localAssumptions.inflationRate * 100).toFixed(1)}
                  onChange={(e) => setLocalAssumptions({ ...localAssumptions, inflationRate: parseFloat(e.target.value) / 100 || 0 })}
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