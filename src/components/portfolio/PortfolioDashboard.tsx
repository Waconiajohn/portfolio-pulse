import { useState, useMemo, useCallback } from 'react';
import { Holding, ClientInfo, PlanningChecklist, PortfolioAnalysis } from '@/types/portfolio';
import { analyzePortfolio } from '@/lib/analysis-engine';
import { DIAGNOSTIC_CATEGORIES } from '@/lib/constants';
import { PortfolioAssumptions, DEFAULT_ASSUMPTIONS, saveAssumptions, loadAssumptions } from '@/lib/assumptions';
import { ScoringConfig, DEFAULT_SCORING_CONFIG, loadScoringConfig, saveScoringConfig, AdviceModel } from '@/lib/scoring-config';
import { SAMPLE_HOLDINGS } from '@/lib/sample-data';
import { computeCorrelationMatrix, generateSimulatedReturns, analyzeCorrelationIssues, CorrelationMatrixResult } from '@/lib/correlation';
import { Header } from './Header';
import { HoldingsTable } from './HoldingsTable';
import { DiagnosticCard } from './DiagnosticCard';
import { RecommendationsPanel } from './RecommendationsPanel';
import { DetailView } from './DetailView';
import { PlanningChecklistCard } from './PlanningChecklist';
import { EfficientFrontierChart } from './EfficientFrontierChart';
import { StressTestChart } from './StressTestChart';
import { AssetAllocationChart } from './AssetAllocationChart';
import { CorrelationHeatmap } from '@/components/charts/CorrelationHeatmap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { LayoutGrid, Table, FileText, LineChart } from 'lucide-react';
import { toast } from 'sonner';

const initialClientInfo: ClientInfo = {
  name: '',
  meetingDate: new Date().toISOString().split('T')[0],
  riskTolerance: 'Moderate',
};

const initialChecklist: PlanningChecklist = {
  willTrust: false,
  beneficiaryReview: false,
  poaDirectives: false,
  digitalAssetPlan: false,
  insuranceCoverage: false,
  emergencyFund: false,
  withdrawalStrategy: false,
};

