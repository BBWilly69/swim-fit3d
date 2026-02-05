/**
 * Analysis Page
 *
 * Detailed swim analysis with charts, 3D pool visualization,
 * and session replay functionality.
 *
 * @module pages/AnalysisPage
 */

import React, { Suspense, useMemo, useState, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  BarChart2,
  Activity,
  Heart,
  Calendar,
  Waves,
  Loader2,
  Eye,
  EyeOff,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

import {
  GlassCard,
  StatTile,
  Badge,
  Button,
  SessionReplayControls,
} from '../components/ui';
import {
  PaceTrendChart,
  HrZoneChart,
  HeatmapCalendar,
  StrokeDistributionChart,
} from '../components/charts';
import { useSessionReplay, useCelebration, useReplayData } from '../hooks';
import { useDashboardStore } from '../stores';
import { formatDuration, formatPace } from '../utils/formatters';
import type { LaneData } from '../components/3d/SwimPool3D';
import type { PaceDataPoint } from '../components/charts/PaceTrendChart';
import type { HrZoneData } from '../components/charts/HrZoneChart';
import type { StrokeData } from '../components/charts/StrokeDistributionChart';
import type { CalendarDataPoint } from '../components/charts/HeatmapCalendar';

// Lazy-loaded 3D component for bundle splitting
const SwimPool3D = lazy(() => import('../components/3d/SwimPool3D'));

/**
 * Loading spinner component for suspense fallback.
 */
const LoadingSpinner: React.FC<{ message?: string }> = ({ message }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px]">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 className="w-8 h-8 text-primary" />
      </motion.div>
      <p className="text-sm text-muted-foreground mt-2">
        {message ?? t('common.loading', 'Loading...')}
      </p>
    </div>
  );
};

/**
 * Section header component.
 */
const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}> = ({ icon, title, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      {icon}
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
    </div>
    {action}
  </div>
);

/**
 * Collapsible section component.
 */
const CollapsibleSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, icon, defaultOpen = true, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <GlassCard className="overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-foreground">{title}</span>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
};

/**
 * Mock pace data for chart.
 */
const generateMockPaceData = (): PaceDataPoint[] => {
  const data: PaceDataPoint[] = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (30 - i));
    data.push({
      date: date.toISOString().split('T')[0],
      pace: 95 + Math.sin(i * 0.3) * 10 + Math.random() * 5,
      distance: 2000 + Math.random() * 500,
      avgHr: 145 + Math.sin(i * 0.2) * 15,
    });
  }
  return data;
};

/**
 * Mock HR zone data.
 */
const mockHrZoneData: HrZoneData[] = [
  { zone: 1, name: 'Recovery', minHr: 0, maxHr: 110, timeInZone: 180, percentage: 5 },
  { zone: 2, name: 'Aerobic', minHr: 110, maxHr: 130, timeInZone: 720, percentage: 20 },
  { zone: 3, name: 'Tempo', minHr: 130, maxHr: 150, timeInZone: 1080, percentage: 30 },
  { zone: 4, name: 'Threshold', minHr: 150, maxHr: 170, timeInZone: 1260, percentage: 35 },
  { zone: 5, name: 'VO2 Max', minHr: 170, maxHr: 185, timeInZone: 360, percentage: 10 },
];

/**
 * Mock stroke distribution data.
 */
const mockStrokeData: StrokeData[] = [
  { type: 'freestyle', distance: 1300, duration: 1200, lengths: 52, avgPace: 92 },
  { type: 'breaststroke', distance: 400, duration: 500, lengths: 16, avgPace: 125 },
  { type: 'backstroke', distance: 200, duration: 220, lengths: 8, avgPace: 110 },
  { type: 'butterfly', distance: 100, duration: 90, lengths: 4, avgPace: 90 },
];

/**
 * Mock calendar data for heatmap.
 */
const generateMockCalendarData = (): CalendarDataPoint[] => {
  const data: CalendarDataPoint[] = [];
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    if (Math.random() > 0.6) {
      data.push({
        day: date.toISOString().split('T')[0],
        value: Math.floor(Math.random() * 4000) + 500,
      });
    }
  }
  return data;
};

/**
 * Analysis page component.
 *
 * Provides comprehensive swim analysis with:
 * - 3D pool visualization with session replay
 * - Pace trend charts
 * - Heart rate zone analysis
 * - Stroke distribution
 * - Activity heatmap calendar
 */
