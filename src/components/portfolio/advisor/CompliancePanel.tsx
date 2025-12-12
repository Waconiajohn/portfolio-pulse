import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  FileText, 
  Download, 
  Clock, 
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface ComplianceItem {
  id: string;
  label: string;
  required: boolean;
  checked: boolean;
}

interface CompliancePanelProps {
  clientName?: string;
  onExportReport?: () => void;
}

export function CompliancePanel({ clientName, onExportReport }: CompliancePanelProps) {
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([
    { id: 'suitability', label: 'Suitability assessment completed', required: true, checked: false },
    { id: 'risk-disclosure', label: 'Risk disclosures provided', required: true, checked: false },
    { id: 'fee-disclosure', label: 'Fee schedule disclosed', required: true, checked: false },
    { id: 'privacy', label: 'Privacy policy acknowledged', required: false, checked: false },
    { id: 'conflict', label: 'Conflict of interest disclosed', required: true, checked: false },
  ]);
  const [notes, setNotes] = useState('');

  const handleCheckItem = (id: string, checked: boolean) => {
    setComplianceItems(items =>
      items.map(item => item.id === id ? { ...item, checked } : item)
    );
  };

  const requiredComplete = complianceItems
    .filter(item => item.required)
    .every(item => item.checked);

  const allComplete = complianceItems.every(item => item.checked);

  const auditLog = [
    { action: 'Report generated', timestamp: new Date(), user: 'Advisor' },
    { action: 'Suitability reviewed', timestamp: new Date(Date.now() - 86400000), user: 'Advisor' },
    { action: 'Portfolio updated', timestamp: new Date(Date.now() - 172800000), user: 'System' },
  ];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Compliance & Documentation
          </CardTitle>
          <Badge variant={requiredComplete ? 'default' : 'destructive'} className="text-xs">
            {requiredComplete ? 'Ready' : 'Incomplete'}
          </Badge>
        </div>
        {clientName && (
          <p className="text-sm text-muted-foreground">
            Documentation for: {clientName}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Compliance Checklist */}
        <div className="space-y-3">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Required Disclosures
          </Label>
          {complianceItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
            >
              <Checkbox
                id={item.id}
                checked={item.checked}
                onCheckedChange={(checked) => handleCheckItem(item.id, checked as boolean)}
              />
              <Label htmlFor={item.id} className="text-sm cursor-pointer flex-1">
                {item.label}
              </Label>
              {item.required && (
                <Badge variant="outline" className="text-[10px]">Required</Badge>
              )}
            </div>
          ))}
        </div>

        {/* Advisor Notes */}
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Advisor Notes
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Document any additional observations, recommendations discussed, or client concerns..."
            className="min-h-[80px] text-sm"
          />
        </div>

        {/* Audit Trail */}
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Recent Activity
          </Label>
          <div className="space-y-2">
            {auditLog.map((entry, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded bg-muted/20"
              >
                <Clock className="h-3 w-3" />
                <span className="flex-1">{entry.action}</span>
                <span>{entry.timestamp.toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status & Export */}
        <div className="pt-3 border-t border-border/50 space-y-3">
          <div className={`p-3 rounded-lg border flex items-center gap-3 ${
            requiredComplete 
              ? 'bg-green-500/10 border-green-500/20' 
              : 'bg-amber-500/10 border-amber-500/20'
          }`}>
            {requiredComplete ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            )}
            <div>
              <p className={`text-sm font-medium ${requiredComplete ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {requiredComplete 
                  ? 'All required items complete' 
                  : `${complianceItems.filter(i => i.required && !i.checked).length} required items pending`
                }
              </p>
              <p className="text-xs text-muted-foreground">
                {allComplete ? 'Ready to generate report' : 'Complete checklist before export'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={onExportReport}
              disabled={!requiredComplete}
            >
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
            <Button 
              className="flex-1"
              disabled={!requiredComplete}
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
