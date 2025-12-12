// src/components/portfolio/SummaryCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Recommendation } from "@/types/portfolio";

type Props = {
  healthScore?: number;
  actionPlan: Recommendation[];
};

function priorityLabel(p: number) {
  if (p === 1) return "High";
  if (p === 2) return "High";
  if (p === 3) return "Medium";
  return "Low";
}

export default function SummaryCard({ healthScore, actionPlan }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Priority Action Plan</CardTitle>
          {typeof healthScore === "number" && (
            <Badge variant="secondary">Health Score: {Math.round(healthScore)}</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {actionPlan.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No critical actions detected right now. Review diagnostics below for optimization opportunities.
          </div>
        ) : (
          <ol className="space-y-2">
            {actionPlan.map((rec, idx) => (
              <li key={rec.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {idx + 1}. {rec.title}
                    </div>
                    {rec.description && (
                      <div className="mt-1 text-sm text-muted-foreground">{rec.description}</div>
                    )}
                    {rec.impact && (
                      <div className="mt-1 text-xs text-muted-foreground">Impact: {rec.impact}</div>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {priorityLabel(rec.priority)}
                  </Badge>
                </div>
              </li>
            ))}
          </ol>
        )}

        <div className="text-xs text-muted-foreground">
          This list is prioritized so you can focus on the highest-impact fixes first.
        </div>
      </CardContent>
    </Card>
  );
}
