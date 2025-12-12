import React from 'react';
import { HelpCircle, CheckCircle2, AlertTriangle, XCircle, Users, Lightbulb, TrendingUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  EducationContent, 
  ScoringConfig, 
  DEFAULT_SCORING_CONFIG, 
  getEducationContent 
} from '@/lib/scoring-config';
import { RiskTolerance } from '@/types/portfolio';
import { useAppMode } from '@/contexts/AppModeContext';
import { cn } from '@/lib/utils';

interface EducationPopupProps {
  categoryKey: string;
  className?: string;
  scoringConfig?: ScoringConfig;
  riskTolerance?: RiskTolerance;
}

export function EducationPopup({ 
  categoryKey, 
  className,
  scoringConfig = DEFAULT_SCORING_CONFIG,
  riskTolerance = 'Moderate'
}: EducationPopupProps) {
  const { isConsumer } = useAppMode();
  const educationContent = getEducationContent(scoringConfig, riskTolerance);
  const content: EducationContent | undefined = educationContent[categoryKey];

  if (!content) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-5 w-5 text-muted-foreground hover:text-foreground", className)}
          onClick={(e) => e.stopPropagation()}
        >
          <HelpCircle size={14} />
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="max-w-lg max-h-[85vh] p-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-b from-primary/5 to-transparent">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {content.title}
          </DialogTitle>
          {isConsumer && content.consumerBrief && (
            <p className="text-sm text-muted-foreground mt-1">
              {content.consumerBrief}
            </p>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="px-6 pb-6 space-y-5">
            {/* Consumer: Simple explanation first */}
            {isConsumer && content.consumerDetailed && (
              <Section icon={<Lightbulb className="h-4 w-4 text-primary" />} title="What Is This?">
                <p className="text-sm text-foreground leading-relaxed">
                  {content.consumerDetailed}
                </p>
              </Section>
            )}

            {/* Why It Matters */}
            {content.whyItMatters && (
              <Section icon={<TrendingUp className="h-4 w-4 text-amber-500" />} title="Why It Matters">
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm text-foreground">
                    💡 <strong>Real Example:</strong> {content.whyItMatters}
                  </p>
                </div>
              </Section>
            )}

            {/* Visual Good vs Bad Comparison */}
            <Section title="What's Good vs Bad?">
              <GoodVsBadComparison goodVsBad={content.goodVsBad} />
            </Section>

            {/* How to Improve */}
            {content.howToImprove && content.howToImprove.length > 0 && (
              <Section title="How to Improve">
                <ol className="space-y-2">
                  {content.howToImprove.map((step, idx) => (
                    <li key={idx} className="flex gap-3 text-sm">
                      <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold">
                        {idx + 1}
                      </span>
                      <span className="text-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </Section>
            )}

            {/* Peer Comparison */}
            {content.peerComparison && (
              <Section icon={<Users className="h-4 w-4 text-blue-500" />} title="How Do You Compare?">
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-sm text-foreground">
                    📊 {content.peerComparison}
                  </p>
                </div>
              </Section>
            )}

            {/* Risk Tolerance Note */}
            {content.riskToleranceNote && (
              <Section title="Your Risk Profile">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {riskTolerance}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground">{content.riskToleranceNote}</p>
                </div>
              </Section>
            )}

            {/* Technical Details (Advisor Mode or collapsed for Consumer) */}
            {!isConsumer && (
              <>
                <Separator />
                <Section title="Technical Details">
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="font-medium text-muted-foreground">Measurement:</span>
                      <p className="text-foreground mt-0.5">{content.whatItMeasures}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Interpretation:</span>
                      <p className="text-foreground mt-0.5">{content.interpretation}</p>
                    </div>
                  </div>
                </Section>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Helper component for sections
function Section({ 
  icon, 
  title, 
  children 
}: { 
  icon?: React.ReactNode; 
  title: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        {icon}
        {title}
      </h4>
      {children}
    </div>
  );
}

// Visual Good vs Bad comparison component
function GoodVsBadComparison({ goodVsBad }: { goodVsBad: string }) {
  // Parse the goodVsBad string to extract good/bad parts
  const parts = goodVsBad.split(/(?:GOOD:|BAD:|CAUTION:)/i).filter(Boolean);
  
  // Simple visual comparison
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-xs font-semibold text-green-600 dark:text-green-400">GOOD</span>
          <p className="text-sm text-foreground mt-0.5">
            {parts[0]?.trim() || 'Meeting all targets and thresholds'}
          </p>
        </div>
      </div>
      
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">WARNING</span>
          <p className="text-sm text-foreground mt-0.5">
            Approaching threshold limits - review recommended
          </p>
        </div>
      </div>
      
      <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
        <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-xs font-semibold text-red-600 dark:text-red-400">ACTION NEEDED</span>
          <p className="text-sm text-foreground mt-0.5">
            {parts[1]?.trim() || 'Exceeds recommended limits - changes needed'}
          </p>
        </div>
      </div>
    </div>
  );
}
