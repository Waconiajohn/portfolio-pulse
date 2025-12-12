import { useCallback, useEffect, useState, useMemo } from 'react';
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
import { CARD_COPY } from '@/domain/content/cardCopy';

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
  subtitle?: string;
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
  subtitle,
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
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <CardTitle className="text-sm font-medium leading-tight">{name}</CardTitle>
              <EducationPopup 
                categoryKey={categoryKey} 
                scoringConfig={scoringConfig}
                riskTolerance={riskTolerance}
              />
            </div>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                {subtitle}
              </p>
            )}
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
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Get diagnostic entries and sort by severity (RED first, then YELLOW, then GREEN)
  const diagnosticEntries = useMemo(() => {
    const entries = Object.entries(DIAGNOSTIC_CATEGORIES) as Array<
      [keyof typeof DIAGNOSTIC_CATEGORIES, typeof DIAGNOSTIC_CATEGORIES[keyof typeof DIAGNOSTIC_CATEGORIES]]
    >;
    
    const statusOrder = { RED: 0, YELLOW: 1, GREEN: 2 };
    return entries.sort((a, b) => {
      const statusA = analysis.diagnostics[a[0] as keyof typeof analysis.diagnostics]?.status ?? 'GREEN';
      const statusB = analysis.diagnostics[b[0] as keyof typeof analysis.diagnostics]?.status ?? 'GREEN';
      return statusOrder[statusA] - statusOrder[statusB];
    });
  }, [analysis.diagnostics]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    // Hide swipe hint after user interacts
    if (!hasInteracted) {
      setHasInteracted(true);
      setShowSwipeHint(false);
    }
  }, [emblaApi, hasInteracted]);

  // Auto-hide swipe hint after 4 seconds even without interaction
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSwipeHint(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

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

  // Determine current section based on selected card
  const currentCardKey = diagnosticEntries[selectedIndex]?.[0];
  const currentCardStatus = currentCardKey 
    ? analysis.diagnostics[currentCardKey as keyof typeof analysis.diagnostics]?.status 
    : 'GREEN';
  const isNeedsAttention = currentCardStatus === 'RED' || currentCardStatus === 'YELLOW';

  // Count cards in each section
  const needsAttentionCount = diagnosticEntries.filter(([key]) => {
    const status = analysis.diagnostics[key as keyof typeof analysis.diagnostics]?.status;
    return status === 'RED' || status === 'YELLOW';
  }).length;
  const lookingGoodCount = diagnosticEntries.length - needsAttentionCount;

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <span className={cn(
            "w-2 h-2 rounded-full transition-colors",
            isNeedsAttention ? "bg-status-warning" : "bg-status-good"
          )} />
          {isNeedsAttention ? "Needs Attention" : "Looking Good"}
        </h3>
        <span className="text-xs text-muted-foreground">
          {isNeedsAttention 
            ? `${selectedIndex + 1} of ${needsAttentionCount}`
            : `${selectedIndex - needsAttentionCount + 1} of ${lookingGoodCount}`
          }
        </span>
      </div>

      {/* Carousel with edge indicators */}
      <div className="relative">
        {/* Left arrow (shows more cards to left) */}
        {canScrollPrev && (
          <div className="absolute left-0 top-0 bottom-0 w-8 z-10 flex items-center justify-start pointer-events-none">
            <button 
              onClick={scrollPrev}
              className="pointer-events-auto ml-1 p-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm opacity-70 hover:opacity-100 transition-opacity animate-[pulse_2s_ease-in-out_infinite]"
              aria-label="Previous card"
            >
              <ChevronLeft size={16} className="text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Right arrow (shows more cards to right) */}
        {canScrollNext && (
          <div className="absolute right-0 top-0 bottom-0 w-8 z-10 flex items-center justify-end pointer-events-none">
            <button 
              onClick={scrollNext}
              className="pointer-events-auto mr-1 p-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm opacity-70 hover:opacity-100 transition-opacity animate-[pulse_2s_ease-in-out_infinite]"
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
                  name={CARD_COPY[key]?.title ?? config.name}
                  subtitle={CARD_COPY[key]?.subtitle}
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

        {/* Swipe hint overlay - fades out after interaction or timeout */}
        {showSwipeHint && (
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-fade-out"
            style={{ animationDelay: '2.5s', animationDuration: '1.5s', animationFillMode: 'forwards' }}
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-foreground/80 backdrop-blur-md text-background text-sm font-medium shadow-lg">
              <ChevronLeft size={16} className="animate-[bounce-x_1s_ease-in-out_infinite]" />
              <span>Swipe for more</span>
              <ChevronRight size={16} className="animate-[bounce-x_1s_ease-in-out_infinite_reverse]" />
            </div>
          </div>
        )}
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
