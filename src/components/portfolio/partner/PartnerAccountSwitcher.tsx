import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Users, UserPlus, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PartnerInvite } from './PartnerInvite';

type ViewMode = 'individual' | 'partner' | 'household';

interface Partner {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  relationshipType: 'spouse' | 'partner' | 'financial-partner';
}

interface PartnerAccountSwitcherProps {
  currentUser: {
    name: string;
    avatarUrl?: string;
  };
  partner?: Partner | null;
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  className?: string;
}

const viewOptions = [
  {
    value: 'individual' as const,
    label: 'Just Me',
    description: 'View only your accounts',
    icon: User,
  },
  {
    value: 'partner' as const,
    label: 'Partner',
    description: "View partner's accounts",
    icon: User,
  },
  {
    value: 'household' as const,
    label: 'Together',
    description: 'Combined household view',
    icon: Users,
  },
];

export function PartnerAccountSwitcher({
  currentUser,
  partner,
  currentView,
  onViewChange,
  className,
}: PartnerAccountSwitcherProps) {
  const [inviteOpen, setInviteOpen] = useState(false);

  const currentOption = viewOptions.find(opt => opt.value === currentView);
  const Icon = currentOption?.icon || User;

  // If no partner, show invite button
  if (!partner) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Avatar className="h-8 w-8">
          <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
          <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <PartnerInvite
          trigger={
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Invite Partner</span>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={cn('gap-2 h-auto py-1.5', className)}>
          <div className="flex items-center -space-x-2">
            <Avatar className="h-7 w-7 border-2 border-background">
              <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
              <AvatarFallback className="text-xs">{currentUser.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="partner-avatar-ring">
              <Avatar className="h-7 w-7 border-2 border-background">
                <AvatarImage src={partner.avatarUrl} alt={partner.name} />
                <AvatarFallback className="text-xs bg-partner/20">{partner.name.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xs font-medium">
              {currentView === 'individual' && currentUser.name}
              {currentView === 'partner' && partner.name}
              {currentView === 'household' && 'Household'}
            </span>
            <span className="text-[10px] text-muted-foreground capitalize">
              {currentOption?.label}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-partner" />
            <span className="text-sm">Viewing as</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {viewOptions.map((option) => {
          // Hide partner view option if we want to simplify
          if (option.value === 'partner') return null;
          
          const OptionIcon = option.icon;
          const isSelected = currentView === option.value;
          
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onViewChange(option.value)}
              className={cn(
                'flex items-center gap-3 cursor-pointer',
                isSelected && 'bg-accent'
              )}
            >
              <div className={cn(
                'p-1.5 rounded-lg',
                isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              )}>
                <OptionIcon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{option.label}</span>
                  {isSelected && <Check className="h-3 w-3 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />
        
        {/* Quick stats for household */}
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Combined Net Worth</span>
            <span className="font-mono font-medium">$2.4M</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Household Health</span>
            <span className="font-medium text-status-good">85/100</span>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Simplified toggle for mobile
export function PartnerViewToggle({
  hasPartner,
  currentView,
  onViewChange,
}: Pick<PartnerAccountSwitcherProps, 'currentView' | 'onViewChange'> & { hasPartner: boolean }) {
  if (!hasPartner) return null;

  return (
    <div className="inline-flex rounded-xl bg-muted p-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange('individual')}
        className={cn(
          'rounded-lg px-3 py-1.5 text-xs',
          currentView === 'individual' && 'bg-background shadow-sm'
        )}
      >
        <User className="h-3.5 w-3.5 mr-1" />
        Me
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange('household')}
        className={cn(
          'rounded-lg px-3 py-1.5 text-xs',
          currentView === 'household' && 'bg-background shadow-sm'
        )}
      >
        <Users className="h-3.5 w-3.5 mr-1" />
        Us
      </Button>
    </div>
  );
}
