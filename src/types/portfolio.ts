export type RiskTolerance = 'Conservative' | 'Moderate' | 'Aggressive';

export type AccountType = 'Taxable' | 'Tax-Advantaged';

export type AssetClass = 'US Stocks' | 'Intl Stocks' | 'Bonds' | 'Commodities' | 'Cash' | 'Other';

export type DiagnosticStatus = 'GREEN' | 'YELLOW' | 'RED';

export interface Holding {
  id: string;
  ticker: string;
  name: string;
  shares: number;
  currentPrice: number;
  costBasis: number;
  accountType: AccountType;
  assetClass: AssetClass;
  expenseRatio?: number;
}

export interface ClientInfo {
  name: string;
  meetingDate: string;
  riskTolerance: RiskTolerance;
  targetAmount?: number;
  yearsToGoal?: number;
}

export interface DiagnosticResult {
  status: DiagnosticStatus;
  score: number;
  keyFinding: string;
  headlineMetric: string;
  details: Record<string, unknown>;
}

export interface PortfolioAnalysis {
  healthScore: number;
  totalValue: number;
  totalCost: number;
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  totalFees: number;
  diagnostics: {
    riskManagement: DiagnosticResult;
    protection: DiagnosticResult;
    returnEfficiency: DiagnosticResult;
    costAnalysis: DiagnosticResult;
    taxEfficiency: DiagnosticResult;
    diversification: DiagnosticResult;
    riskAdjusted: DiagnosticResult;
    crisisResilience: DiagnosticResult;
    optimization: DiagnosticResult;
    planningGaps: DiagnosticResult;
    lifetimeIncomeSecurity: DiagnosticResult;
  };
  recommendations: Recommendation[];
}

export interface Recommendation {
  id: string;
  category: keyof PortfolioAnalysis['diagnostics'];
  priority: number;
  title: string;
  description: string;
  impact: string;
}

export interface PlanningChecklist {
  willTrust: boolean;
  beneficiaryReview: boolean;
  poaDirectives: boolean;
  digitalAssetPlan: boolean;
  insuranceCoverage: boolean;
  emergencyFund: boolean;
  withdrawalStrategy: boolean;
}

// Benchmark comparison types
export interface BenchmarkData {
  key: string;
  name: string;
  description: string;
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  expenseRatio: number;
  growthProjections: { year: number; value: number }[];
}

export interface PortfolioVsBenchmarks {
  portfolio: BenchmarkData;
  benchmarks: BenchmarkData[];
}

// Lifetime Income Security types
export type GuaranteedIncomeSourceType = 
  | 'social-security-client' 
  | 'social-security-spouse'
  | 'pension-client'
  | 'pension-spouse'
  | 'guaranteed-annuity'
  | 'other-guaranteed';

export interface GuaranteedIncomeSource {
  id: string;
  sourceName: string;
  sourceType: GuaranteedIncomeSourceType;
  monthlyAmount: number;
  startAge: number;
  inflationAdj: boolean;
  guaranteedForLife: boolean;
}

export interface LifetimeIncomeInputs {
  coreLivingExpensesMonthly: number;
  discretionaryExpensesMonthly: number;
  healthcareLongTermCareMonthly: number;
  guaranteedSources: GuaranteedIncomeSource[];
}

export interface LifetimeIncomeResult {
  coreExpensesMonthly: number;
  discretionaryMonthly: number;
  healthcareMonthly: number;
  totalExpensesMonthly: number;
  guaranteedLifetimeIncomeMonthly: number;
  coreCoveragePct: number;
  totalCoveragePct: number;
  shortfallCoreMonthly: number;
  surplusForLifestyleMonthly: number;
}
