/**
 * Formatters Utility Module
 *
 * Provides formatting functions for swim-related data.
 *
 * @module utils/formatters
 */

/**
 * Formats pace in seconds per 100m to mm:ss format.
 *
 * @param secondsPer100m - Pace in seconds per 100 meters
 * @returns Formatted pace string (e.g., "1:45")
 *
 * @example
 * formatPace(105) // returns "1:45"
 * formatPace(90)  // returns "1:30"
 */
export function formatPace(secondsPer100m: number): string {
  if (!secondsPer100m || secondsPer100m <= 0) return '--:--';
  const minutes = Math.floor(secondsPer100m / 60);
  const seconds = Math.floor(secondsPer100m % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Formats duration in seconds to HH:MM:SS or MM:SS format.
 *
 * @param seconds - Duration in seconds
 * @param format - 'short' (default), 'long', 'minimal', or boolean for forceHours
 * @returns Formatted duration string
 *
 * @example
 * formatDuration(3665) // returns "1:01:05"
 * formatDuration(125)  // returns "2:05"
 * formatDuration(125, 'minimal') // returns "2m"
 */
export function formatDuration(seconds: number, format: boolean | 'short' | 'long' | 'minimal' = false): string {
  if (!seconds || seconds < 0) return '--:--';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (format === 'minimal') {
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  if (format === 'long') {
    if (hours > 0) return `${hours}h ${minutes}min ${secs}s`;
    return `${minutes}min ${secs}s`;
  }

  const forceHours = format === true;
  if (hours > 0 || forceHours) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formats distance in meters with appropriate unit.
 *
 * @param meters - Distance in meters
 * @returns Formatted distance string with unit
 *
 * @example
 * formatDistance(2500) // returns "2.5 km"
 * formatDistance(850)  // returns "850 m"
 */
export function formatDistance(meters: number): string {
  if (!meters || meters < 0) return '-- m';
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${meters} m`;
}

/**
 * Formats SWOLF score (swim golf).
 *
 * @param swolf - SWOLF score
 * @returns Formatted SWOLF string
 */
export function formatSwolf(swolf: number): string {
  if (!swolf || swolf <= 0) return '--';
  return swolf.toFixed(0);
}

/**
 * Formats stroke rate in strokes per minute.
 *
 * @param strokesPerMinute - Stroke rate
 * @returns Formatted stroke rate string
 */
export function formatStrokeRate(strokesPerMinute: number): string {
  if (!strokesPerMinute || strokesPerMinute <= 0) return '-- spm';
  return `${strokesPerMinute.toFixed(1)} spm`;
}

/**
 * Formats heart rate in beats per minute.
 *
 * @param bpm - Heart rate in BPM
 * @returns Formatted heart rate string
 */
export function formatHeartRate(bpm: number): string {
  if (!bpm || bpm <= 0) return '-- bpm';
  return `${Math.round(bpm)} bpm`;
}

/**
 * Formats a percentage value.
 *
 * @param value - Decimal percentage (0-1) or percentage (0-100)
 * @param isDecimal - Whether input is decimal (0-1)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, isDecimal = false): string {
  if (value === null || value === undefined) return '--%';
  const pct = isDecimal ? value * 100 : value;
  return `${pct.toFixed(1)}%`;
}

/**
 * Formats calories burned.
 *
 * @param calories - Calories value
 * @returns Formatted calories string
 */
export function formatCalories(calories: number): string {
  if (!calories || calories <= 0) return '-- kcal';
  return `${Math.round(calories)} kcal`;
}

/**
 * Formats efficiency score (DPS - distance per stroke).
 *
 * @param metersPerStroke - Distance per stroke in meters
 * @returns Formatted efficiency string
 */
export function formatEfficiency(metersPerStroke: number): string {
  if (!metersPerStroke || metersPerStroke <= 0) return '-- m/str';
  return `${metersPerStroke.toFixed(2)} m/str`;
}

/**
 * Formats estimated time of arrival/completion.
 *
 * @param seconds - Remaining seconds
 * @returns Formatted ETA string
 */
export function formatEta(seconds: number): string {
  if (!seconds || seconds <= 0) return '--';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Formats a number with locale-appropriate separators.
 *
 * @param value - Number to format
 * @param decimals - Number of decimal places (default 0)
 * @returns Formatted number string
 */
export function formatNumber(value: number, decimals = 0): string {
  if (value === null || value === undefined || isNaN(value)) return '--';
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
