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
import { useIsMobile } from '@/hooks/use-mobile';

// Components
import { MobileHeader } from './MobileHeader';
import { MobileMetricsCarousel } from './MobileMetricsCarousel';
import { MobileSettingsSheet } from './MobileSettingsSheet';
import { BottomNavigation } from './BottomNavigation';
import { Header } from './Header';
import { MobileDiagnosticCarousel } from './MobileDiagnosticCarousel';
import { HoldingsTable } from './HoldingsTable';
import { DiagnosticCard } from './DiagnosticCard';
import { PerformanceMetricsCard } from './PerformanceMetricsCard';
import { OnboardingWizard } from './OnboardingWizard';
import { DetailView } from './DetailView';

import { EfficientFrontierChart } from './EfficientFrontierChart';
import { StressTestChart } from './StressTestChart';
import { AssetAllocationChart } from './AssetAllocationChart';
import { BenchmarkComparisonChart } from './BenchmarkComparisonChart';
import { LinkedAccountsPanel, SampleAccount } from './LinkedAccountsPanel';
import { ConsumerToolsPanel } from './ConsumerToolsPanel';
import { ClientManager, CompliancePanel } from './advisor';
import { MonteCarloSimulation } from './MonteCarloSimulation';
import { CorrelationHeatmap } from '@/components/charts/CorrelationHeatmap';
import { SettingsPanel } from './SettingsPanel';
import { buildCardContracts } from '@/domain/cards/buildCards';
import { getCardById } from '@/domain/cards/getCardById';
import { buildActionPlan } from '@/domain/summary/buildActionPlan';
import { detectShockAlert } from "@/domain/shock/shockDetector";
import SummaryCard from '@/components/portfolio/SummaryCard';
import ShockAlertCard from "@/components/portfolio/ShockAlertCard";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { LayoutGrid, Table, FileText, LineChart, Menu } from 'lucide-react';
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
  const isMobile = useIsMobile();
  const { isConsumer, isAdvisor, messaging } = useAppMode();
  const { user } = useAuth();
  const { profile, loading: profileLoading, updateProfile, currentAge } = useProfile();
  const { holdings: dbHoldings, loading: holdingsLoading, bulkUpsertHoldings } = useHoldings();
  const { incomeSources, loading: incomeLoading, setIncomeSources: setDbIncomeSources } = useIncomeSources();
  
  // Local state for holdings (supports both authenticated and unauthenticated use)
  const [localHoldings, setLocalHoldings] = useState<Holding[]>([]);
  const [sampleAccounts, setSampleAccounts] = useState<SampleAccount[]>([]);
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isShockDismissed, setIsShockDismissed] = useState(false);

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
  }, []);

  // Apply risk tolerance adjustments to the scoring config
  const scoringConfig = useMemo(() => {
    return applyRiskToleranceAdjustments(baseScoringConfig, clientInfo.riskTolerance);
  }, [baseScoringConfig, clientInfo.riskTolerance]);

  const analysis: PortfolioAnalysis = useMemo(() => {
    return analyzePortfolio(holdings, clientInfo, checklist, scoringConfig, adviceModel, advisorFee, lifetimeIncomeInputs);
  }, [holdings, clientInfo, checklist, scoringConfig, adviceModel, advisorFee, lifetimeIncomeInputs]);

  const cardContracts = useMemo(
    () => (analysis ? buildCardContracts(analysis, holdings) : []),
    [analysis, holdings]
  );

  const actionPlan = useMemo(() => buildActionPlan(cardContracts, 6), [cardContracts]);

  const shockAlert = useMemo(() => detectShockAlert(cardContracts), [cardContracts]);

  // Reset shock dismissal when alert meaningfully changes
  useEffect(() => {
    if (shockAlert) {
      setIsShockDismissed(false);
    }
  }, [shockAlert?.severity, shockAlert?.primaryCategoryKey, shockAlert?.message]);

  const selectedCard = useMemo(
    () => getCardById(cardContracts, selectedCategory),
    [cardContracts, selectedCategory]
  );

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
    
    // Create sample accounts from holdings by grouping
    const brokerageHoldings = SAMPLE_HOLDINGS.filter(h => h.id.startsWith('br-'));
    const tradIraHoldings = SAMPLE_HOLDINGS.filter(h => h.id.startsWith('ira-'));
    const rothIraHoldings = SAMPLE_HOLDINGS.filter(h => h.id.startsWith('roth-'));
    
    const calcTotal = (holdings: typeof SAMPLE_HOLDINGS) => 
      holdings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);
    
    setSampleAccounts([
      {
        id: 'sample-brokerage',
        institution_name: 'Vanguard',
        account_name: 'Brokerage Account',
        account_type: 'Taxable',
        account_mask: '4821',
        total_value: calcTotal(brokerageHoldings),
      },
      {
        id: 'sample-trad-ira',
        institution_name: 'Fidelity',
        account_name: 'Traditional IRA',
        account_type: 'Tax-Advantaged',
        account_mask: '7392',
        total_value: calcTotal(tradIraHoldings),
      },
      {
        id: 'sample-roth-ira',
        institution_name: 'Schwab',
        account_name: 'Roth IRA',
        account_type: 'Tax-Advantaged',
        account_mask: '1056',
        total_value: calcTotal(rothIraHoldings),
      },
    ]);
    
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
      coreLivingExpensesMonthly: 7200,
      discretionaryExpensesMonthly: 2800,
      healthcareLongTermCareMonthly: 1400,
      guaranteedSources: [
        {
          id: crypto.randomUUID(),
          sourceName: "John Social Security",
          sourceType: "social-security-client",
          monthlyAmount: 3400,
          startAge: 67,
          inflationAdj: true,
          guaranteedForLife: true,
        },
        {
          id: crypto.randomUUID(),
          sourceName: "Sarah Social Security",
          sourceType: "social-security-spouse",
          monthlyAmount: 2000,
          startAge: 67,
          inflationAdj: true,
          guaranteedForLife: true,
        },
        {
          id: crypto.randomUUID(),
          sourceName: "ABC Corp Pension",
          sourceType: "pension-client",
          monthlyAmount: 2300,
          startAge: 65,
          inflationAdj: false,
          guaranteedForLife: true,
        },
        {
          id: crypto.randomUUID(),
          sourceName: "Deferred Income Annuity (example)",
          sourceType: "guaranteed-annuity",
          monthlyAmount: 900,
          startAge: 70,
          inflationAdj: false,
          guaranteedForLife: true,
        },
      ],
    });
    toast.success('Sample portfolio loaded');
  }, []);

  const diagnosticEntries = Object.entries(DIAGNOSTIC_CATEGORIES) as Array<[keyof typeof DIAGNOSTIC_CATEGORIES, typeof DIAGNOSTIC_CATEGORIES[keyof typeof DIAGNOSTIC_CATEGORIES]]>;

  // Handle tab changes from bottom navigation
  const handleTabChange = (tab: string) => {
    if (tab === 'settings') {
      setSettingsOpen(true);
    } else {
      setActiveTab(tab);
    }
  };

  // Show onboarding wizard for new authenticated users
  if (showOnboarding) {
    return <OnboardingWizard onComplete={() => setShowOnboarding(false)} />;
  }

  // Sidebar content (shared between mobile sheet and desktop)
  // On mobile, LinkedAccountsPanel is rendered separately above diagnostic cards
  const SidebarContent = ({ excludeLinkedAccounts = false }: { excludeLinkedAccounts?: boolean }) => (
    <div className="space-y-4 sm:space-y-6">
      {isConsumer && (
        <>
          {!excludeLinkedAccounts && <LinkedAccountsPanel onHoldingsSync={() => {}} sampleAccounts={sampleAccounts} />}
        </>
      )}

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
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Mobile Header */}
      {isMobile ? (
        <>
          <MobileHeader 
            analysis={analysis} 
            onSettingsOpen={() => setSettingsOpen(true)} 
          />
          <MobileMetricsCarousel 
            analysis={analysis} 
            scoringConfig={scoringConfig} 
            performanceMetrics={performanceMetrics}
            onViewAllMetrics={() => setSelectedCategory('performanceMetrics')}
          />
          <MobileSettingsSheet
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            clientInfo={clientInfo}
            analysis={analysis}
            holdings={holdings}
            notes={notes}
            assumptions={assumptions}
            scoringConfig={scoringConfig}
            adviceModel={adviceModel}
            advisorFee={advisorFee}
            onClientInfoChange={handleClientInfoChange}
            onLoadSample={handleLoadSample}
          />
        </>
      ) : (
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
      )}

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Desktop Tab Navigation */}
        {!isMobile && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-2">
              {/* Mobile sidebar trigger for tablets */}
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

              <TabsList className="bg-muted/50 flex-1">
                <TabsTrigger value="dashboard" className="gap-2">
                  <LayoutGrid size={16} />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="holdings" className="gap-2">
                  <Table size={16} />
                  Holdings
                </TabsTrigger>
                <TabsTrigger value="charts" className="gap-2">
                  <LineChart size={16} />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="notes" className="gap-2">
                  <FileText size={16} />
                  Notes
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
                  lifetimeIncomeInputs={lifetimeIncomeInputs}
                  onLifetimeIncomeUpdate={setLifetimeIncomeInputs}
                  card={selectedCard}
                />
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {shockAlert && !isShockDismissed && (
                    <ShockAlertCard
                      alert={shockAlert}
                      onExplain={() => {
                        if (shockAlert.primaryCategoryKey) setSelectedCategory(String(shockAlert.primaryCategoryKey));
                      }}
                      onDismiss={() => setIsShockDismissed(true)}
                    />
                  )}
                  <SummaryCard healthScore={analysis?.healthScore} actionPlan={actionPlan} />
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
                    <div className="lg:col-span-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                      {cardContracts.map((c) => (
                        <DiagnosticCard
                          key={String(c.id)}
                          name={String(c.title)}
                          iconName={c.iconName ?? "Shield"}
                          categoryKey={String(c.id)}
                          result={{
                            status: c.status,
                            score: c.score,
                            keyFinding: c.keyFinding,
                            headlineMetric: c.headlineMetric,
                            details: c.details,
                          }}
                          onViewDetails={() => setSelectedCategory(String(c.id))}
                          scoringConfig={baseScoringConfig}
                          riskTolerance={clientInfo.riskTolerance}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="hidden lg:block space-y-6">
                    <SidebarContent />
                  </div>
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
                <MonteCarloSimulation portfolioValue={analysis.totalValue} expectedReturn={analysis.expectedReturn} volatility={analysis.volatility} currentAge={clientInfo.currentAge} />
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
                    placeholder="Enter meeting notes, observations, and action items..."
                    className="min-h-[400px]"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Mobile Content (no tabs wrapper) */}
        {isMobile && (
          <div className="space-y-4">
            {activeTab === 'dashboard' && (
              <>
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
                    lifetimeIncomeInputs={lifetimeIncomeInputs}
                    onLifetimeIncomeUpdate={setLifetimeIncomeInputs}
                    card={selectedCard}
                  />
                ) : (
                  <div className="space-y-6">
                    {/* Shock Alert at top of mobile dashboard */}
                    {shockAlert && !isShockDismissed && (
                      <ShockAlertCard
                        alert={shockAlert}
                        onExplain={() => {
                          if (shockAlert.primaryCategoryKey) setSelectedCategory(String(shockAlert.primaryCategoryKey));
                        }}
                        onDismiss={() => setIsShockDismissed(true)}
                      />
                    )}
                    
                    {/* Linked Accounts above diagnostic cards on mobile */}
                    {isConsumer && <LinkedAccountsPanel onHoldingsSync={() => {}} compact sampleAccounts={sampleAccounts} />}
                    
                    {/* Swipeable Diagnostic Cards Carousel */}
                    <MobileDiagnosticCarousel
                      analysis={analysis}
                      scoringConfig={scoringConfig}
                      riskTolerance={clientInfo.riskTolerance}
                      onViewDetails={(key) => setSelectedCategory(key)}
                    />
                    
                    {/* Inline sidebar content on mobile (excluding LinkedAccountsPanel) */}
                    <div className="pt-2">
                      <SidebarContent excludeLinkedAccounts />
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'holdings' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Portfolio Holdings</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <HoldingsTable holdings={holdings} onUpdate={handleHoldingsUpdate} />
                </CardContent>
              </Card>
            )}

            {activeTab === 'charts' && (
              <div className="space-y-4">
                <BenchmarkComparisonChart analysis={analysis} initialValue={100000} />
                <EfficientFrontierChart analysis={analysis} holdings={holdings} />
                <StressTestChart analysis={analysis} />
                <AssetAllocationChart holdings={holdings} totalValue={analysis.totalValue} />
                <MonteCarloSimulation portfolioValue={analysis.totalValue} expectedReturn={analysis.expectedReturn} volatility={analysis.volatility} currentAge={clientInfo.currentAge} />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      )}
    </div>
  );
}
