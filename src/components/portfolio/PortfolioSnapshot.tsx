import { DollarSign, Building2, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export type PortfolioSnapshotProps = {
  totalValue: number;
  accountCount: number;
  issuesCount: number; // count of cards with RED or YELLOW status
};

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export function PortfolioSnapshot({ totalValue, accountCount, issuesCount }: PortfolioSnapshotProps) {
  return (
    <Card className="bg-muted/30 border-border/50">
      <CardContent className="py-3 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Metrics row */}
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Total Investments</p>
                <p className="text-sm font-semibold">{formatCurrency(totalValue)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Accounts</p>
                <p className="text-sm font-semibold">{accountCount}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${issuesCount > 0 ? 'text-status-warning' : 'text-status-good'}`} />
              <div>
                <p className="text-xs text-muted-foreground">Needs Attention</p>
                <p className={`text-sm font-semibold ${issuesCount > 0 ? 'text-status-warning' : 'text-status-good'}`}>
                  {issuesCount}
                </p>
              </div>
            </div>
          </div>
          
          {/* Helper text */}
          <p className="text-xs text-muted-foreground max-w-md">
            This view combines all of your accounts to identify the biggest risks and opportunities across your entire portfolio.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
