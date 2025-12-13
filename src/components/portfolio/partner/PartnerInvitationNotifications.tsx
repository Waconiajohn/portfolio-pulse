import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Bell, Check, X, Users, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePartner, PartnerInvitation } from '@/hooks/usePartner';
import { formatDistanceToNow } from 'date-fns';

export function PartnerInvitationNotifications() {
  const { pendingInvitations, acceptInvitation, declineInvitation, loading } = usePartner();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const handleAccept = async (invitation: PartnerInvitation) => {
    setProcessingId(invitation.id);
    await acceptInvitation(invitation.id);
    setProcessingId(null);
  };

  const handleDecline = async (invitation: PartnerInvitation) => {
    setProcessingId(invitation.id);
    await declineInvitation(invitation.id);
    setProcessingId(null);
  };

  const count = pendingInvitations.length;

  if (loading) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-partner animate-pulse"
            >
              {count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b border-border">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-partner" />
            Partner Invitations
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {count > 0 ? `You have ${count} pending invitation${count > 1 ? 's' : ''}` : 'No pending invitations'}
          </p>
        </div>

        <div className="max-h-[300px] overflow-y-auto">
          {pendingInvitations.length === 0 ? (
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-muted mx-auto flex items-center justify-center mb-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No pending invitations
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pendingInvitations.map((invitation) => (
                <div key={invitation.id} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        Partner Invitation
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {invitation.relationshipType.replace('-', ' ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(invitation.createdAt), { addSuffix: true })}
                    </div>
                  </div>

                  {invitation.message && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                      "{invitation.message}"
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDecline(invitation)}
                      disabled={processingId === invitation.id}
                      className="flex-1 h-8 text-xs"
                    >
                      {processingId === invitation.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <X className="h-3 w-3 mr-1" />
                          Decline
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAccept(invitation)}
                      disabled={processingId === invitation.id}
                      className="flex-1 h-8 text-xs bg-partner hover:bg-partner/90"
                    >
                      {processingId === invitation.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Accept
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
