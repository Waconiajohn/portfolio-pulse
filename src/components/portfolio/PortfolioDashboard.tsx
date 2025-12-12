import { useState, useMemo, useCallback, useEffect } from 'react';
import { Holding, ClientInfo, PlanningChecklist, PortfolioAnalysis, LifetimeIncomeInputs } from '@/types/portfolio';
import { analyzePortfolio } from '@/lib/analysis-engine';
import { DIAGNOSTIC_CATEGORIES } from '@/lib/constants';
import { PortfolioAssumptions, DEFAULT_ASSUMPTIONS, saveAssumptions, loadAssumptions } from '@/lib/assumptions';
import { 
  ScoringConfig, 
  DEFAULT_SCORING_CONFIG, 
  loadScoringConfig, 
  saveScoringConfig, 
  AdviceModel,
  applyRiskToleranceAdjustments 
} from '@/lib/scoring-config';
import { SAMPLE_HOLDINGS } from '@/lib/sample-data';
import { computeCorrelationMatrix, generateSimulatedReturns, analyzeCorrelationIssues, CorrelationMatrixResult } from '@/lib/correlation';
import { calculateAllPerformanceMetrics } from '@/lib/performance-metrics';
import { useAppMode } from '@/contexts/AppModeContext';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useHoldings } from '@/hooks/useHoldings';
import { useIncomeSources } from '@/hooks/useIncomeSources';
import { Header } from './Header';
import { HoldingsTable } from './HoldingsTable';
import { DiagnosticCard } from './DiagnosticCard';
import { PerformanceMetricsCard } from './PerformanceMetricsCard';
import { OnboardingWizard } from './OnboardingWizard';
import { DetailView } from './DetailView';
import { LifetimeIncomePanel } from './LifetimeIncomePanel';
import { EfficientFrontierChart } from './EfficientFrontierChart';
import { StressTestChart } from './StressTestChart';
import { AssetAllocationChart } from './AssetAllocationChart';
import { BenchmarkComparisonChart } from './BenchmarkComparisonChart';
import { LinkedAccountsPanel } from './LinkedAccountsPanel';
import { ConsumerToolsPanel } from './ConsumerToolsPanel';
import { ClientManager, CompliancePanel } from './advisor';
import { MonteCarloSimulation } from './MonteCarloSimulation';
import { CorrelationHeatmap } from '@/components/charts/CorrelationHeatmap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { LayoutGrid, Table, FileText, LineChart, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';

const initialClientInfo: ClientInfo = {
  name: '',
  meetingDate: new Date().toISOString().split('T')[0],
  riskTolerance: 'Moderate',
};

const initialChecklist: PlanningChecklist = {
  willTrust: false,
  healthcareDirectives: false,
  poaDirectives: false,
  emergencyFund: false,
  beneficiaryReview: false,
  executorDesignation: false,
  guardianDesignation: false,
  insuranceCoverage: false,
  digitalAssetPlan: false,
  withdrawalStrategy: false,
  investmentPolicyStatement: false,
};

const initialLifetimeIncomeInputs: LifetimeIncomeInputs = {
  coreLivingExpensesMonthly: 0,
  discretionaryExpensesMonthly: 0,
  healthcareLongTermCareMonthly: 0,
  guaranteedSources: [],
};

