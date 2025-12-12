import { useState, forwardRef, useImperativeHandle } from "react";
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

export interface ActionPlanPanelRef {
  expand: () => void;
  toggle: () => void;
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

// Map category to verb-first action title
function getVerbTitle(rec: Recommendation): string {
  const verbMap: Record<string, string> = {
    riskDiversification: "Reduce concentration risk",
    downsideResilience: "Strengthen downside protection",
    performanceOptimization: "Optimize portfolio performance",
    costAnalysis: "Cut investment fees",
    taxEfficiency: "Improve tax efficiency",
    riskAdjusted: "Boost risk-adjusted returns",
    planningGaps: "Complete planning checklist",
    lifetimeIncomeSecurity: "Secure retirement income",
    performanceMetrics: "Review performance metrics",
  };
  
  // If the original title already starts with a verb, use it
  const firstWord = rec.title.split(' ')[0]?.toLowerCase() || '';
  const actionVerbs = ['reduce', 'cut', 'improve', 'boost', 'fix', 'add', 'review', 'secure', 'complete', 'optimize', 'strengthen', 'diversify', 'rebalance', 'consider'];
  
  if (actionVerbs.includes(firstWord)) {
    return rec.title;
  }
  
  return verbMap[rec.category] || `Address ${rec.title.toLowerCase()}`;
}

// Map category to "why this matters" text
function getWhyItMatters(rec: Recommendation): string {
  const whyMap: Record<string, string> = {
    riskDiversification: "One bad investment shouldn't derail your plan",
    downsideResilience: "Protect yourself from market surprises",
    performanceOptimization: "Make your money work harder",
    costAnalysis: "Fees eat into your returns over time",
    taxEfficiency: "Keep more of what you earn",
    riskAdjusted: "Get better returns for the risk you take",
    planningGaps: "Small gaps can become big problems",
    lifetimeIncomeSecurity: "Never worry about outliving your money",
    performanceMetrics: "Know how your portfolio is really doing",
  };
  
  // Use impact if available, otherwise use mapped text
  if (rec.impact) {
    return rec.impact;
  }
  
  return whyMap[rec.category] || "This can improve your financial position";
}

export const ActionPlanPanel = forwardRef<ActionPlanPanelRef, ActionPlanPanelProps>(
  function ActionPlanPanel({ actionPlan, onSelectCategory }, ref) {
  const [isExpanded, setIsExpanded] = useState(false);

  useImperativeHandle(ref, () => ({
    expand: () => setIsExpanded(true),
    toggle: () => setIsExpanded(prev => !prev),
  }));

  if (actionPlan.length === 0) {
    return null;
  }

  // Group actions
  const fixFirst = actionPlan.filter(r => r.priority <= 2);
  const optimizeNext = actionPlan.filter(r => r.priority > 2);

  return (
    <Card className="border-border/50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left"
      >
        <CardContent className="p-3 sm:p-4">
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
                    {fixFirst.length > 0 
                      ? `${fixFirst.length} high priority item${fixFirst.length > 1 ? 's' : ''} to address`
                      : "Optimization opportunities available"
                    }
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
            <CardContent className="pt-0 px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
              <Separator />
              
              {/* Intro note */}
              <p className="text-xs text-muted-foreground">
                Start with High priority items. Small changes can reduce risk quickly.
              </p>

              {/* Fix First Section */}
              {fixFirst.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Fix First
                  </h4>
                  <div className="space-y-1.5">
                    {fixFirst.map((rec) => (
                      <ActionItem
                        key={rec.id}
                        recommendation={rec}
                        onSelectCategory={onSelectCategory}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Optimize Next Section */}
              {optimizeNext.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Optimize Next
                  </h4>
                  <div className="space-y-1.5">
                    {optimizeNext.map((rec) => (
                      <ActionItem
                        key={rec.id}
                        recommendation={rec}
                        onSelectCategory={onSelectCategory}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Collapse button */}
              <button
                onClick={() => setIsExpanded(false)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto pt-1"
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
});

interface ActionItemProps {
  recommendation: Recommendation;
  onSelectCategory?: (categoryKey: string) => void;
}

function ActionItem({ recommendation, onSelectCategory }: ActionItemProps) {
  const verbTitle = getVerbTitle(recommendation);
  const whyItMatters = getWhyItMatters(recommendation);

  return (
    <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/30">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge variant={priorityVariant(recommendation.priority)} className="text-[10px] px-1.5 py-0 shrink-0">
            {priorityLabel(recommendation.priority)}
          </Badge>
          <span className="text-sm font-medium truncate">{verbTitle}</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate pl-[calc(theme(spacing.1.5)+theme(spacing.2)+2ch)]">
          {whyItMatters}
        </p>
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
