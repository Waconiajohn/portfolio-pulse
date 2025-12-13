import { useMemo } from 'react';
import { ChevronRight, Lightbulb, Shield, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { CardContract } from '@/domain/cards/types';

interface InsightsFeedProps {
  cards: CardContract[];
  onViewCard: (cardId: string) => void;
}

interface Insight {
  id: string;
  message: string;
  cardId: string;
  priority: number;
}

export function InsightsFeed({ cards, onViewCard }: InsightsFeedProps) {
  const insights = useMemo(() => {
    const result: Insight[] = [];
    
    cards.forEach(card => {
      if (card.status === 'GREEN') return;
      
      let message = '';
      const priority = card.status === 'RED' ? 1 : 2;
      
      switch (card.id) {
        case 'riskDiversification':
          message = 'Consider diversifying — your portfolio is concentrated in a few investments';
          break;
        case 'costAnalysis':
          message = 'Review fees — they may be reducing your long-term growth';
          break;
        case 'downsideResilience':
          message = 'Strengthen downside protection — vulnerability detected in market stress';
          break;
        case 'taxEfficiency':
          message = 'Explore tax savings — opportunities may exist to reduce your burden';
          break;
        case 'riskAdjusted':
          message = 'Reassess risk level — it may not match your expected returns';
          break;
        case 'planningGaps':
          message = 'Address planning basics — some important items need attention';
          break;
        case 'lifetimeIncomeSecurity':
          message = 'Shore up income security — your retirement stream could be stronger';
          break;
        case 'crossAccountConcentration':
          message = 'Check for overlap — hidden concentration exists across accounts';
          break;
        case 'performanceOptimization':
          message = 'Optimize returns — they may not be matching expectations for your risk';
          break;
        default:
          return;
      }
      
      result.push({
        id: card.id,
        message,
        cardId: card.id,
        priority,
      });
    });
    
    return result
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3);
  }, [cards]);

  if (insights.length === 0) return null;

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-primary">Key Takeaways</span>
        </div>
        <div className="space-y-2">
          {insights.map(insight => (
            <button
              key={insight.id}
              onClick={() => onViewCard(insight.cardId)}
              className="w-full flex items-center justify-between gap-2 p-2 rounded-md hover:bg-primary/10 transition-colors text-left group"
            >
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                {insight.message}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
            </button>
          ))}
        </div>
        
        {/* Trust note */}
        <div className="mt-3 pt-3 border-t border-primary/10 flex items-center gap-2">
          <Lock className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Your data is encrypted and secure</span>
        </div>
      </CardContent>
    </Card>
  );
}