export function PortfolioDashboard() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [clientInfo, setClientInfo] = useState<ClientInfo>(initialClientInfo);
  const [checklist, setChecklist] = useState<PlanningChecklist>(initialChecklist);
  const [notes, setNotes] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [assumptions, setAssumptions] = useState<PortfolioAssumptions>(() => loadAssumptions());
  const [scoringConfig, setScoringConfig] = useState<ScoringConfig>(() => loadScoringConfig());
  const [adviceModel, setAdviceModel] = useState<AdviceModel>('self-directed');
  const [advisorFee, setAdvisorFee] = useState(0);

  const analysis: PortfolioAnalysis = useMemo(() => {
    return analyzePortfolio(holdings, clientInfo, checklist, scoringConfig, adviceModel, advisorFee);
  }, [holdings, clientInfo, checklist, scoringConfig, adviceModel, advisorFee]);

  // Compute correlation matrix when holdings change
  const correlationData: CorrelationMatrixResult = useMemo(() => {
    if (holdings.length < 2) {
      return { labels: [], matrix: [] };
    }
    const holdingsData = holdings.map(h => ({ ticker: h.ticker, assetClass: h.assetClass }));
    const returnsBySymbol = generateSimulatedReturns(holdingsData);
    return computeCorrelationMatrix(returnsBySymbol);
  }, [holdings]);

  const correlationAnalysis = useMemo(() => {
    return analyzeCorrelationIssues(correlationData.matrix, correlationData.labels);
  }, [correlationData]);

  const handleAssumptionsChange = useCallback((newAssumptions: PortfolioAssumptions) => {
    setAssumptions(newAssumptions);
    saveAssumptions(newAssumptions);
  }, []);

  const handleScoringConfigChange = useCallback((newConfig: ScoringConfig) => {
    setScoringConfig(newConfig);
    saveScoringConfig(newConfig);
    toast.success('Scoring benchmarks saved');
  }, []);

  const handleLoadSample = useCallback(() => {
    setHoldings(SAMPLE_HOLDINGS);
    setClientInfo({
      name: 'John & Sarah Smith',
      meetingDate: new Date().toISOString().split('T')[0],
      riskTolerance: 'Moderate',
      targetAmount: 2000000,
      yearsToGoal: 15,
    });
    setChecklist({
      willTrust: true,
      beneficiaryReview: true,
      poaDirectives: true,
      digitalAssetPlan: false,
      insuranceCoverage: true,
      emergencyFund: true,
      withdrawalStrategy: false,
    });
    toast.success('Sample portfolio loaded');
  }, []);

  const diagnosticEntries = Object.entries(DIAGNOSTIC_CATEGORIES) as Array<[keyof typeof DIAGNOSTIC_CATEGORIES, typeof DIAGNOSTIC_CATEGORIES[keyof typeof DIAGNOSTIC_CATEGORIES]]>;

  return (
    <div className="min-h-screen bg-background">
      <Header
        clientInfo={clientInfo}
        analysis={analysis}
        holdings={holdings}
        notes={notes}
        assumptions={assumptions}
        scoringConfig={scoringConfig}
        adviceModel={adviceModel}
        advisorFee={advisorFee}
        onClientInfoChange={setClientInfo}
        onAssumptionsChange={handleAssumptionsChange}
        onScoringConfigChange={handleScoringConfigChange}
        onAdviceModelChange={setAdviceModel}
        onAdvisorFeeChange={setAdvisorFee}
        onLoadSample={handleLoadSample}
      />

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutGrid size={14} />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="holdings" className="gap-2">
              <Table size={14} />
              Holdings
            </TabsTrigger>
            <TabsTrigger value="charts" className="gap-2">
              <LineChart size={14} />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-2">
              <FileText size={14} />
              Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {selectedCategory ? (
              <DetailView
                name={DIAGNOSTIC_CATEGORIES[selectedCategory as keyof typeof DIAGNOSTIC_CATEGORIES].name}
                result={analysis.diagnostics[selectedCategory as keyof typeof analysis.diagnostics]}
                onClose={() => setSelectedCategory(null)}
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Main diagnostic grid */}
                <div className="lg:col-span-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {diagnosticEntries.map(([key, config]) => (
                      <DiagnosticCard
                        key={key}
                        name={config.name}
                        iconName={config.icon}
                        categoryKey={key}
                        result={analysis.diagnostics[key as keyof typeof analysis.diagnostics]}
                        onViewDetails={() => setSelectedCategory(key)}
                      />
                    ))}
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  <RecommendationsPanel
                    recommendations={analysis.recommendations}
                    onNavigateToCategory={(cat) => setSelectedCategory(cat)}
                  />
                  <PlanningChecklistCard
                    checklist={checklist}
                    onUpdate={setChecklist}
                  />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="holdings">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Holdings</CardTitle>
              </CardHeader>
              <CardContent>
                <HoldingsTable holdings={holdings} onUpdate={setHoldings} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EfficientFrontierChart analysis={analysis} holdings={holdings} />
              <CorrelationHeatmap 
                data={correlationData} 
                title="Holdings Correlation Matrix"
                description={correlationAnalysis.hasIssues 
                  ? `${correlationAnalysis.highCorrelations.length} high correlation pairs detected` 
                  : 'Good diversification across holdings'}
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StressTestChart analysis={analysis} />
              <AssetAllocationChart holdings={holdings} totalValue={analysis.totalValue} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/30 border border-border">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">Sharpe Ratio</div>
                      <div className="font-mono text-2xl font-semibold mt-1">{analysis.sharpeRatio.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground mt-1">Target: {scoringConfig.sharpe.portfolioTarget.toFixed(2)}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/30 border border-border">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">Expected Return</div>
                      <div className="font-mono text-2xl font-semibold mt-1 value-positive">{(analysis.expectedReturn * 100).toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground mt-1">Annualized</div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/30 border border-border">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">Volatility</div>
                      <div className="font-mono text-2xl font-semibold mt-1">{(analysis.volatility * 100).toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground mt-1">Standard Deviation</div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/30 border border-border">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">Fee Drag</div>
                      <div className="font-mono text-2xl font-semibold mt-1 value-negative">
                        {((analysis.totalFees / (analysis.totalValue || 1)) * 100).toFixed(2)}%
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Annual cost</div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="text-sm font-medium">Optimization Potential</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Based on current analysis, the portfolio could potentially improve Sharpe ratio by 
                      <span className="font-mono font-medium text-status-good"> +{((analysis.sharpeRatio * 0.15)).toFixed(2)}</span> through 
                      rebalancing and fee optimization.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle>Meeting Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter client-specific notes here. These will appear at the end of the exported PDF report."
                  className="min-h-[300px] font-mono text-sm"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
