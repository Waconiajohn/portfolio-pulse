import { useAppMode } from '@/contexts/AppModeContext';
import { AppMode, APP_MODE_CONFIG } from '@/types/app-mode';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Briefcase } from 'lucide-react';

export function ModeToggle() {
  const { mode, setMode } = useAppMode();

  const handleModeChange = (newMode: AppMode) => {
    setMode(newMode);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground uppercase tracking-wider">Mode:</span>
      <Select value={mode} onValueChange={(v) => handleModeChange(v as AppMode)}>
        <SelectTrigger className="w-32 h-8 text-sm">
          <SelectValue>
            <div className="flex items-center gap-2">
              {mode === 'consumer' ? <User size={14} /> : <Briefcase size={14} />}
              {APP_MODE_CONFIG[mode].label}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="consumer">
            <div className="flex items-center gap-2">
              <User size={14} />
              Consumer
            </div>
          </SelectItem>
          <SelectItem value="advisor">
            <div className="flex items-center gap-2">
              <Briefcase size={14} />
              Advisor
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
