import { useMemo, useState } from 'react';
import { Shield, ChevronRight, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { CardContract } from '@/domain/cards/types';

interface TacticalEducationPanelProps {
  cards: CardContract[];
}

export function TacticalEducationPanel({ cards }: TacticalEducationPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const shouldShow = useMemo(() => {
    const concentrationCard = cards.find(c => c.id === 'riskDiversification');
    const downsideCard = cards.find(c => c.id === 'downsideResilience');
    
    const concentrationRed = concentrationCard?.status === 'RED';
    const downsideRed = downsideCard?.status === 'RED';
    
    return concentrationRed || downsideRed;
  }, [cards]);

  if (!shouldShow) return null;

  return (
    <Card className="border-border/50 bg-muted/20">
      <CardHeader className="pb-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between gap-2 text-left"
        >
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Ways some investors manage risk during uncertainty</CardTitle>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </button>
      </CardHeader>
      
      <div
        className={`grid transition-all duration-200 ease-out ${
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <CardContent className="space-y-3 pt-0">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Diversifying across different asset classes and sectors</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Reducing concentration in any single position</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Rebalancing periodically to maintain target allocations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Considering defensive positions during heightened volatility</span>
              </li>
            </ul>
            
            <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Learn how tactical approaches work
              </span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
