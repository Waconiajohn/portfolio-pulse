import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FeeImpactCalculator, RiskProfileMatcher, GoalProbabilityVisualizer } from './calculators';
import { RiskTolerance } from '@/types/portfolio';
import { Calculator, Target, TrendingUp } from 'lucide-react';

interface ConsumerToolsPanelProps {
  portfolioValue: number;
  expenseRatio: number;
  riskTolerance: RiskTolerance;
  volatility: number;
  expectedReturn: number;
  currentAge?: number;
}

export function ConsumerToolsPanel({
  portfolioValue,
  expenseRatio,
  riskTolerance,
  volatility,
  expectedReturn,
  currentAge = 45,
}: ConsumerToolsPanelProps) {
  const [activeTab, setActiveTab] = useState('fees');

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Interactive Tools
        </h3>
        <p className="text-sm text-muted-foreground">
          Explore how different factors impact your portfolio
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="fees" className="text-xs gap-1">
            <Calculator className="h-3 w-3" />
            Fees
          </TabsTrigger>
          <TabsTrigger value="risk" className="text-xs gap-1">
            <TrendingUp className="h-3 w-3" />
            Risk
          </TabsTrigger>
          <TabsTrigger value="goals" className="text-xs gap-1">
            <Target className="h-3 w-3" />
            Goals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fees" className="mt-4">
          <FeeImpactCalculator 
            initialPortfolioValue={portfolioValue}
            currentFeeRate={expenseRatio}
          />
        </TabsContent>

        <TabsContent value="risk" className="mt-4">
          <RiskProfileMatcher 
            riskTolerance={riskTolerance}
            actualVolatility={volatility}
            expectedReturn={expectedReturn}
          />
        </TabsContent>

        <TabsContent value="goals" className="mt-4">
          <GoalProbabilityVisualizer 
            currentPortfolioValue={portfolioValue}
            expectedReturn={expectedReturn}
            volatility={volatility}
            currentAge={currentAge}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
