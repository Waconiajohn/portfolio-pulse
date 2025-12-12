import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp, ListTodo, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Recommendation } from "@/types/portfolio";

interface ActionPlanPanelProps {
  actionPlan: Recommendation[];
  onSelectCategory?: (categoryKey: string) => void;
}

function priorityVariant(p: number): "destructive" | "secondary" | "outline" {
  if (p <= 2) return "destructive";
  if (p === 3) return "secondary";
  return "outline";
}

function priorityLabel(p: number): string {
  if (p <= 2) return "High";
  if (p === 3) return "Medium";
  return "Low";
}

export function ActionPlanPanel({ actionPlan, onSelectCategory }: ActionPlanPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (actionPlan.length === 0) {
    return null;
  }

  // Group actions
  const fixFirst = actionPlan.filter(r => r.priority <= 2);
  const optimizeNext = actionPlan.filter(r => r.priority > 2);

  // Generate summary sentence
  const generateSummary = () => {
    if (fixFirst.length === 0) {
      return "Your portfolio is in good shape. Consider these optimization opportunities.";
    }
    const topAction = fixFirst[0];
    const categoryLabels: Record<string, string> = {
      riskDiversification: "reducing concentration risk",
      downsideResilience: "improving downside protection",
      performanceOptimization: "optimizing performance",
      costAnalysis: "reducing fees",
      taxEfficiency: "harvesting tax losses",
      riskAdjusted: "improving risk-adjusted returns",
      planningGaps: "addressing planning gaps",
      lifetimeIncomeSecurity: "securing retirement income",
      performanceMetrics: "tracking performance",
    };
    const topLabel = categoryLabels[topAction.category] || topAction.title.toLowerCase();
    
    if (fixFirst.length === 1) {
      return `Your top opportunity is ${topLabel}.`;
    }
    const secondLabel = fixFirst[1] ? categoryLabels[fixFirst[1].category] || fixFirst[1].title.toLowerCase() : "";
    return `Your top opportunity is ${topLabel}, then ${secondLabel}.`;
  };

  return (
    <Card className="border-border/50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left"
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <ListTodo className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">Action Plan</span>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    {actionPlan.length}
                  </Badge>
                </div>
                {!isExpanded && (
                  <p className="text-xs text-muted-foreground truncate">
                    Prioritized next steps based on your diagnostics
                  </p>
                )}
              </div>
            </div>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0"
            >
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          </div>
        </CardContent>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <CardContent className="pt-0 px-4 pb-4 space-y-4">
              <Separator />
              
              {/* Summary */}
              <p className="text-sm text-muted-foreground">
                {generateSummary()}
              </p>

              {/* Fix First Section */}
              {fixFirst.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Fix First
                  </h4>
                  <div className="space-y-2">
                    {fixFirst.map((rec, idx) => (
                      <ActionItem
                        key={rec.id}
                        recommendation={rec}
                        index={idx + 1}
                        onSelectCategory={onSelectCategory}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Optimize Next Section */}
              {optimizeNext.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Optimize Next
                  </h4>
                  <div className="space-y-2">
                    {optimizeNext.map((rec, idx) => (
                      <ActionItem
                        key={rec.id}
                        recommendation={rec}
                        index={fixFirst.length + idx + 1}
                        onSelectCategory={onSelectCategory}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Collapse button */}
              <button
                onClick={() => setIsExpanded(false)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto pt-2"
              >
                <ChevronUp className="h-3 w-3" />
                Collapse
              </button>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

interface ActionItemProps {
  recommendation: Recommendation;
  index: number;
  onSelectCategory?: (categoryKey: string) => void;
}

function ActionItem({ recommendation, index, onSelectCategory }: ActionItemProps) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={priorityVariant(recommendation.priority)} className="text-[10px] px-1.5 py-0">
            {priorityLabel(recommendation.priority)}
          </Badge>
          <span className="text-sm font-medium truncate">{recommendation.title}</span>
        </div>
        {recommendation.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {recommendation.description}
          </p>
        )}
        {recommendation.impact && (
          <p className="text-[10px] text-muted-foreground/80 mt-0.5">
            Impact: {recommendation.impact}
          </p>
        )}
      </div>
      {recommendation.category && onSelectCategory && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 h-7 px-2 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onSelectCategory(recommendation.category);
          }}
        >
          View
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      )}
    </div>
  );
}
