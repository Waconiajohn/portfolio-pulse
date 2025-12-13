import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Heart, Users, UserPlus, Settings, Trash2, Loader2, Calendar, UserMinus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePartner, Partner } from '@/hooks/usePartner';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type RelationshipType = 'spouse' | 'partner' | 'financial-partner';

interface PartnerSettingsPanelProps {
  trigger?: React.ReactNode;
}

const relationshipOptions = [
  {
    value: 'spouse' as const,
    label: 'Spouse',
    description: 'Married partner with shared finances',
    icon: Heart,
  },
  {
    value: 'partner' as const,
    label: 'Partner',
    description: 'Domestic or life partner',
    icon: Users,
  },
  {
    value: 'financial-partner' as const,
    label: 'Financial Planning Partner',
    description: 'Family member or advisor',
    icon: UserPlus,
  },
];

export function PartnerSettingsPanel({ trigger }: PartnerSettingsPanelProps) {
  const { partner, removePartner, loading } = usePartner();
  const [open, setOpen] = useState(false);
  const [relationshipType, setRelationshipType] = useState<RelationshipType>(
    partner?.relationshipType || 'partner'
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  if (!partner) return null;

  const handleUpdateRelationship = async () => {
    if (relationshipType === partner.relationshipType) {
      toast.info('No changes to save');
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('partner_links')
        .update({ relationship_type: relationshipType })
        .or(`user_id.eq.${partner.id},partner_id.eq.${partner.id}`);

      if (error) throw error;

      toast.success('Relationship type updated');
      setOpen(false);
    } catch (error: any) {
      console.error('Error updating relationship:', error);
      toast.error(error.message || 'Failed to update relationship');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemovePartner = async () => {
    setIsRemoving(true);
    await removePartner();
    setIsRemoving(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-1.5">
            <Settings className="h-4 w-4" />
            Partner Settings
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-partner/10">
              <Users className="h-5 w-5 text-partner" />
            </div>
            Partner Settings
          </DialogTitle>
          <DialogDescription>
            Manage your financial partnership with {partner.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Partner Info Card */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-partner/20 flex items-center justify-center">
                <span className="text-lg font-semibold text-partner">
                  {partner.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{partner.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {partner.relationshipType.replace('-', ' ')}
                </p>
              </div>
            </div>
          </div>

          {/* Relationship Type */}
          <div className="space-y-3">
            <Label>Relationship Type</Label>
            <RadioGroup
              value={relationshipType}
              onValueChange={(value) => setRelationshipType(value as RelationshipType)}
              className="space-y-2"
            >
              {relationshipOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                      relationshipType === option.value
                        ? 'border-partner bg-partner/5'
                        : 'border-border hover:border-border/80 hover:bg-muted/30'
                    )}
                  >
                    <RadioGroupItem value={option.value} className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className={cn(
                          'h-4 w-4',
                          relationshipType === option.value ? 'text-partner' : 'text-muted-foreground'
                        )} />
                        <span className="font-medium text-sm">{option.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {option.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          </div>

          {/* Danger Zone */}
          <div className="pt-4 border-t border-border">
            <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 space-y-3">
              <div className="flex items-center gap-2 text-destructive">
                <UserMinus className="h-4 w-4" />
                <span className="text-sm font-medium">Remove Partnership</span>
              </div>
              <p className="text-xs text-muted-foreground">
                This will disconnect your accounts. You'll no longer see combined household data.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove {partner.name}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove Partner Connection?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently disconnect your financial accounts from {partner.name}. 
                      You'll no longer see household data together. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRemovePartner}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={isRemoving}
                    >
                      {isRemoving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Remove Partner'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateRelationship}
            disabled={isUpdating || relationshipType === partner.relationshipType}
            className="bg-partner hover:bg-partner/90"
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
