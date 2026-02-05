/**
 * SwimPool3DControls - UI components for SwimPool3D
 * 
 * Contains:
 * - CameraPoolInfo: Displays camera and pool position info above the 3D element
 * - LaneSelector: Lane selection UI below the 3D element
 * 
 * @module components/3d/SwimPool3DControls
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import type { LengthData, StrokeType } from './SimpleLaneSwimmer';

/**
 * Activity option for lane selection
 */
export interface ActivityOption {
  id: string;
  name: string;
  date: string;
  lengths: LengthData[];
  /** Total distance in meters */
  totalDistance: number;
  /** Total time in seconds */
  totalTime: number;
}

/**
 * Fastest lap option per stroke type
 */
export interface FastestLapOption {
  strokeType: StrokeType;
  lapIndex: number;
  activityId: string;
  activityName: string;
  lengthData: LengthData;
  pace: number; // seconds per 100m
}

/**
 * Selection state for a single lane
 */
export interface LaneSelectionState {
  type: 'none' | 'activity' | 'fastest-lap';
  activityId?: string;
  strokeType?: StrokeType;
}

/**
 * Props for CameraPoolInfo
 */
export interface CameraPoolInfoProps {
  /** Camera position */
  cameraPosition?: THREE.Vector3;
  /** Camera target/look-at point */
  cameraTarget?: THREE.Vector3;
  /** Pool length in meters */
  poolLength: number;
  /** Pool width in meters */
  poolWidth: number;
  /** Number of lanes */
  laneCount: number;
  /** Current view preset name */
  viewPreset?: string;
  /** Callback to change view preset */
  onViewPresetChange?: (preset: 'side' | 'top' | 'perspective' | 'follow') => void;
}

/**
 * Camera and Pool Info Display
 * 
 * Shows current camera position and pool dimensions above the 3D element.
 */
