import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BookOpen,
  GraduationCap,
  Play,
  Clock,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Target,
  TrendingUp,
  Shield,
  Lightbulb,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Difficulty = 'beginner' | 'intermediate' | 'advanced';
type LessonStatus = 'not-started' | 'in-progress' | 'completed';

interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  difficulty: Difficulty;
  status: LessonStatus;
  category: string;
  relatedDiagnostics?: string[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
  icon: React.ReactNode;
  color: string;
}

// Sample education content
const courses: Course[] = [
  {
    id: 'diversification',
    title: 'Understanding Diversification',
    description: 'Learn why not putting all eggs in one basket matters',
    icon: <Shield className="h-5 w-5" />,
    color: 'text-blue-400',
    lessons: [
      {
        id: 'div-1',
        title: 'What is Diversification?',
        description: 'The basics of spreading your investments',
        duration: 3,
        difficulty: 'beginner',
        status: 'completed',
        category: 'diversification',
        relatedDiagnostics: ['diversification'],
      },
      {
        id: 'div-2',
        title: 'Asset Classes Explained',
        description: 'Stocks, bonds, real estate, and more',
        duration: 5,
        difficulty: 'beginner',
        status: 'in-progress',
        category: 'diversification',
      },
      {
        id: 'div-3',
        title: 'Correlation: Why It Matters',
        description: 'How different investments move together',
        duration: 4,
        difficulty: 'intermediate',
        status: 'not-started',
        category: 'diversification',
      },
    ],
  },
  {
    id: 'retirement',
    title: 'Retirement Planning',
    description: 'Plan for a comfortable retirement',
    icon: <Target className="h-5 w-5" />,
    color: 'text-emerald-400',
    lessons: [
      {
        id: 'ret-1',
        title: 'The Power of Starting Early',
        description: 'See how compound growth works for you',
        duration: 4,
        difficulty: 'beginner',
        status: 'not-started',
        category: 'retirement',
      },
      {
        id: 'ret-2',
        title: '401(k) vs IRA: Which to Use?',
        description: 'Understanding your retirement account options',
        duration: 6,
        difficulty: 'beginner',
        status: 'not-started',
        category: 'retirement',
      },
    ],
  },
  {
    id: 'risk',
    title: 'Managing Risk',
    description: 'Balance risk and reward in your portfolio',
    icon: <TrendingUp className="h-5 w-5" />,
    color: 'text-amber-400',
    lessons: [
      {
        id: 'risk-1',
        title: 'What is Risk Tolerance?',
        description: 'Finding your comfort level with market swings',
        duration: 3,
        difficulty: 'beginner',
        status: 'not-started',
        category: 'risk',
        relatedDiagnostics: ['riskScore'],
      },
    ],
  },
];

const difficultyColors: Record<Difficulty, string> = {
  beginner: 'bg-emerald-500/10 text-emerald-500',
  intermediate: 'bg-amber-500/10 text-amber-500',
  advanced: 'bg-red-500/10 text-red-500',
};

interface EducationHubProps {
  recommendedLessons?: string[]; // IDs of lessons recommended based on portfolio issues
  className?: string;
}

export function EducationHub({ recommendedLessons = [], className }: EducationHubProps) {
  const [activeTab, setActiveTab] = useState('for-you');
  
  const allLessons = courses.flatMap(c => c.lessons);
  const completedCount = allLessons.filter(l => l.status === 'completed').length;
  const totalCount = allLessons.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  // Get personalized recommendations
  const recommended = recommendedLessons.length > 0
    ? allLessons.filter(l => recommendedLessons.includes(l.id))
    : allLessons.filter(l => l.status !== 'completed').slice(0, 3);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Financial Education
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Build your financial knowledge, one lesson at a time
          </p>
        </div>
        
        {/* Progress Card */}
        <Card className="sm:w-64">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Your Progress</span>
              <Badge variant="secondary" className="text-xs">
                {completedCount}/{totalCount} lessons
              </Badge>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
              <span>Financial Literacy: {progressPercent}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="for-you" className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">For You</span>
          </TabsTrigger>
          <TabsTrigger value="courses" className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Courses</span>
          </TabsTrigger>
          <TabsTrigger value="quick" className="flex items-center gap-1.5">
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">Quick Tips</span>
          </TabsTrigger>
        </TabsList>

        {/* For You Tab */}
        <TabsContent value="for-you" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Recommended For You
            </h3>
            <p className="text-sm text-muted-foreground">
              Based on your portfolio health, we suggest these lessons:
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recommended.map((lesson, index) => (
                <LessonCard key={lesson.id} lesson={lesson} index={index} />
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </TabsContent>

        {/* Quick Tips Tab */}
        <TabsContent value="quick" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <QuickTip
              title="The 3-Fund Portfolio"
              tip="A simple, effective approach: US stocks, international stocks, and bonds. That's it!"
              link="#"
            />
            <QuickTip
              title="Emergency Fund First"
              tip="Before investing, aim for 3-6 months of expenses in a high-yield savings account."
              link="#"
            />
            <QuickTip
              title="Time in Market > Timing"
              tip="Staying invested beats trying to predict market highs and lows."
              link="#"
            />
            <QuickTip
              title="Your 401(k) Match is Free Money"
              tip="Always contribute enough to get your employer's full match—it's an instant return!"
              link="#"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Lesson Card Component
function LessonCard({ lesson, index }: { lesson: Lesson; index: number }) {
  return (
    <Card 
      className={cn(
        'card-interactive overflow-hidden cursor-pointer',
        `animate-card-${index + 1}`
      )}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm line-clamp-1">{lesson.title}</h4>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {lesson.description}
            </p>
          </div>
          {lesson.status === 'completed' && (
            <CheckCircle2 className="h-5 w-5 text-status-good shrink-0" />
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={cn('text-[10px]', difficultyColors[lesson.difficulty])}>
              {lesson.difficulty}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {lesson.duration} min
            </span>
          </div>
          
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
            {lesson.status === 'completed' ? 'Review' : 'Start'}
            <Play className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Course Card Component
function CourseCard({ course }: { course: Course }) {
  const completedLessons = course.lessons.filter(l => l.status === 'completed').length;
  const progress = Math.round((completedLessons / course.lessons.length) * 100);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-xl bg-muted', course.color)}>
            {course.icon}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">{course.title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{course.description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{course.lessons.length} lessons</span>
          <span className="font-medium">{progress}% complete</span>
        </div>
        <Progress value={progress} className="h-1.5" />
        
        <div className="space-y-2">
          {course.lessons.slice(0, 3).map((lesson) => (
            <div 
              key={lesson.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                {lesson.status === 'completed' ? (
                  <CheckCircle2 className="h-4 w-4 text-status-good" />
                ) : lesson.status === 'in-progress' ? (
                  <div className="h-4 w-4 rounded-full border-2 border-primary border-r-transparent animate-spin" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                )}
                <span className={cn(
                  'text-sm',
                  lesson.status === 'completed' && 'text-muted-foreground line-through'
                )}>
                  {lesson.title}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
        
        <Button variant="outline" className="w-full" size="sm">
          View Full Course
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

// Quick Tip Component
function QuickTip({ title, tip, link }: { title: string; tip: string; link: string }) {
  return (
    <div className="edu-tip">
      <h4 className="font-medium text-sm flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-amber-400" />
        {title}
      </h4>
      <p className="text-sm text-muted-foreground mt-2">{tip}</p>
      <Button variant="link" size="sm" className="p-0 h-auto mt-2 text-xs">
        Learn more
        <ChevronRight className="h-3 w-3 ml-0.5" />
      </Button>
    </div>
  );
}
