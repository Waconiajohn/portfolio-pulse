import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, RefreshCw, Plus, CheckCircle2, AlertCircle, Loader2, Link2Off } from 'lucide-react';
import { useAppMode } from '@/contexts/AppModeContext';
import { useAuth } from '@/hooks/useAuth';
import { usePlaid } from '@/hooks/usePlaid';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface LinkedAccountsPanelProps {
  onRefresh?: () => void;
  onHoldingsSync?: () => void;
  compact?: boolean;
}

export function LinkedAccountsPanel({ onRefresh, onHoldingsSync, compact = false }: LinkedAccountsPanelProps) {
  const { mode } = useAppMode();
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    status,
    linkedAccounts,
    accountsLoading,
    initializePlaidLink,
    fetchLinkedAccounts,
    syncHoldings,
    syncAccounts,
    unlinkAccount,
  } = usePlaid();

  const [syncing, setSyncing] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  // Fetch linked accounts when component mounts
  useEffect(() => {
    if (user) {
      fetchLinkedAccounts();
    }
  }, [user, fetchLinkedAccounts]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(dateStr));
  };

  const handleLinkAccount = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Initialize Plaid Link
    const linkToken = await initializePlaidLink();
    
    if (!linkToken) {
      // Plaid not configured - show message
      return;
    }

    // In a real implementation, you'd use @plaid/link-react here
    // For now, we show a message about the configuration
    console.log('Plaid Link token:', linkToken);
  };

  const handleSync = async () => {
    setSyncing(true);
    await syncAccounts();
    const data = await syncHoldings();
    if (data && onHoldingsSync) {
      onHoldingsSync();
    }
    if (onRefresh) {
      onRefresh();
    }
    setSyncing(false);
  };

  const handleUnlink = async (accountId: string) => {
    setUnlinkingId(accountId);
    await unlinkAccount(accountId);
    setUnlinkingId(null);
  };

  const getSyncStatusIcon = (syncStatus: string | null) => {
    switch (syncStatus) {
      case 'synced':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      default:
        return <Loader2 className="h-3 w-3 text-muted-foreground animate-spin" />;
    }
  };

  // Not authenticated
  if (!user) {
    if (compact) {
      return (
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Linked Accounts</span>
              </div>
              <Button size="sm" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Linked Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-4">
              Sign in to link your investment accounts and get personalized analysis.
            </p>
            <Button onClick={() => navigate('/auth')}>
              Sign In to Link Accounts
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Plaid not configured
  if (!status.configured && !status.loading) {
    if (compact) {
      return (
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Account linking not configured</span>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Linked Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              Account linking is not yet configured.
            </p>
            <p className="text-xs text-muted-foreground">
              You can still manually enter your holdings below.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Compact mobile layout
  if (compact) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-3">
          {/* Header row */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Accounts</span>
              {linkedAccounts.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {linkedAccounts.length}
                </Badge>
              )}
            </div>
            <div className="flex gap-1.5">
              {linkedAccounts.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={handleSync}
                  disabled={syncing}
                >
                  {syncing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleLinkAccount}
                disabled={status.loading}
              >
                {status.loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                <span className="ml-1">Link</span>
              </Button>
            </div>
          </div>

          {/* Accounts - horizontal scroll */}
          {accountsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : linkedAccounts.length === 0 ? (
            <div className="flex items-center gap-3 py-2 text-muted-foreground">
              <Building2 className="h-8 w-8 opacity-50" />
              <div>
                <p className="text-xs font-medium">No accounts linked</p>
                <p className="text-[10px] opacity-75">Tap Link to connect your brokerage</p>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {linkedAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex-shrink-0 flex items-center gap-2 px-2.5 py-2 rounded-lg bg-muted/40 border border-border/30 min-w-[140px] max-w-[180px]"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-xs truncate">
                        {account.institution_name || 'Account'}
                      </span>
                      {getSyncStatusIcon(account.sync_status)}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {account.account_name || account.account_type || ''}
                      {account.account_mask && ` ••${account.account_mask}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full desktop layout
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Linked Accounts
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing || linkedAccounts.length === 0}
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Sync
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLinkAccount}
              disabled={status.loading}
            >
              {status.loading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
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
        {accountsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : linkedAccounts.length === 0 ? (
          <div className="text-center py-6">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              No accounts linked yet.
            </p>
            <p className="text-xs text-muted-foreground">
              Link your brokerage accounts to automatically import holdings.
            </p>
          </div>
        ) : (
          <>
            {linkedAccounts.map((account) => (
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
                      <span className="font-medium text-sm">
                        {account.account_name || account.institution_name || 'Account'}
                      </span>
                      {account.account_type && (
                        <Badge variant="outline" className="text-xs">
                          {account.account_type}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{account.institution_name}</span>
                      {account.account_mask && (
                        <>
                          <span>•</span>
                          <span>****{account.account_mask}</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        {getSyncStatusIcon(account.sync_status)}
                        {account.sync_status === 'synced' ? 'Synced' : account.sync_status === 'error' ? 'Error' : 'Pending'}
                        {account.last_sync_at && ` ${formatDate(account.last_sync_at)}`}
                      </span>
                    </div>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      disabled={unlinkingId === account.id}
                    >
                      {unlinkingId === account.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Link2Off className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Unlink Account</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to unlink {account.account_name || account.institution_name}?
                        This will remove the connection but won't delete your imported holdings.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleUnlink(account.id)}>
                        Unlink
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </>
        )}

        {mode === 'consumer' && linkedAccounts.length > 0 && (
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