export const CameraPoolInfo: React.FC<CameraPoolInfoProps> = ({
  cameraPosition,
  cameraTarget: _cameraTarget,
  poolLength,
  poolWidth,
  laneCount,
  viewPreset = 'perspective',
  onViewPresetChange,
}) => {
  const { t } = useTranslation();
  void _cameraTarget; // Reserved for future use
  
  const formatPos = (v: THREE.Vector3 | undefined): string => {
    if (!v) return '—';
    return `${v.x.toFixed(1)}, ${v.y.toFixed(1)}, ${v.z.toFixed(1)}`;
  };

  const viewPresets = [
    { key: 'side', label: t('pool3d.view.side', 'Side') },
    { key: 'top', label: t('pool3d.view.top', 'Top') },
    { key: 'perspective', label: t('pool3d.view.perspective', 'Perspective') },
    { key: 'follow', label: t('pool3d.view.follow', 'Follow') },
  ] as const;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-t-xl border-b border-slate-200 dark:border-slate-700">
      {/* Pool Info */}
      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span className="font-medium">{poolLength}m × {poolWidth.toFixed(1)}m</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span>{laneCount} {t('pool3d.lanes', 'Lanes')}</span>
        </div>
      </div>

      {/* Camera Info */}
      <div className="flex items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-500">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>{formatPos(cameraPosition)}</span>
        </div>
      </div>

      {/* View Preset Selector */}
      {onViewPresetChange && (
        <div className="flex items-center gap-1">
          {viewPresets.map((preset) => (
            <button
              key={preset.key}
              onClick={() => onViewPresetChange(preset.key)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                viewPreset === preset.key
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Props for LaneSelector
 */
export interface LaneSelectorProps {
  /** Number of lanes */
  laneCount: number;
  /** Available activities to select */
  activities: ActivityOption[];
  /** Fastest laps per stroke type */
  fastestLaps: FastestLapOption[];
  /** Current selection state per lane */
  selections: LaneSelectionState[];
  /** Callback when selection changes */
  onSelectionChange: (laneIndex: number, selection: LaneSelectionState) => void;
  /** Lane colors */
  laneColors?: string[];
}

/**
 * Lane Selection UI
 * 
 * Allows selecting an activity or fastest lap per stroke type for each lane.
 * Each selection can only be used on one lane.
 */
export const LaneSelector: React.FC<LaneSelectorProps> = ({
  laneCount,
  activities,
  fastestLaps,
  selections,
  onSelectionChange,
  laneColors = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6'],
}) => {
  const { t } = useTranslation();
  const [openLane, setOpenLane] = useState<number | null>(null);

  // Get used selections to prevent duplicates
  const usedSelections = useMemo(() => {
    const used = new Set<string>();
    selections.forEach((sel) => {
      if (sel.type === 'activity' && sel.activityId) {
        used.add(`activity:${sel.activityId}`);
      } else if (sel.type === 'fastest-lap' && sel.strokeType) {
        used.add(`fastest:${sel.strokeType}`);
      }
    });
    return used;
  }, [selections]);

  // Check if a selection is available
  const isAvailable = useCallback((type: string, value: string, currentLane: number): boolean => {
    const key = `${type}:${value}`;
    // Available if not used OR used by current lane
    const currentSel = selections[currentLane];
    if (type === 'activity' && currentSel.type === 'activity' && currentSel.activityId === value) {
      return true;
    }
    if (type === 'fastest' && currentSel.type === 'fastest-lap' && currentSel.strokeType === value) {
      return true;
    }
    return !usedSelections.has(key);
  }, [selections, usedSelections]);

  // Get display text for current selection
  const getSelectionLabel = (sel: LaneSelectionState): string => {
    if (sel.type === 'none') return t('pool3d.lane.empty', 'Empty');
    if (sel.type === 'activity') {
      const activity = activities.find(a => a.id === sel.activityId);
      return activity?.name ?? t('pool3d.lane.activity', 'Activity');
    }
    if (sel.type === 'fastest-lap' && sel.strokeType) {
      return t(`pool3d.fastest.${sel.strokeType}`, `Fastest ${sel.strokeType}`);
    }
    return '—';
  };

  // Stroke type labels
  const strokeLabels: Record<StrokeType, string> = {
    freestyle: t('stroke.freestyle', 'Freestyle'),
    breaststroke: t('stroke.breaststroke', 'Breaststroke'),
    backstroke: t('stroke.backstroke', 'Backstroke'),
    butterfly: t('stroke.butterfly', 'Butterfly'),
  };

  return (
    <div className="flex items-stretch gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-b-xl border-t border-slate-200 dark:border-slate-700">
      {[...Array(laneCount)].map((_, laneIndex) => {
        const selection = selections[laneIndex] ?? { type: 'none' };
        const isOpen = openLane === laneIndex;
        const color = laneColors[laneIndex % laneColors.length];

        return (
          <div key={laneIndex} className="flex-1 relative">
            {/* Lane Header */}
            <button
              onClick={() => setOpenLane(isOpen ? null : laneIndex)}
              className={`w-full px-3 py-2 rounded-lg border-2 transition-all ${
                selection.type !== 'none'
                  ? 'bg-white dark:bg-slate-700 border-current'
                  : 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600'
              }`}
              style={{ borderColor: selection.type !== 'none' ? color : undefined }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t('pool3d.lane', 'Lane')} {laneIndex + 1}
                  </span>
                </div>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <div className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                {getSelectionLabel(selection)}
              </div>
            </button>

            {/* Dropdown */}
            {isOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 max-h-64 overflow-y-auto">
                {/* Empty option */}
                <button
                  onClick={() => {
                    onSelectionChange(laneIndex, { type: 'none' });
                    setOpenLane(null);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  {t('pool3d.lane.empty', 'Empty')}
                </button>

                {/* Activities section */}
                {activities.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide bg-slate-50 dark:bg-slate-900">
                      {t('pool3d.activities', 'Activities')}
                    </div>
                    {activities.map((activity) => {
                      const available = isAvailable('activity', activity.id, laneIndex);
                      return (
                        <button
                          key={activity.id}
                          onClick={() => {
                            if (available) {
                              onSelectionChange(laneIndex, { type: 'activity', activityId: activity.id });
                              setOpenLane(null);
                            }
                          }}
                          disabled={!available}
                          className={`w-full px-3 py-2 text-left ${
                            available
                              ? 'hover:bg-slate-100 dark:hover:bg-slate-700'
                              : 'opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {activity.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {activity.date} • {activity.totalDistance}m
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}

                {/* Fastest laps section */}
                {fastestLaps.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide bg-slate-50 dark:bg-slate-900">
                      {t('pool3d.fastestLaps', 'Fastest Laps')}
                    </div>
                    {(['freestyle', 'breaststroke', 'backstroke', 'butterfly'] as StrokeType[]).map((stroke) => {
                      const lap = fastestLaps.find(l => l.strokeType === stroke);
                      if (!lap) return null;
                      
                      const available = isAvailable('fastest', stroke, laneIndex);
                      const paceMin = Math.floor(lap.pace / 60);
                      const paceSec = Math.round(lap.pace % 60);
                      
                      return (
                        <button
                          key={stroke}
                          onClick={() => {
                            if (available) {
                              onSelectionChange(laneIndex, { type: 'fastest-lap', strokeType: stroke });
                              setOpenLane(null);
                            }
                          }}
                          disabled={!available}
                          className={`w-full px-3 py-2 text-left ${
                            available
                              ? 'hover:bg-slate-100 dark:hover:bg-slate-700'
                              : 'opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              {strokeLabels[stroke]}
                            </span>
                            <span className="text-xs font-mono text-blue-500">
                              {paceMin}:{paceSec.toString().padStart(2, '0')}/100m
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {lap.activityName} • Lap {lap.lapIndex + 1}
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Timeline scrubber component
 */
export interface TimelineScrubberProps {
  /** Current progress (0-1) */
  progress: number;
  /** Callback when progress changes */
  onProgressChange: (progress: number) => void;
  /** Whether dragging is active */
  onDragStart?: () => void;
  /** When dragging ends */
  onDragEnd?: () => void;
  /** Total duration in seconds */
  totalDuration?: number;
  /** Current lap info */
  currentLap?: {
    index: number;
    total: number;
    strokeType: StrokeType;
  };
}

/**
 * Timeline scrubber for synchronized playback control
 */
export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  progress,
  onProgressChange,
  onDragStart,
  onDragEnd,
  totalDuration,
  currentLap,
}) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    onDragStart?.();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    onProgressChange(Math.max(0, Math.min(1, x)));
  }, [onProgressChange, onDragStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    onProgressChange(Math.max(0, Math.min(1, x)));
  }, [isDragging, onProgressChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    onDragEnd?.();
  }, [onDragEnd]);

  // Format time
  const formatTime = (seconds: number): string => {
    const min = Math.floor(seconds / 60);
    const sec = Math.round(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const currentTime = totalDuration ? progress * totalDuration : 0;

  return (
    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900">
      {/* Lap info */}
      {currentLap && (
        <div className="flex items-center justify-between mb-2 text-xs text-slate-500 dark:text-slate-400">
          <span>
            {t('pool3d.lap', 'Lap')} {currentLap.index + 1}/{currentLap.total}
          </span>
          <span className="capitalize">{currentLap.strokeType}</span>
        </div>
      )}

      {/* Timeline bar */}
      <div
        className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full cursor-pointer"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${progress * 100}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow-md"
          style={{ left: `calc(${progress * 100}% - 8px)` }}
        />
      </div>

      {/* Time display */}
      {totalDuration && (
        <div className="flex justify-between mt-1 text-xs font-mono text-slate-500 dark:text-slate-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      )}
    </div>
  );
};

export default {
  CameraPoolInfo,
  LaneSelector,
  TimelineScrubber,
};
