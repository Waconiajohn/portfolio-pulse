import { PlanningChecklist as PlanningChecklistType } from '@/types/portfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ClipboardCheck } from 'lucide-react';

interface PlanningChecklistProps {
  checklist: PlanningChecklistType;
  onUpdate: (checklist: PlanningChecklistType) => void;
}

const CHECKLIST_ITEMS = [
  { key: 'willTrust', label: 'Will/Trust', description: 'Estate planning documents in place' },
  { key: 'beneficiaryReview', label: 'Beneficiary Review', description: 'All accounts have correct beneficiaries' },
  { key: 'poaDirectives', label: 'POA/Healthcare Directives', description: 'Power of attorney and healthcare directives' },
  { key: 'digitalAssetPlan', label: 'Digital Asset Plan', description: 'Plan for digital accounts and cryptocurrencies' },
  { key: 'insuranceCoverage', label: 'Insurance Coverage', description: 'Life, disability, and long-term care reviewed' },
  { key: 'emergencyFund', label: 'Emergency Fund', description: '3-6 months expenses in liquid savings' },
  { key: 'withdrawalStrategy', label: 'Withdrawal Strategy', description: 'Retirement income plan documented' },
] as const;

export function PlanningChecklistCard({ checklist, onUpdate }: PlanningChecklistProps) {
  const completed = Object.values(checklist).filter(Boolean).length;
  const total = Object.keys(checklist).length;
  const progress = (completed / total) * 100;

  const handleToggle = (key: keyof PlanningChecklistType) => {
    onUpdate({ ...checklist, [key]: !checklist[key] });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardCheck size={20} className="text-primary" />
            Planning Checklist
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {completed}/{total} complete
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        {CHECKLIST_ITEMS.map(item => (
          <div
            key={item.key}
            className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
            onClick={() => handleToggle(item.key)}
          >
            <Checkbox
              checked={checklist[item.key]}
              onCheckedChange={() => handleToggle(item.key)}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{item.label}</div>
              <div className="text-xs text-muted-foreground">{item.description}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
