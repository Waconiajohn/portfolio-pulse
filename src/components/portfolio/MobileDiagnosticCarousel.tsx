import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures';
import { DiagnosticResult, RiskTolerance } from '@/types/portfolio';
import { StatusBadge } from './StatusBadge';
import { EducationPopup } from './EducationPopup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ChevronRight, 
  ChevronLeft,
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
  Wallet,
  FileQuestion,
  Activity,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_LABELS, ScoringConfig, DEFAULT_SCORING_CONFIG } from '@/lib/scoring-config';
import { DIAGNOSTIC_CATEGORIES } from '@/lib/constants';
import { PortfolioAnalysis } from '@/types/portfolio';

const iconMap: Record<string, LucideIcon> = {
  Shield, ShieldAlert, TrendingUp, DollarSign, Receipt, 
  PieChart, BarChart3, Umbrella, Settings2, ClipboardCheck, Wallet, FileQuestion, Activity
};

interface MobileDiagnosticCarouselProps {
  analysis: PortfolioAnalysis;
  scoringConfig: ScoringConfig;
  riskTolerance: RiskTolerance;
  onViewDetails: (categoryKey: string) => void;
}

interface CarouselCardProps {
  name: string;
  iconName: string;
  categoryKey: string;
  result: DiagnosticResult;
  onViewDetails: () => void;
  scoringConfig: ScoringConfig;
  riskTolerance: RiskTolerance;
  isActive: boolean;
}