export const AnalysisPage: React.FC = () => {
  const { t } = useTranslation();
  const { celebrate, celebratePB } = useCelebration();
  const { enable3D, setEnable3D } = useDashboardStore();

  // Fetch session data from API (falls back to mock data)
  const {
    sessionData,
    isLoading: isLoadingReplay,
    error: replayError,
    isDemo,
    refetch: refetchReplay,
  } = useReplayData({
    activityId: null, // Use demo data by default
    demoDuration: 1,
    demoPoolLength: 25,
    useMockDemo: true,
  });

  // Mock data for charts (keep separate from replay data)
  const paceData = useMemo(() => generateMockPaceData(), []);
  const calendarData = useMemo(() => generateMockCalendarData(), []);

  // Session replay hook
  const {
    state: replayState,
    play,
    pause,
    toggle,
    stop,
    seekTo,
    setSpeed,
    stepForward,
    stepBackward,
    nextLength,
    previousLength,
    availableSpeeds,
    isAtEnd,
    isAtStart,
  } = useSessionReplay({
    session: sessionData,
    onComplete: () => {
      celebrate();
    },
    onLengthChange: (length) => {
      if (length % 20 === 0) {
        celebratePB();
      }
    },
  });

  // Generate lane data for 3D visualization
  const laneData: LaneData[] = useMemo(() => {
    const colors = ['#ef4444', '#f97316', '#22c55e', '#3b82f6', '#8b5cf6'];
    // Current length determines swim direction: odd = forward (+Z), even = backward (-Z)
    const currentLength = replayState.currentLength || 1;
    const hasStroke = (replayState.currentEvent?.strokePhase ?? null) !== null;
    
    // Dive state: on block before play, diving/gliding after play starts
    const isOnBlock = replayState.isOnBlock;
    const divePhase = replayState.divePhase;
    
    // Single test swimmer on starting block in lane 1
    return [
      {
        athleteId: 'athlete-1',
        athleteName: 'Test Swimmer',
        color: colors[0],
        currentPosition: replayState.poolPosition,
        strokePhase: replayState.currentEvent?.strokePhase ?? 0,
        strokeType: replayState.currentEvent?.strokeType ?? 'freestyle',
        isActive: replayState.isPlaying && hasStroke && divePhase >= 1,
        isTurning: replayState.isTurning,
        turnPhase: replayState.turnPhase,
        currentLength: currentLength,
        isOnBlock: isOnBlock,
        divePhase: divePhase,
        strokeRate: replayState.currentEvent?.strokeRate,
        gender: 'male' as const,
        lod: 'high' as const,
      },
    ];
  }, [replayState]);

  // View state for 3D
  const [viewPreset, setViewPreset] = useState<'side' | 'top' | 'perspective' | 'follow'>('perspective');

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BarChart2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {t('nav.analysis')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('analysis.subtitle', 'Deep dive into your swim performance')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDemo && (
            <Badge variant="warning" className="text-xs">
              Demo
            </Badge>
          )}
          {replayError && (
            <Button variant="secondary" size="sm" onClick={refetchReplay}>
              {t('common.retry', 'Retry')}
            </Button>
          )}
          <Button
            variant={enable3D ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setEnable3D(!enable3D)}
            disabled={isLoadingReplay}
          >
            {enable3D ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
            {t('analysis.3dView', '3D View')}
          </Button>
        </div>
      </motion.div>

      {/* Quick stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatTile
          label={t('stats.totalDistance', 'Total Distance')}
          value="2,000"
          unit="m"
          icon={<Waves className="w-5 h-5" />}
          trend="up"
          trendValue={12}
        />
        <StatTile
          label={t('stats.avgPace', 'Avg Pace')}
          value={formatPace(98)}
          icon={<Activity className="w-5 h-5" />}
          trend="down"
          trendValue={3}
        />
        <StatTile
          label={t('stats.avgHr', 'Avg HR')}
          value="152"
          unit="bpm"
          icon={<Heart className="w-5 h-5" />}
        />
        <StatTile
          label={t('stats.duration', 'Duration')}
          value={formatDuration(2700, 'long')}
          icon={<Calendar className="w-5 h-5" />}
        />
      </motion.div>

      {/* 3D Pool Visualization */}
      <AnimatePresence>
        {enable3D && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <GlassCard>
              <SectionHeader
                icon={<Waves className="w-5 h-5 text-primary" />}
                title={t('analysis.sessionReplay', 'Session Replay')}
                action={
                  <div className="flex items-center gap-2">
                    <Badge variant="info">
                      {t('analysis.length', 'Length')} {replayState.currentLength}
                    </Badge>
                    <select
                      value={viewPreset}
                      onChange={(e) => setViewPreset(e.target.value as typeof viewPreset)}
                      className="text-xs bg-muted border-0 rounded px-2 py-1"
                    >
                      <option value="perspective">Perspective</option>
                      <option value="side">Side</option>
                      <option value="top">Top</option>
                      <option value="follow">Follow</option>
                    </select>
                  </div>
                }
              />

              <Suspense fallback={<LoadingSpinner message={t('analysis.loading3D', 'Loading 3D view...')} />}>
                <SwimPool3D
                  poolLength={sessionData?.poolLength ?? 25}
                  laneCount={5}
                  lanes={laneData}
                  showCaustics
                  enableControls
                  viewPreset={viewPreset}
                  height={400}
                />
              </Suspense>

              <div className="mt-4">
                <SessionReplayControls
                  state={replayState}
                  duration={sessionData?.duration ?? 0}
                  events={sessionData?.events ?? []}
                  lengthMarkers={sessionData?.lengthMarkers ?? []}
                  onPlay={play}
                  onPause={pause}
                  onToggle={toggle}
                  onStop={stop}
                  onSeek={seekTo}
                  onSetSpeed={setSpeed}
                  onStepForward={stepForward}
                  onStepBackward={stepBackward}
                  onNextLength={nextLength}
                  onPreviousLength={previousLength}
                  availableSpeeds={availableSpeeds}
                  isAtEnd={isAtEnd}
                  isAtStart={isAtStart}
                />
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pace Trend */}
        <CollapsibleSection
          title={t('analysis.paceTrend', 'Pace Trend')}
          icon={<Activity className="w-5 h-5 text-emerald-500" />}
        >
          <PaceTrendChart data={paceData} height={300} targetPace={95} />
        </CollapsibleSection>

        {/* HR Zones */}
        <CollapsibleSection
          title={t('analysis.hrZones', 'Heart Rate Zones')}
          icon={<Heart className="w-5 h-5 text-red-500" />}
        >
          <HrZoneChart
            zones={mockHrZoneData}
            currentHr={replayState.currentEvent?.heartRate ?? 150}
            maxHr={185}
            height={300}
            variant="bars"
          />
        </CollapsibleSection>

        {/* Stroke Distribution */}
        <CollapsibleSection
          title={t('analysis.strokeDistribution', 'Stroke Distribution')}
          icon={<Waves className="w-5 h-5 text-blue-500" />}
        >
          <StrokeDistributionChart data={mockStrokeData} height={300} />
        </CollapsibleSection>

        {/* Activity Heatmap */}
        <CollapsibleSection
          title={t('analysis.activityHistory', 'Activity History')}
          icon={<Calendar className="w-5 h-5 text-amber-500" />}
        >
          <HeatmapCalendar
            data={calendarData}
            from="2024-01-01"
            to="2024-12-31"
            height={200}
          />
        </CollapsibleSection>
      </div>

      {/* Performance insights */}
      <GlassCard>
        <SectionHeader
          icon={<Sparkles className="w-5 h-5 text-purple-500" />}
          title={t('analysis.insights', 'Performance Insights')}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              {t('insights.strength', 'Strength')}
            </div>
            <div className="mt-1 text-foreground">
              {t('insights.consistentPace', 'Consistent pace throughout')}
            </div>
          </div>
          <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <div className="text-sm font-medium text-amber-600 dark:text-amber-400">
              {t('insights.improvement', 'Area to Improve')}
            </div>
            <div className="mt-1 text-foreground">
              {t('insights.turnTechnique', 'Turn technique could be faster')}
            </div>
          </div>
          <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {t('insights.recommendation', 'Recommendation')}
            </div>
            <div className="mt-1 text-foreground">
              {t('insights.increaseVolume', 'Ready for 10% volume increase')}
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default AnalysisPage;
