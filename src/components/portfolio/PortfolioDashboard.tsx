import { useState, useMemo, useCallback } from 'react';
import { Holding, ClientInfo, PlanningChecklist, PortfolioAnalysis } from '@/types/portfolio';
import { analyzePortfolio } from '@/lib/analysis-engine';
import { DIAGNOSTIC_CATEGORIES } from '@/lib/constants';
import { Header } from './Header';
import { HoldingsTable } from './HoldingsTable';
import { DiagnosticCard } from './DiagnosticCard';
import { RecommendationsPanel } from './RecommendationsPanel';
import { DetailView } from './DetailView';
import { PlanningChecklistCard } from './PlanningChecklist';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LayoutGrid, Table, FileText } from 'lucide-react';
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

  const analysis: PortfolioAnalysis = useMemo(() => {
    return analyzePortfolio(holdings, clientInfo, checklist);
  }, [holdings, clientInfo, checklist]);

  const handleExport = useCallback(() => {
    // Create a simple export for now
    const content = `
PORTFOLIO DIAGNOSTIC REPORT
===========================
Client: ${clientInfo.name || 'N/A'}
Date: ${clientInfo.meetingDate}
Risk Tolerance: ${clientInfo.riskTolerance}

SUMMARY
-------
Health Score: ${analysis.healthScore}/100
Portfolio Value: $${analysis.totalValue.toLocaleString()}
Expected Return: ${(analysis.expectedReturn * 100).toFixed(1)}%
Volatility: ${(analysis.volatility * 100).toFixed(1)}%
Sharpe Ratio: ${analysis.sharpeRatio.toFixed(2)}
Annual Fees: $${analysis.totalFees.toLocaleString()}

RECOMMENDATIONS
---------------
${analysis.recommendations.map((r, i) => `${i + 1}. ${r.title}\n   ${r.description}\n   Impact: ${r.impact}`).join('\n\n')}

NOTES
-----
${notes || 'No additional notes.'}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-diagnostic-${clientInfo.name || 'report'}-${clientInfo.meetingDate}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Report exported successfully');
  }, [clientInfo, analysis, notes]);

  const diagnosticEntries = Object.entries(DIAGNOSTIC_CATEGORIES) as Array<[keyof typeof DIAGNOSTIC_CATEGORIES, typeof DIAGNOSTIC_CATEGORIES[keyof typeof DIAGNOSTIC_CATEGORIES]]>;

  return (
    <div className="min-h-screen bg-background">
      <Header
        clientInfo={clientInfo}
        analysis={analysis}
        onClientInfoChange={setClientInfo}
        onExport={handleExport}
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