function CarouselCard({ 
  name, 
  iconName, 
  categoryKey, 
  result, 
  onViewDetails,
  scoringConfig,
  riskTolerance,
  isActive
}: CarouselCardProps) {
  const IconComponent = iconMap[iconName] || FileQuestion;

  const getStatusBorderClass = () => {
    if (result.status === 'GREEN') return 'border-l-status-good';
    if (result.status === 'YELLOW') return 'border-l-status-warning';
    return 'border-l-status-critical';
  };

  const getGlowClass = () => {
    if (!isActive) return '';
    if (result.status === 'GREEN') return 'glow-good';
    if (result.status === 'YELLOW') return 'glow-warning';
    return 'glow-critical';
  };

  return (
    <Card 
      className={cn(
        'h-full border-l-4 touch-manipulation transition-all duration-300',
        getStatusBorderClass(),
        isActive ? getGlowClass() : 'opacity-70 scale-[0.97]',
        isActive && 'scale-100 opacity-100'
      )} 
      onClick={onViewDetails}
    >
      <CardHeader className="pb-2 p-4">
        {/* Title row with icon and name */}
        <div className="flex items-center gap-2 mb-2">
          <div className={cn(
            "p-2 rounded-lg transition-colors duration-300 shrink-0",
            isActive ? "bg-primary/20" : "bg-secondary"
          )}>
            <IconComponent size={18} className={cn(
              "transition-colors duration-300",
              isActive ? "text-primary" : "text-muted-foreground"
            )} />
          </div>
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <CardTitle className="text-sm font-medium leading-tight">{name}</CardTitle>
            <EducationPopup 
              categoryKey={categoryKey} 
              scoringConfig={scoringConfig}
              riskTolerance={riskTolerance}
            />
          </div>
        </div>
        {/* Status badge on its own row - horizontal layout */}
        <StatusBadge status={result.status} label={STATUS_LABELS[result.status]} showLabel size="sm" />
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {result.keyFinding}
        </p>
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Primary Metric</div>
            <div className="font-mono text-sm font-semibold text-foreground truncate">
              {result.headlineMetric}
            </div>
          </div>
          <div className={cn(
            "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 shrink-0",
            isActive 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground"
          )}>
            <span>Details</span>
            <ChevronRight size={14} className={cn(
              "transition-transform duration-200",
              isActive && "translate-x-0.5"
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MobileDiagnosticCarousel({
  analysis,
  scoringConfig,
  riskTolerance,
  onViewDetails
}: MobileDiagnosticCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    align: 'start',
    containScroll: false,
    loop: false,
    skipSnaps: false,
    dragFree: false,
  }, [WheelGesturesPlugin()]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const diagnosticEntries = Object.entries(DIAGNOSTIC_CATEGORIES) as Array<
    [keyof typeof DIAGNOSTIC_CATEGORIES, typeof DIAGNOSTIC_CATEGORIES[keyof typeof DIAGNOSTIC_CATEGORIES]]
  >;

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
  }, [emblaApi]);

  const canScrollPrev = selectedIndex > 0;
  const canScrollNext = selectedIndex < diagnosticEntries.length - 1;

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  return (
    <div className="space-y-4">
      {/* Carousel with edge indicators */}
      <div className="relative">
        {/* Left edge gradient + arrow (shows more cards to left) */}
        {canScrollPrev && (
          <div 
            className="absolute left-0 top-0 bottom-0 w-12 z-10 flex items-center justify-start pointer-events-none"
            style={{
              background: 'linear-gradient(to right, hsl(var(--background)) 0%, transparent 100%)'
            }}
          >
            <button 
              onClick={scrollPrev}
              className="pointer-events-auto ml-1 p-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Previous card"
            >
              <ChevronLeft size={16} className="text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Right edge gradient + arrow (shows more cards to right) */}
        {canScrollNext && (
          <div 
            className="absolute right-0 top-0 bottom-0 w-12 z-10 flex items-center justify-end pointer-events-none"
            style={{
              background: 'linear-gradient(to left, hsl(var(--background)) 0%, transparent 100%)'
            }}
          >
            <button 
              onClick={scrollNext}
              className="pointer-events-auto mr-1 p-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Next card"
            >
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          </div>
        )}

        <div className="overflow-hidden -mx-4 px-4 cursor-grab active:cursor-grabbing" ref={emblaRef}>
          <div className="flex -ml-3">
            {diagnosticEntries.map(([key, config], index) => (
              <div 
                key={key} 
                className="flex-[0_0_88%] min-w-0 pl-3"
                style={{ paddingRight: index === diagnosticEntries.length - 1 ? '1rem' : 0 }}
              >
                <CarouselCard
                  name={config.name}
                  iconName={config.icon}
                  categoryKey={key}
                  result={analysis.diagnostics[key as keyof typeof analysis.diagnostics]}
                  onViewDetails={() => onViewDetails(key)}
                  scoringConfig={scoringConfig}
                  riskTolerance={riskTolerance}
                  isActive={index === selectedIndex}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-1.5">
        {scrollSnaps.map((_, index) => {
          const key = diagnosticEntries[index]?.[0];
          const result = key ? analysis.diagnostics[key as keyof typeof analysis.diagnostics] : null;
          
          const getDotColor = () => {
            if (!result) return 'bg-muted';
            if (result.status === 'GREEN') return 'bg-status-good';
            if (result.status === 'YELLOW') return 'bg-status-warning';
            return 'bg-status-critical';
          };

          return (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 touch-manipulation",
                index === selectedIndex 
                  ? cn("w-5", getDotColor())
                  : "w-1.5 bg-muted hover:bg-muted-foreground/30"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          );
        })}
      </div>

      {/* Quick Status Summary */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-status-good" />
          <span>{diagnosticEntries.filter(([key]) => 
            analysis.diagnostics[key as keyof typeof analysis.diagnostics]?.status === 'GREEN'
          ).length} Good</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-status-warning" />
          <span>{diagnosticEntries.filter(([key]) => 
            analysis.diagnostics[key as keyof typeof analysis.diagnostics]?.status === 'YELLOW'
          ).length} Review</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-status-critical" />
          <span>{diagnosticEntries.filter(([key]) => 
            analysis.diagnostics[key as keyof typeof analysis.diagnostics]?.status === 'RED'
          ).length} Critical</span>
        </div>
      </div>
    </div>
  );
}
