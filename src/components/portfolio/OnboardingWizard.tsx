import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Shield, ChevronRight, ChevronLeft, Check, User, Calendar, Target } from 'lucide-react';
import { toast } from 'sonner';
import { RiskTolerance } from '@/types/portfolio';
import { cn } from '@/lib/utils';

interface OnboardingWizardProps {
  onComplete: () => void;
}

const RISK_OPTIONS: { value: RiskTolerance; label: string; description: string }[] = [
  {
    value: 'Conservative',
    label: 'Conservative',
    description: 'Prioritize capital preservation. Lower risk, potentially lower returns.',
  },
  {
    value: 'Moderate',
    label: 'Moderate',
    description: 'Balance between growth and stability. Medium risk and returns.',
  },
  {
    value: 'Aggressive',
    label: 'Aggressive',
    description: 'Maximize growth potential. Higher risk, potentially higher returns.',
  },
];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const navigate = useNavigate();
  const { updateProfile } = useProfile();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance>('Moderate');

  const totalSteps = 3;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    
    const success = await updateProfile({
      name: name || null,
      date_of_birth: dateOfBirth || null,
      risk_tolerance: riskTolerance,
    });

    setSaving(false);

    if (success) {
      toast.success('Profile saved!');
      onComplete();
    } else {
      toast.error('Failed to save profile');
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return name.trim().length > 0;
      case 2:
        return true; // Date of birth is optional
      case 3:
        return true; // Risk tolerance has a default
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg border-border/50">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">PortfolioGuard</span>
          </div>
          <CardTitle className="text-xl">Let's set up your profile</CardTitle>
          <CardDescription>
            Step {step} of {totalSteps}
          </CardDescription>
          
          {/* Progress bar */}
          <div className="flex gap-2 mt-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  i < step ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Step 1: Name */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">What's your name?</h3>
                  <p className="text-sm text-muted-foreground">
                    This helps personalize your portfolio reports.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Step 2: Date of Birth */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">When were you born?</h3>
                  <p className="text-sm text-muted-foreground">
                    Your age helps us provide better retirement planning insights.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth (Optional)</Label>
                <Input
                  id="dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 3: Risk Tolerance */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">What's your risk tolerance?</h3>
                  <p className="text-sm text-muted-foreground">
                    This helps us benchmark your portfolio appropriately.
                  </p>
                </div>
              </div>

              <RadioGroup
                value={riskTolerance}
                onValueChange={(value) => setRiskTolerance(value as RiskTolerance)}
                className="space-y-3"
              >
                {RISK_OPTIONS.map((option) => (
                  <div
                    key={option.value}
                    className={cn(
                      'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors',
                      riskTolerance === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                    onClick={() => setRiskTolerance(option.value)}
                  >
                    <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                    <div>
                      <Label htmlFor={option.value} className="font-medium cursor-pointer">
                        {option.label}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {option.description}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            {step < totalSteps ? (
              <Button onClick={handleNext} disabled={!canProceed()} className="gap-1">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={saving} className="gap-1">
                {saving ? 'Saving...' : 'Complete'}
                <Check className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Skip link */}
          <div className="text-center mt-4">
            <button
              onClick={onComplete}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip for now
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
