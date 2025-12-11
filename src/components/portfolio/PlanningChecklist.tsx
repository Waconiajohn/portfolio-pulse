import { PlanningChecklist as PlanningChecklistType, PlanningPriority } from '@/types/portfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanningChecklistProps {
  checklist: PlanningChecklistType;
  onUpdate: (checklist: PlanningChecklistType) => void;
}

interface ChecklistItemConfig {
  key: keyof PlanningChecklistType;
  label: string;
  description: string;
  priority: PlanningPriority;
  critical: boolean;
}

const CHECKLIST_ITEMS: ChecklistItemConfig[] = [
  // ASAP Priority (Critical)
  { key: 'willTrust', label: 'Will/Trust', description: 'Estate planning documents in place', priority: 'ASAP', critical: true },
  { key: 'healthcareDirectives', label: 'Healthcare Directives', description: 'Advance directives and living will', priority: 'ASAP', critical: true },
  { key: 'poaDirectives', label: 'Power of Attorney', description: 'Financial and durable POA documents', priority: 'ASAP', critical: true },
  { key: 'emergencyFund', label: 'Emergency Fund', description: '3-6 months expenses in liquid savings', priority: 'ASAP', critical: true },
  // Soon Priority
  { key: 'beneficiaryReview', label: 'Beneficiary Review', description: 'All accounts have correct beneficiaries', priority: 'Soon', critical: false },
  { key: 'executorDesignation', label: 'Executor Designation', description: 'Named executor for estate administration', priority: 'Soon', critical: false },
  { key: 'guardianDesignation', label: 'Guardian Designation', description: 'Guardians named for minor dependents', priority: 'Soon', critical: false },
  { key: 'withdrawalStrategy', label: 'Withdrawal Strategy', description: 'Retirement income plan documented', priority: 'Soon', critical: false },
  // Routine Priority
  { key: 'insuranceCoverage', label: 'Insurance Review', description: 'Life, disability, and LTC coverage reviewed', priority: 'Routine', critical: false },
  { key: 'digitalAssetPlan', label: 'Digital Asset Plan', description: 'Plan for digital accounts and cryptocurrencies', priority: 'Routine', critical: false },
  { key: 'investmentPolicyStatement', label: 'Investment Policy Statement', description: 'Written IPS documenting strategy and goals', priority: 'Routine', critical: false },
];

const PRIORITY_CONFIG: Record<PlanningPriority, { label: string; className: string }> = {
  'ASAP': { label: 'ASAP', className: 'bg-status-critical/20 text-status-critical border-status-critical/30' },
  'Soon': { label: 'Soon', className: 'bg-status-warning/20 text-status-warning border-status-warning/30' },
  'Routine': { label: 'Routine', className: 'bg-muted text-muted-foreground border-border' },
};

export function PlanningChecklistCard({ checklist, onUpdate }: PlanningChecklistProps) {
  const completed = Object.values(checklist).filter(Boolean).length;
  const total = CHECKLIST_ITEMS.length;
  const progress = (completed / total) * 100;
  
  const criticalMissing = CHECKLIST_ITEMS.filter(item => item.critical && !checklist[item.key]).length;

  const handleToggle = (key: keyof PlanningChecklistType) => {
    onUpdate({ ...checklist, [key]: !checklist[key] });
  };

  // Group items by priority
  const groupedItems = {
    'ASAP': CHECKLIST_ITEMS.filter(item => item.priority === 'ASAP'),
    'Soon': CHECKLIST_ITEMS.filter(item => item.priority === 'Soon'),
    'Routine': CHECKLIST_ITEMS.filter(item => item.priority === 'Routine'),
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardCheck size={20} className="text-primary" />
            Planning Checklist
          </CardTitle>
          <div className="flex items-center gap-2">
            {criticalMissing > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalMissing} critical
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {completed}/{total}
            </span>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        {(['ASAP', 'Soon', 'Routine'] as PlanningPriority[]).map(priority => {
          const items = groupedItems[priority];
          const priorityConfig = PRIORITY_CONFIG[priority];
          
          return (
            <div key={priority} className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn('text-xs', priorityConfig.className)}>
                  {priorityConfig.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {items.filter(item => checklist[item.key]).length}/{items.length}
                </span>
              </div>
              <div className="space-y-1 pl-1">
                {items.map(item => (
                  <div
                    key={item.key}
                    className={cn(
                      'flex items-start gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors',
                      checklist[item.key] && 'opacity-60'
                    )}
                    onClick={() => handleToggle(item.key)}
                  >
                    <Checkbox
                      checked={checklist[item.key]}
                      onCheckedChange={() => handleToggle(item.key)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        'font-medium text-sm',
                        checklist[item.key] && 'line-through'
                      )}>
                        {item.label}
                      </div>
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                    </div>
                    {item.critical && !checklist[item.key] && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        Critical
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
