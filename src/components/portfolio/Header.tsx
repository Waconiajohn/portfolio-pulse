import { ClientInfo, PortfolioAnalysis, Holding } from '@/types/portfolio';
import { PortfolioAssumptions } from '@/lib/assumptions';
import { ScoringConfig, AdviceModel } from '@/lib/scoring-config';
import { MetricCard } from './MetricCard';
import { SettingsPanel } from './SettingsPanel';
import { ModeToggle } from './ModeToggle';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FileDown, ChevronDown, Database, LogIn, LogOut, User } from 'lucide-react';
import { generatePDF } from '@/lib/pdf-export';
import { toast } from 'sonner';
import { useAppMode } from '@/contexts/AppModeContext';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  clientInfo: ClientInfo;
  analysis: PortfolioAnalysis;
  holdings: Holding[];
  notes: string;
  assumptions: PortfolioAssumptions;
  scoringConfig: ScoringConfig;
  adviceModel: AdviceModel;
  advisorFee: number;
  onClientInfoChange: (info: ClientInfo) => void;
  onAssumptionsChange: (assumptions: PortfolioAssumptions) => void;
  onScoringConfigChange: (config: ScoringConfig) => void;
  onAdviceModelChange: (model: AdviceModel) => void;
  onAdvisorFeeChange: (fee: number) => void;
  onLoadSample: () => void;
}

// Calculate age from date of birth
function calculateAge(dateOfBirth: string): number | undefined {
  if (!dateOfBirth) return undefined;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function Header({ 
  clientInfo, 
  analysis, 
  holdings,
  notes,
  assumptions,
  scoringConfig,
  adviceModel,
  advisorFee,
  onClientInfoChange, 
  onAssumptionsChange,
  onScoringConfigChange,
  onAdviceModelChange,
  onAdvisorFeeChange,
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

  const { isAdvisor } = useAppMode();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  // Handle date of birth change and auto-calculate age
  const handleDateOfBirthChange = (dateOfBirth: string) => {
    const age = calculateAge(dateOfBirth);
    onClientInfoChange({ 
      ...clientInfo, 
      meetingDate: dateOfBirth, // Reusing meetingDate field for DOB
      currentAge: age 
    });
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        {/* Top row - responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 sm:mb-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight">PortfolioGuard</h1>
              <p className="text-xs text-muted-foreground">
                {isAdvisor ? 'Professional Advisory Analysis' : 'Personal Portfolio Analysis'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <User size={14} />
                    <span className="hidden sm:inline max-w-[100px] truncate">{user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut size={14} className="mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate('/auth')} className="gap-1.5">
                <LogIn size={14} />
                <span className="hidden sm:inline">Sign In</span>
              </Button>
            )}
            <ModeToggle />
            <Button variant="outline" size="sm" onClick={onLoadSample} className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <Database size={14} />
              <span className="hidden xs:inline">Load</span> Sample
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
                  <FileDown size={14} />
                  <span className="hidden sm:inline">Export</span> PDF
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
            <SettingsPanel 
              assumptions={assumptions} 
              onUpdate={onAssumptionsChange}
              scoringConfig={scoringConfig}
              onScoringConfigUpdate={onScoringConfigChange}
              adviceModel={adviceModel}
              onAdviceModelChange={onAdviceModelChange}
              advisorFee={advisorFee}
              onAdvisorFeeChange={onAdvisorFeeChange}
              currentRiskTolerance={clientInfo.riskTolerance}
            />
          </div>
        </div>


        {/* Metrics row - responsive scroll on mobile */}
        <div className="pt-2 sm:pt-3 border-t border-border/50 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-4 sm:gap-6 min-w-max sm:min-w-0 sm:flex-wrap">

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
              tooltip={`Risk-adjusted return metric. Target: ${scoringConfig.sharpe.portfolioTarget.toFixed(2)}`}
              trend={analysis.sharpeRatio >= scoringConfig.sharpe.portfolioTarget ? 'up' : analysis.sharpeRatio < 0.3 ? 'down' : 'neutral'}
            />
            
            <MetricCard
              label="Total Fees"
              value={`$${analysis.totalFees.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              subValue={`${((analysis.totalFees / (analysis.totalValue || 1)) * 100).toFixed(2)}%/yr`}
              tooltip="Annual expense ratio fees"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
