import { Recommendation } from '@/types/portfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DIAGNOSTIC_CATEGORIES } from '@/lib/constants';
import { Lightbulb, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
  onNavigateToCategory: (category: string) => void;
}

export function RecommendationsPanel({ recommendations, onNavigateToCategory }: RecommendationsPanelProps) {
  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb size={20} className="text-primary" />
            Priority Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Add holdings to generate personalized recommendations.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb size={20} className="text-primary" />
          Priority Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec, index) => {
          const category = DIAGNOSTIC_CATEGORIES[rec.category as keyof typeof DIAGNOSTIC_CATEGORIES];
          
          return (
            <div
              key={rec.id}
              className={cn(
                'p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors group',
                index === 0 && 'border-primary/30 bg-primary/5'
              )}
              onClick={() => onNavigateToCategory(rec.category)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-medium flex items-center justify-center">
                    {rec.priority}
                  </span>
                  <div className="min-w-0">
                    <h4 className="font-medium text-sm truncate">{rec.title}</h4>
                    <p className="text-xs text-muted-foreground truncate">{rec.description}</p>
                  </div>
                </div>
                <ArrowRight size={14} className="flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{category?.name}</span>
                <span className="font-medium text-status-good">{rec.impact}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
