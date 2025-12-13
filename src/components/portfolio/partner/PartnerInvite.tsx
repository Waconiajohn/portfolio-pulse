import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Heart, Users, UserPlus, Mail, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type RelationshipType = 'spouse' | 'partner' | 'financial-partner';

interface PartnerInviteProps {
  onInviteSent?: (email: string, type: RelationshipType) => void;
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

export function PartnerInvite({ onInviteSent, trigger }: PartnerInviteProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('spouse');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Implement actual invitation logic via Supabase
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      onInviteSent?.(email, relationshipType);
      setSuccess(true);
      toast.success('Invitation sent successfully!');
      
      // Reset and close after showing success
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setEmail('');
        setRelationshipType('spouse');
      }, 2000);
    } catch (error) {
      toast.error('Failed to send invitation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="partner-badge gap-2">
            <UserPlus className="h-4 w-4" />
            Invite Partner
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {success ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-status-good/20 flex items-center justify-center animate-scale-in">
              <CheckCircle2 className="h-8 w-8 text-status-good" />
            </div>
            <div className="space-y-2 animate-fade-in-up">
              <h3 className="text-xl font-semibold">Invitation Sent!</h3>
              <p className="text-sm text-muted-foreground">
                We've sent an email to <strong>{email}</strong> with instructions to join your financial journey.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="partner-avatar-ring p-0.5">
                  <div className="bg-background rounded-full p-1.5">
                    <Users className="h-5 w-5 text-partner" />
                  </div>
                </div>
                Invite Your Partner
              </DialogTitle>
              <DialogDescription>
                Manage your finances together. Your partner will be able to view and contribute to your household financial picture.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-6">
              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="partner-email">Partner's Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="partner-email"
                    type="email"
                    placeholder="partner@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
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

              {/* What they'll see */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-status-good" />
                  What your partner will see
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1 ml-6">
                  <li>• Combined household net worth</li>
                  <li>• Shared financial goals & progress</li>
                  <li>• Portfolio health diagnostics</li>
                  <li>• Retirement projections together</li>
                </ul>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !email}
                className="btn-premium bg-gradient-to-r from-partner to-[hsl(320,60%,55%)] hover:opacity-90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Invitation
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
