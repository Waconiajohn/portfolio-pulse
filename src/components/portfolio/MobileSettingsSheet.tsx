import { useState } from 'react';
import { ClientInfo, PortfolioAnalysis, Holding } from '@/types/portfolio';
import { PortfolioAssumptions } from '@/lib/assumptions';
import { ScoringConfig, AdviceModel } from '@/lib/scoring-config';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  User, FileDown, Settings, Shield, Database, 
  LogOut, ChevronRight 
} from 'lucide-react';
import { useAppMode } from '@/contexts/AppModeContext';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { generatePDF } from '@/lib/pdf-export';
import { toast } from 'sonner';
import { RiskTolerance } from '@/types/portfolio';

interface MobileSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientInfo: ClientInfo;
  analysis: PortfolioAnalysis;
  holdings: Holding[];
  notes: string;
  assumptions: PortfolioAssumptions;
  scoringConfig: ScoringConfig;
  adviceModel: AdviceModel;
  advisorFee: number;
  onClientInfoChange: (info: ClientInfo) => void;
  onLoadSample: () => void;
}

const RISK_LEVELS: RiskTolerance[] = ['Conservative', 'Moderate', 'Aggressive'];

export function MobileSettingsSheet({
  open,
  onOpenChange,
  clientInfo,
  analysis,
  holdings,
  notes,
  onClientInfoChange,
  onLoadSample,
}: MobileSettingsSheetProps) {
  const { isAdvisor, setMode } = useAppMode();
  const toggleMode = () => setMode(isAdvisor ? 'consumer' : 'advisor');
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('account');

  const handleExport = async (type: 'full' | 'summary' | 'recommendations') => {
    try {
      await generatePDF(analysis, holdings, clientInfo, notes, type);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} report exported`);
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
    onOpenChange(false);
  };

  const handleLoadSampleAndClose = () => {
    onLoadSample();
    onOpenChange(false);
  };

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string): number | undefined => {
    if (!dateOfBirth) return undefined;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleDateOfBirthChange = (dateOfBirth: string) => {
    const age = calculateAge(dateOfBirth);
    onClientInfoChange({ 
      ...clientInfo, 
      meetingDate: dateOfBirth,
      currentAge: age 
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-lg">Settings</SheetTitle>
        </SheetHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="account" className="text-xs gap-1.5">
              <User size={14} />
              Account
            </TabsTrigger>
            <TabsTrigger value="export" className="text-xs gap-1.5">
              <FileDown size={14} />
              Export
            </TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs gap-1.5">
              <Settings size={14} />
              Advanced
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(85vh-180px)]">
            {/* Account Tab */}
            <TabsContent value="account" className="space-y-6 mt-0">
              {/* Profile Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Profile</h3>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Your Name</Label>
                    <Input
                      value={clientInfo.name}
                      onChange={(e) => onClientInfoChange({ ...clientInfo, name: e.target.value })}
                      placeholder="Enter your name"
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Date of Birth</Label>
                    <Input
                      type="date"
                      value={clientInfo.meetingDate}
                      onChange={(e) => handleDateOfBirthChange(e.target.value)}
                      className="h-12"
                    />
                    {clientInfo.currentAge && (
                      <p className="text-xs text-muted-foreground">
                        {clientInfo.currentAge} years old
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Risk Tolerance</Label>
                    <Select 
                      value={clientInfo.riskTolerance} 
                      onValueChange={(v) => onClientInfoChange({ ...clientInfo, riskTolerance: v as RiskTolerance })}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RISK_LEVELS.map(level => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Auth Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Authentication</h3>
                
                {user ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Signed in as</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{user.email}</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full h-12 justify-between"
                      onClick={handleSignOut}
                    >
                      <span className="flex items-center gap-2">
                        <LogOut size={16} />
                        Sign Out
                      </span>
                      <ChevronRight size={16} className="text-muted-foreground" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full h-12 justify-between"
                    onClick={() => { navigate('/auth'); onOpenChange(false); }}
                  >
                    <span className="flex items-center gap-2">
                      <User size={16} />
                      Sign In
                    </span>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </Button>
                )}
              </div>
            </TabsContent>

            {/* Export Tab */}
            <TabsContent value="export" className="space-y-4 mt-0">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Export Reports</h3>
              
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full h-14 justify-between"
                  onClick={() => handleExport('full')}
                >
                  <div className="text-left">
                    <p className="font-medium">Full Report</p>
                    <p className="text-xs text-muted-foreground">Complete analysis (2-3 pages)</p>
                  </div>
                  <FileDown size={18} />
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full h-14 justify-between"
                  onClick={() => handleExport('summary')}
                >
                  <div className="text-left">
                    <p className="font-medium">Executive Summary</p>
                    <p className="text-xs text-muted-foreground">Key highlights (1 page)</p>
                  </div>
                  <FileDown size={18} />
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full h-14 justify-between"
                  onClick={() => handleExport('recommendations')}
                >
                  <div className="text-left">
                    <p className="font-medium">Recommendations Only</p>
                    <p className="text-xs text-muted-foreground">Action items only</p>
                  </div>
                  <FileDown size={18} />
                </Button>
              </div>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-6 mt-0">
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">App Mode</h3>
                
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Advisor Mode</p>
                    <p className="text-xs text-muted-foreground">
                      {isAdvisor ? 'Professional advisory features enabled' : 'Personal analysis mode'}
                    </p>
                  </div>
                  <Switch checked={isAdvisor} onCheckedChange={toggleMode} />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Demo Data</h3>
                
                <Button 
                  variant="outline" 
                  className="w-full h-12 justify-between"
                  onClick={handleLoadSampleAndClose}
                >
                  <span className="flex items-center gap-2">
                    <Database size={16} />
                    Load Sample Portfolio
                  </span>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Security</h3>
                
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Shield size={16} className="text-status-good" />
                    <span>Data encrypted & secure</span>
                  </div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
