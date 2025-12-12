import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  Plus, 
  Search, 
  User, 
  ChevronRight, 
  Upload,
  MoreVertical,
  Trash2,
  Edit
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface Client {
  id: string;
  name: string;
  email?: string;
  riskTolerance: 'Conservative' | 'Moderate' | 'Aggressive';
  portfolioValue: number;
  lastReview?: Date;
  status: 'active' | 'pending' | 'archived';
}

// Mock clients for demo
const MOCK_CLIENTS: Client[] = [
  {
    id: '1',
    name: 'John & Sarah Smith',
    email: 'jsmith@email.com',
    riskTolerance: 'Moderate',
    portfolioValue: 1250000,
    lastReview: new Date('2024-01-15'),
    status: 'active',
  },
  {
    id: '2',
    name: 'Michael Johnson',
    email: 'mjohnson@email.com',
    riskTolerance: 'Aggressive',
    portfolioValue: 850000,
    lastReview: new Date('2024-02-01'),
    status: 'active',
  },
  {
    id: '3',
    name: 'Emily Davis',
    email: 'edavis@email.com',
    riskTolerance: 'Conservative',
    portfolioValue: 2100000,
    lastReview: new Date('2023-12-10'),
    status: 'pending',
  },
  {
    id: '4',
    name: 'Robert Williams',
    email: 'rwilliams@email.com',
    riskTolerance: 'Moderate',
    portfolioValue: 560000,
    status: 'active',
  },
];

interface ClientManagerProps {
  selectedClientId?: string;
  onSelectClient: (client: Client) => void;
  onAddClient?: () => void;
}

export function ClientManager({ 
  selectedClientId, 
  onSelectClient,
  onAddClient 
}: ClientManagerProps) {
  const [clients] = useState<Client[]>(MOCK_CLIENTS);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const getStatusBadge = (status: Client['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="text-green-500 border-green-500/50 text-[10px]">Active</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-amber-500 border-amber-500/50 text-[10px]">Pending</Badge>;
      case 'archived':
        return <Badge variant="outline" className="text-muted-foreground text-[10px]">Archived</Badge>;
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Client Portfolios
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              <Upload className="h-4 w-4 mr-1" />
              Import
            </Button>
            <Button size="sm" onClick={onAddClient} disabled>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>

        {/* Client List */}
        <ScrollArea className="h-[320px]">
          <div className="space-y-2">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                onClick={() => onSelectClient(client)}
                className={cn(
                  'p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent/50',
                  selectedClientId === client.id 
                    ? 'bg-accent border-primary/50' 
                    : 'bg-muted/20 border-border/30'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{client.name}</span>
                        {getStatusBadge(client.status)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {client.riskTolerance} • Last review: {formatDate(client.lastReview)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="font-mono font-semibold text-sm">
                        {formatCurrency(client.portfolioValue)}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Client
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Summary */}
        <div className="pt-3 border-t border-border/50 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xs text-muted-foreground">Total Clients</div>
            <div className="font-semibold">{clients.length}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total AUM</div>
            <div className="font-mono font-semibold">
              {formatCurrency(clients.reduce((sum, c) => sum + c.portfolioValue, 0))}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Active</div>
            <div className="font-semibold text-green-500">
              {clients.filter(c => c.status === 'active').length}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
