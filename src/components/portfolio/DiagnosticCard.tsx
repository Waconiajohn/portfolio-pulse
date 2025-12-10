import { DiagnosticResult } from '@/types/portfolio';
import { StatusBadge } from './StatusBadge';
import { EducationPopup } from './EducationPopup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChevronRight, 
  Shield, 
  ShieldAlert, 
  TrendingUp, 
  DollarSign, 
  Receipt, 
  PieChart, 
  BarChart3, 
  Umbrella, 
  Settings2, 
  ClipboardCheck,
  FileQuestion,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_LABELS } from '@/lib/scoring-config';

const iconMap: Record<string, LucideIcon> = {
  Shield, ShieldAlert, TrendingUp, DollarSign, Receipt, 
  PieChart, BarChart3, Umbrella, Settings2, ClipboardCheck, FileQuestion
};

interface DiagnosticCardProps {
  name: string;
  iconName: string;
  categoryKey: string;
  result: DiagnosticResult;
  onViewDetails: () => void;
}

export function DiagnosticCard({ name, iconName, categoryKey, result, onViewDetails }: DiagnosticCardProps) {
  const IconComponent = iconMap[iconName] || FileQuestion;

  const getGlowClass = () => {
    if (result.status === 'GREEN') return 'hover:glow-good';
    if (result.status === 'YELLOW') return 'hover:glow-warning';
    return 'hover:glow-critical';
  };

  return (
    <Card className={cn(
      'card-interactive cursor-pointer group',
      getGlowClass()
    )} onClick={onViewDetails}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-secondary">
              <IconComponent size={18} className="text-primary" />
            </div>
            <div className="flex items-center gap-1">
              <CardTitle className="text-sm font-medium">{name}</CardTitle>
              <EducationPopup categoryKey={categoryKey} />
            </div>
          </div>
          <StatusBadge status={result.status} label={STATUS_LABELS[result.status]} showLabel size="sm" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {result.keyFinding}
        </p>
        <div className="font-mono text-sm font-medium text-foreground">
          {result.headlineMetric}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-between text-muted-foreground hover:text-foreground group-hover:bg-accent"
        >
          View Details
          <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
