/**
 * Dashboard Page
 *
 * Main dashboard with overview statistics, recent activities,
 * and quick access tiles.
 *
 * @module pages/Dashboard
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Waves,
  Clock,
  Activity,
  Gauge,
  Heart,
  Target,
  TrendingUp,
  Upload,
  ChevronRight,
  Trophy,
} from 'lucide-react';

import { GlassCard, StatTile, Badge, Button, Modal } from '../components/ui';
import { getCommunityComparison, getSwolfPercentile } from '../services/community';
import { formatDuration, formatDistance, formatPace } from '../utils/formatters';

// Demo data for visualization (will be replaced with API data)
const DEMO_STATS = {
  totalDistance: 47500,
  totalTime: 12600000, // 3.5 hours
  sessions: 12,
  avgPace: 115, // 1:55/100m
  avgHr: 142,
  avgSwolf: 48,
  weeklyDistance: 8500,
  weeklyChange: 12,
};

const DEMO_ACTIVITIES = [
  { id: '1', date: '2024-01-15', distance: 2000, duration: 2280000, pace: 114, swolf: 46 },
  { id: '2', date: '2024-01-13', distance: 2500, duration: 3000000, pace: 120, swolf: 50 },
  { id: '3', date: '2024-01-10', distance: 1500, duration: 1680000, pace: 112, swolf: 44 },
];

/**
 * Dashboard page component.
 */
export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedStat, setSelectedStat] = useState<string | null>(null);

  // Calculate community percentile for demo
  const paceComparison = getCommunityComparison('FREESTYLE', 1000, DEMO_STATS.avgPace, '40-49', 'M');
  const swolfPercentile = getSwolfPercentile(DEMO_STATS.avgSwolf);

  const openStatDetail = (statName: string) => {
    setSelectedStat(statName);
    setShowDetailModal(true);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t('dashboard.welcome')} 👋
          </h1>
          <p className="text-muted mt-1">{t('dashboard.overview')}</p>
        </div>
        <Button
          variant="primary"
          icon={<Upload className="w-4 h-4" />}
          onClick={() => navigate('/import')}
        >
          {t('nav.import')}
        </Button>
      </motion.div>

      {/* Main Stats Grid */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatTile
          label={t('stats.totalDistance')}
          value={formatDistance(DEMO_STATS.totalDistance)}
          icon={<Waves className="w-5 h-5" />}
          accent="primary"
          trend="up"
          trendValue={DEMO_STATS.weeklyChange}
          trendPeriod={t('stats.vsLastWeek')}
          onClick={() => openStatDetail('distance')}
        />
        <StatTile
          label={t('stats.totalTime')}
          value={formatDuration(DEMO_STATS.totalTime, 'long')}
          icon={<Clock className="w-5 h-5" />}
          accent="secondary"
          onClick={() => openStatDetail('time')}
        />
        <StatTile
          label={t('stats.totalSessions')}
          value={DEMO_STATS.sessions}
          icon={<Activity className="w-5 h-5" />}
          accent="accent"
          onClick={() => openStatDetail('sessions')}
        />
        <StatTile
          label={t('stats.avgPace')}
          value={formatPace(DEMO_STATS.avgPace)}
          unit="/100m"
          icon={<Gauge className="w-5 h-5" />}
          accent="success"
          onClick={() => openStatDetail('pace')}
        />
      </motion.div>

      {/* Secondary Stats & Community */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heart Rate & SWOLF */}
        <GlassCard className="lg:col-span-1">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {t('analysis.efficiency')}
          </h3>
          <div className="space-y-4">
            <div
              className="flex items-center justify-between p-3 rounded-xl bg-surface-hover cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => openStatDetail('hr')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-error/20 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-error" />
                </div>
                <div>
                  <p className="text-sm text-muted">{t('stats.avgHr')}</p>
                  <p className="text-xl font-bold text-foreground">{DEMO_STATS.avgHr} bpm</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted" />
            </div>

            <div
              className="flex items-center justify-between p-3 rounded-xl bg-surface-hover cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => openStatDetail('swolf')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted">{t('stats.avgSwolf')}</p>
                  <p className="text-xl font-bold text-foreground">{DEMO_STATS.avgSwolf}</p>
                </div>
              </div>
              <Badge variant="gold" icon={<Trophy className="w-3 h-3" />}>
                Top {100 - swolfPercentile}%
              </Badge>
            </div>
          </div>
        </GlassCard>

        {/* Community Comparison */}
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              {t('community.title')}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/community')}>
              {t('common.showMore')} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {paceComparison && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-muted mb-1">{t('community.yourPosition')}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-primary">
                      Top {100 - paceComparison.percentile}%
                    </span>
                    <span className="text-muted">
                      ({paceComparison.metric})
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted">{t('community.dataSource')}</p>
                  <p className="font-medium text-foreground">{paceComparison.dataSource}</p>
                  <p className="text-xs text-muted">
                    {paceComparison.sampleSize.toLocaleString()} {t('common.selected')}
                  </p>
                </div>
              </div>

              {/* Percentile bar */}
              <div className="relative h-8 bg-surface-hover rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-error via-warning to-success"
                  style={{ width: '100%' }}
                />
                <div
                  className="absolute top-0 h-full w-1 bg-foreground"
                  style={{ left: `${paceComparison.percentile}%` }}
                />
                <div
                  className="absolute top-full mt-1 transform -translate-x-1/2 text-xs font-medium"
                  style={{ left: `${paceComparison.percentile}%` }}
                >
                  {t('community.percentile')}: {paceComparison.percentile}
                </div>
              </div>
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Recent Activities */}
      <motion.div variants={itemVariants}>
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              {t('dashboard.recentActivities')}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/activities')}>
              {t('common.showMore')} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="space-y-3">
            {DEMO_ACTIVITIES.map((activity, index) => (
              <motion.div
                key={activity.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-surface-hover hover:bg-primary/10 cursor-pointer transition-colors"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => navigate(`/activities/${activity.id}`)}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Waves className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{formatDistance(activity.distance)}</p>
                  <p className="text-sm text-muted">{activity.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">
                    {formatDuration(activity.duration, 'minimal')}
                  </p>
                  <p className="text-sm text-muted">
                    {formatPace(activity.pace)}/100m
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="info">SWOLF {activity.swolf}</Badge>
                  <ChevronRight className="w-5 h-5 text-muted" />
                </div>
              </motion.div>
            ))}
          </div>

          {DEMO_ACTIVITIES.length === 0 && (
            <div className="text-center py-12">
              <Waves className="w-16 h-16 text-muted mx-auto mb-4 opacity-50" />
              <p className="text-muted mb-4">{t('dashboard.noData')}</p>
              <Button variant="primary" onClick={() => navigate('/import')}>
                {t('dashboard.startImport')}
              </Button>
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={selectedStat ? t(`stats.${selectedStat === 'distance' ? 'totalDistance' : selectedStat}`) : ''}
        size="lg"
      >
        <div className="py-4">
          <p className="text-muted">
            {t('hints.viewDetails')}
          </p>
          {/* Detailed charts and analysis would go here */}
          <div className="mt-4 h-64 bg-surface-hover rounded-xl flex items-center justify-center">
            <TrendingUp className="w-12 h-12 text-muted opacity-50" />
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default Dashboard;
