import { HelpCircle } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { 
  EducationContent, 
  ScoringConfig, 
  DEFAULT_SCORING_CONFIG, 
  getEducationContent 
} from '@/lib/scoring-config';
import { RiskTolerance } from '@/types/portfolio';

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
  const educationContent = getEducationContent(scoringConfig, riskTolerance);
  const content: EducationContent | undefined = educationContent[categoryKey];

  if (!content) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-5 w-5 text-muted-foreground hover:text-foreground ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          <HelpCircle size={14} />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-4 space-y-3" 
        side="right" 
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="font-semibold text-sm text-foreground">{content.title}</h4>
        
        <div className="space-y-2 text-xs">
          <div>
            <span className="font-medium text-muted-foreground">What this measures:</span>
            <p className="text-foreground mt-0.5">{content.whatItMeasures}</p>
          </div>
          
          <div>
            <span className="font-medium text-muted-foreground">Good vs Bad:</span>
            <p className="text-foreground mt-0.5 whitespace-pre-line">{content.goodVsBad}</p>
          </div>
          
          <div>
            <span className="font-medium text-muted-foreground">Interpretation:</span>
            <p className="text-foreground mt-0.5">{content.interpretation}</p>
          </div>

          {content.riskToleranceNote && (
            <div className="pt-2 border-t border-border">
              <span className="font-medium text-primary">Your Profile:</span>
              <p className="text-foreground mt-0.5">{content.riskToleranceNote}</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
