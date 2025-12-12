import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, RefreshCw, Plus, CheckCircle2 } from 'lucide-react';
import { MOCK_LINKED_ACCOUNTS, LinkedAccount } from '@/lib/mock-linked-accounts';
import { useAppMode } from '@/contexts/AppModeContext';

interface LinkedAccountsPanelProps {
  onRefresh?: () => void;
}

export function LinkedAccountsPanel({ onRefresh }: LinkedAccountsPanelProps) {
  const { mode } = useAppMode();
  const [accounts] = React.useState<LinkedAccount[]>(MOCK_LINKED_ACCOUNTS);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Linked Accounts
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Sync
            </Button>
            <Button variant="outline" size="sm" disabled>
              <Plus className="h-4 w-4 mr-1" />
              Link Account
            </Button>
          </div>
        </div>
        {mode === 'consumer' && (
          <p className="text-sm text-muted-foreground mt-1">
            Your accounts are securely connected. We never store your credentials.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{account.accountName}</span>
                  <Badge variant="outline" className="text-xs">
                    {account.accountType}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>{account.institution}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Synced {formatDate(account.lastSyncDate)}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{formatCurrency(account.balance)}</div>
            </div>
          </div>
        ))}

        <div className="pt-3 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Balance</span>
            <span className="text-lg font-bold">{formatCurrency(totalBalance)}</span>
          </div>
        </div>

        {mode === 'consumer' && (
          <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              💡 <strong>Tip:</strong> Link all your investment accounts to get a complete picture of your portfolio health.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
