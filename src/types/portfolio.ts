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