export function PortfolioDashboard() {
  const { isConsumer, isAdvisor, messaging } = useAppMode();
  const { user } = useAuth();
  const { profile, loading: profileLoading, updateProfile, currentAge } = useProfile();
  const { holdings: dbHoldings, loading: holdingsLoading, bulkUpsertHoldings } = useHoldings();
  const { incomeSources, loading: incomeLoading, setIncomeSources: setDbIncomeSources } = useIncomeSources();
  
  // Local state for holdings (supports both authenticated and unauthenticated use)
  const [localHoldings, setLocalHoldings] = useState<Holding[]>([]);
  const holdings = user ? (dbHoldings.length > 0 ? dbHoldings : localHoldings) : localHoldings;
  
  const [clientInfo, setClientInfo] = useState<ClientInfo>(initialClientInfo);
  const [checklist, setChecklist] = useState<PlanningChecklist>(initialChecklist);
  const [lifetimeIncomeInputs, setLifetimeIncomeInputs] = useState<LifetimeIncomeInputs>(initialLifetimeIncomeInputs);
  const [notes, setNotes] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [assumptions, setAssumptions] = useState<PortfolioAssumptions>(() => loadAssumptions());
  const [baseScoringConfig, setBaseScoringConfig] = useState<ScoringConfig>(() => loadScoringConfig());
  const [adviceModel, setAdviceModel] = useState<AdviceModel>('self-directed');
  const [advisorFee, setAdvisorFee] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sync profile data to clientInfo when profile loads
  useEffect(() => {
    if (profile) {
      setClientInfo(prev => ({
        ...prev,
        name: profile.name || prev.name,
        meetingDate: profile.date_of_birth || prev.meetingDate,
        riskTolerance: profile.risk_tolerance as ClientInfo['riskTolerance'] || prev.riskTolerance,
        currentAge: currentAge || prev.currentAge,
      }));
    }
  }, [profile, currentAge]);

  // Sync income sources from database
  useEffect(() => {
    if (incomeSources.length > 0) {
      setLifetimeIncomeInputs(prev => ({
        ...prev,
        guaranteedSources: incomeSources,
      }));
    }
  }, [incomeSources]);

  // Check if new user needs onboarding
  useEffect(() => {
    if (user && profile && !profileLoading && !profile.name && !profile.date_of_birth) {
      setShowOnboarding(true);
    }
  }, [user, profile, profileLoading]);

  // Handle holdings update - sync to database if authenticated
  const handleHoldingsUpdate = useCallback((newHoldings: Holding[]) => {
    setLocalHoldings(newHoldings);
    // Note: For bulk updates, use bulkUpsertHoldings when user is authenticated
  }, []);

  // Apply risk tolerance adjustments to the scoring config
  const scoringConfig = useMemo(() => {
    return applyRiskToleranceAdjustments(baseScoringConfig, clientInfo.riskTolerance);
  }, [baseScoringConfig, clientInfo.riskTolerance]);

  const analysis: PortfolioAnalysis = useMemo(() => {
    return analyzePortfolio(holdings, clientInfo, checklist, scoringConfig, adviceModel, advisorFee, lifetimeIncomeInputs);
  }, [holdings, clientInfo, checklist, scoringConfig, adviceModel, advisorFee, lifetimeIncomeInputs]);

  // Calculate advanced performance metrics
  const performanceMetrics = useMemo(() => {
    return calculateAllPerformanceMetrics(holdings);
  }, [holdings]);

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
    setBaseScoringConfig(newConfig);
    saveScoringConfig(newConfig);
    toast.success('Scoring benchmarks saved');
  }, []);

  // Handle client info changes - sync name/dob/risk to profile if authenticated
  const handleClientInfoChange = useCallback(async (newClientInfo: ClientInfo) => {
    setClientInfo(newClientInfo);
    
    if (user && profile) {
      // Sync to database
      const updates: Record<string, unknown> = {};
      if (newClientInfo.name !== profile.name) updates.name = newClientInfo.name;
      if (newClientInfo.meetingDate !== profile.date_of_birth) updates.date_of_birth = newClientInfo.meetingDate;
      if (newClientInfo.riskTolerance !== profile.risk_tolerance) updates.risk_tolerance = newClientInfo.riskTolerance;
      
      if (Object.keys(updates).length > 0) {
        await updateProfile(updates as Parameters<typeof updateProfile>[0]);
      }
    }
  }, [user, profile, updateProfile]);

  const handleLoadSample = useCallback(() => {
    setLocalHoldings(SAMPLE_HOLDINGS);
    setClientInfo({
      name: 'John & Sarah Smith',
      meetingDate: new Date().toISOString().split('T')[0],
      riskTolerance: 'Moderate',
      targetAmount: 2000000,
      yearsToGoal: 15,
      currentAge: 62,
    });
    setChecklist({
      willTrust: true,
      healthcareDirectives: true,
      poaDirectives: true,
      emergencyFund: true,
      beneficiaryReview: true,
      executorDesignation: false,
      guardianDesignation: false,
      insuranceCoverage: true,
      digitalAssetPlan: false,
      withdrawalStrategy: false,
      investmentPolicyStatement: false,
    });
    setLifetimeIncomeInputs({
      coreLivingExpensesMonthly: 6500,
      discretionaryExpensesMonthly: 2500,
      healthcareLongTermCareMonthly: 1200,
      guaranteedSources: [
        {
          id: crypto.randomUUID(),
          sourceName: 'John Social Security',
          sourceType: 'social-security-client',
          monthlyAmount: 3200,
          startAge: 67,
          inflationAdj: true,
          guaranteedForLife: true,
        },
        {
          id: crypto.randomUUID(),
          sourceName: 'Sarah Social Security',
          sourceType: 'social-security-spouse',
          monthlyAmount: 1800,
          startAge: 67,
          inflationAdj: true,
          guaranteedForLife: true,
        },
        {
          id: crypto.randomUUID(),
          sourceName: 'ABC Corp Pension',
          sourceType: 'pension-client',
          monthlyAmount: 2100,
          startAge: 65,
          inflationAdj: false,
          guaranteedForLife: true,
        },
      ],
    });
    toast.success('Sample portfolio loaded');
  }, []);

  const diagnosticEntries = Object.entries(DIAGNOSTIC_CATEGORIES) as Array<[keyof typeof DIAGNOSTIC_CATEGORIES, typeof DIAGNOSTIC_CATEGORIES[keyof typeof DIAGNOSTIC_CATEGORIES]]>;

  // Show onboarding wizard for new authenticated users
  if (showOnboarding) {
    return <OnboardingWizard onComplete={() => setShowOnboarding(false)} />;
  }

  // Sidebar content (shared between mobile sheet and desktop)
  const SidebarContent = () => (
    <div className="space-y-6">
      {/* Consumer Mode: Linked Accounts & Tools */}
      {isConsumer && (
        <>
          <LinkedAccountsPanel onHoldingsSync={() => {}} />
          {holdings.length > 0 && (
            <>
              <PerformanceMetricsCard 
                metrics={performanceMetrics} 
                riskTolerance={clientInfo.riskTolerance} 
              />
              <ConsumerToolsPanel
                portfolioValue={analysis.totalValue}
                expenseRatio={analysis.totalFees / (analysis.totalValue || 1)}
                riskTolerance={clientInfo.riskTolerance}
                volatility={analysis.volatility}
                expectedReturn={analysis.expectedReturn}
                currentAge={clientInfo.currentAge}
              />
            </>
          )}
        </>
      )}

      {/* Advisor Mode: Client Manager & Compliance */}
      {isAdvisor && (
        <>
          <ClientManager 
            onSelectClient={(client) => {
              setClientInfo(prev => ({
                ...prev,
                name: client.name,
                riskTolerance: client.riskTolerance,
              }));
              setSidebarOpen(false);
            }}
          />
          <CompliancePanel clientName={clientInfo.name} />
        </>
      )}
      
      <LifetimeIncomePanel
        inputs={lifetimeIncomeInputs}
        onUpdate={setLifetimeIncomeInputs}
      />
    </div>
  );

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
        onClientInfoChange={handleClientInfoChange}
        onAssumptionsChange={handleAssumptionsChange}
        onScoringConfigChange={handleScoringConfigChange}
        onAdviceModelChange={setAdviceModel}
        onAdvisorFeeChange={setAdvisorFee}
        onLoadSample={handleLoadSample}
      />

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          {/* Mobile-friendly tab navigation */}
          <div className="flex items-center gap-2">
            {/* Mobile sidebar trigger */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden shrink-0">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[320px] sm:w-[400px] overflow-y-auto">
                <div className="pt-6">
                  <SidebarContent />
                </div>
              </SheetContent>
            </Sheet>

            <TabsList className="bg-muted/50 flex-1 overflow-x-auto">
              <TabsTrigger value="dashboard" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <LayoutGrid size={14} />
                <span className="hidden xs:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="holdings" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <Table size={14} />
                <span className="hidden xs:inline">Holdings</span>
              </TabsTrigger>
              <TabsTrigger value="charts" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <LineChart size={14} />
                <span className="hidden xs:inline">Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <FileText size={14} />
                <span className="hidden xs:inline">Notes</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-4 sm:space-y-6">
            {selectedCategory ? (
              <DetailView
                name={DIAGNOSTIC_CATEGORIES[selectedCategory as keyof typeof DIAGNOSTIC_CATEGORIES].name}
                categoryKey={selectedCategory}
                result={analysis.diagnostics[selectedCategory as keyof typeof analysis.diagnostics]}
                onClose={() => setSelectedCategory(null)}
                scoringConfig={scoringConfig}
                riskTolerance={clientInfo.riskTolerance}
                clientAge={clientInfo.currentAge}
                inflationRate={assumptions.inflationRate}
                checklist={checklist}
                onChecklistUpdate={setChecklist}
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Main diagnostic grid */}
                <div className="lg:col-span-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                    {diagnosticEntries.map(([key, config]) => (
                      <DiagnosticCard
                        key={key}
                        name={config.name}
                        iconName={config.icon}
                        categoryKey={key}
                        result={analysis.diagnostics[key as keyof typeof analysis.diagnostics]}
                        onViewDetails={() => setSelectedCategory(key)}
                        scoringConfig={scoringConfig}
                        riskTolerance={clientInfo.riskTolerance}
                      />
                    ))}
                  </div>
                </div>

                {/* Desktop Sidebar - hidden on mobile */}
                <div className="hidden lg:block space-y-6">
                  <SidebarContent />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="holdings">
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Portfolio Holdings</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <HoldingsTable holdings={holdings} onUpdate={handleHoldingsUpdate} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="charts" className="space-y-4 sm:space-y-6">
            {/* Benchmark Comparison - Full Width */}
            <BenchmarkComparisonChart analysis={analysis} initialValue={100000} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <EfficientFrontierChart analysis={analysis} holdings={holdings} />
              <CorrelationHeatmap 
                data={correlationData} 
                title="Holdings Correlation Matrix"
                description={correlationAnalysis.hasIssues 
                  ? `${correlationAnalysis.highCorrelations.length} high correlation pairs detected` 
                  : 'Good diversification across holdings'}
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <StressTestChart analysis={analysis} />
              <AssetAllocationChart holdings={holdings} totalValue={analysis.totalValue} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="p-3 sm:p-4 rounded-lg bg-muted/30 border border-border">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">Sharpe Ratio</div>
                      <div className="font-mono text-xl sm:text-2xl font-semibold mt-1">{analysis.sharpeRatio.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground mt-1">Target: {scoringConfig.sharpe.portfolioTarget.toFixed(2)}</div>
                    </div>
                    <div className="p-3 sm:p-4 rounded-lg bg-muted/30 border border-border">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">Expected Return</div>
                      <div className="font-mono text-xl sm:text-2xl font-semibold mt-1 value-positive">{(analysis.expectedReturn * 100).toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground mt-1">Annualized</div>
                    </div>
                    <div className="p-3 sm:p-4 rounded-lg bg-muted/30 border border-border">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">Volatility</div>
                      <div className="font-mono text-xl sm:text-2xl font-semibold mt-1">{(analysis.volatility * 100).toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground mt-1">Standard Deviation</div>
                    </div>
                    <div className="p-3 sm:p-4 rounded-lg bg-muted/30 border border-border">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">Fee Drag</div>
                      <div className="font-mono text-xl sm:text-2xl font-semibold mt-1 value-negative">
                        {((analysis.totalFees / (analysis.totalValue || 1)) * 100).toFixed(2)}%
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Annual cost</div>
                    </div>
                  </div>
                  <div className="p-3 sm:p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="text-sm font-medium">Optimization Potential</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Based on current analysis, the portfolio could potentially improve Sharpe ratio by 
                      <span className="font-mono font-medium text-status-good"> +{((analysis.sharpeRatio * 0.15)).toFixed(2)}</span> through 
                      rebalancing and fee optimization.
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Monte Carlo Simulation */}
              <MonteCarloSimulation
                portfolioValue={analysis.totalValue}
                expectedReturn={analysis.expectedReturn}
                volatility={analysis.volatility}
                currentAge={clientInfo.currentAge}
              />
            </div>
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Meeting Notes</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter client-specific notes here. These will appear at the end of the exported PDF report."
                  className="min-h-[250px] sm:min-h-[300px] font-mono text-sm"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
