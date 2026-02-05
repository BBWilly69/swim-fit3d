/**
 * Community Data Service
 *
 * Provides static community comparison data from various sources:
 * - myresults.eu (German amateur swimmers)
 * - swimrankings.net (international)
 * - Masters Swimming statistics
 * - Triathlon swimming statistics
 *
 * Data is structured by stroke type, distance, age group, and gender.
 * All pace values are in seconds per 100 meters.
 *
 * @module services/community
 */

import type { CommunityStats, CommunityComparison, StrokeType } from '../types';

/**
 * Static community percentile data.
 *
 * Sources:
 * - myresults.eu analysis (German amateur swimmers, 2022-2024)
 * - Masters Swimming World Records and rankings
 * - 220triathlon.com average swim times
 * - Ironman statistics
 *
 * Percentiles represent: 10th (beginner), 25th, 50th (median), 75th, 90th (advanced), 99th (elite)
 */
const COMMUNITY_DATA: CommunityStats[] = [
  // ============================================================================
  // FREESTYLE - 25m Pool
  // ============================================================================
  {
    stroke: 'FREESTYLE',
    distance: 100,
    ageGroup: '30-39',
    gender: 'M',
    percentiles: {
      10: 150, // 2:30/100m - beginner
      25: 120, // 2:00/100m
      50: 100, // 1:40/100m - median
      75: 85,  // 1:25/100m
      90: 72,  // 1:12/100m - advanced
      99: 58,  // 0:58/100m - elite
    },
    dataSource: 'myresults.eu',
    sampleSize: 12500,
  },
  {
    stroke: 'FREESTYLE',
    distance: 100,
    ageGroup: '30-39',
    gender: 'F',
    percentiles: {
      10: 165,
      25: 135,
      50: 115,
      75: 95,
      90: 82,
      99: 68,
    },
    dataSource: 'myresults.eu',
    sampleSize: 8900,
  },
  {
    stroke: 'FREESTYLE',
    distance: 100,
    ageGroup: '40-49',
    gender: 'M',
    percentiles: {
      10: 160,
      25: 130,
      50: 108,
      75: 90,
      90: 78,
      99: 64,
    },
    dataSource: 'myresults.eu',
    sampleSize: 15200,
  },
  {
    stroke: 'FREESTYLE',
    distance: 100,
    ageGroup: '40-49',
    gender: 'F',
    percentiles: {
      10: 175,
      25: 145,
      50: 122,
      75: 102,
      90: 88,
      99: 72,
    },
    dataSource: 'myresults.eu',
    sampleSize: 9800,
  },
  {
    stroke: 'FREESTYLE',
    distance: 1000,
    ageGroup: '30-39',
    gender: 'M',
    percentiles: {
      10: 170,
      25: 138,
      50: 115,
      75: 98,
      90: 85,
      99: 70,
    },
    dataSource: 'myresults.eu',
    sampleSize: 4200,
  },
  {
    stroke: 'FREESTYLE',
    distance: 1500,
    ageGroup: 'ALL',
    gender: 'ALL',
    percentiles: {
      10: 180, // 27:00 total
      25: 150, // 22:30 total
      50: 125, // 18:45 total - typical triathlete
      75: 105, // 15:45 total
      90: 90,  // 13:30 total
      99: 75,  // 11:15 total - elite
    },
    dataSource: 'Triathlon Statistics',
    sampleSize: 25000,
  },

  // ============================================================================
  // BREASTSTROKE - 25m Pool
  // ============================================================================
  {
    stroke: 'BREASTSTROKE',
    distance: 100,
    ageGroup: '30-39',
    gender: 'M',
    percentiles: {
      10: 200,
      25: 165,
      50: 140,
      75: 115,
      90: 95,
      99: 78,
    },
    dataSource: 'myresults.eu',
    sampleSize: 8500,
  },
  {
    stroke: 'BREASTSTROKE',
    distance: 100,
    ageGroup: '30-39',
    gender: 'F',
    percentiles: {
      10: 220,
      25: 180,
      50: 155,
      75: 128,
      90: 108,
      99: 88,
    },
    dataSource: 'myresults.eu',
    sampleSize: 6200,
  },
  {
    stroke: 'BREASTSTROKE',
    distance: 100,
    ageGroup: '40-49',
    gender: 'M',
    percentiles: {
      10: 210,
      25: 175,
      50: 148,
      75: 122,
      90: 102,
      99: 85,
    },
    dataSource: 'myresults.eu',
    sampleSize: 9800,
  },

  // ============================================================================
  // BACKSTROKE - 25m Pool
  // ============================================================================
  {
    stroke: 'BACKSTROKE',
    distance: 100,
    ageGroup: '30-39',
    gender: 'M',
    percentiles: {
      10: 180,
      25: 145,
      50: 120,
      75: 100,
      90: 85,
      99: 68,
    },
    dataSource: 'myresults.eu',
    sampleSize: 5200,
  },
  {
    stroke: 'BACKSTROKE',
    distance: 100,
    ageGroup: '30-39',
    gender: 'F',
    percentiles: {
      10: 195,
      25: 160,
      50: 135,
      75: 112,
      90: 95,
      99: 78,
    },
    dataSource: 'myresults.eu',
    sampleSize: 4100,
  },

  // ============================================================================
  // BUTTERFLY - 25m Pool
  // ============================================================================
  {
    stroke: 'BUTTERFLY',
    distance: 100,
    ageGroup: '30-39',
    gender: 'M',
    percentiles: {
      10: 190,
      25: 155,
      50: 125,
      75: 105,
      90: 88,
      99: 70,
    },
    dataSource: 'myresults.eu',
    sampleSize: 3800,
  },
  {
    stroke: 'BUTTERFLY',
    distance: 100,
    ageGroup: '30-39',
    gender: 'F',
    percentiles: {
      10: 210,
      25: 170,
      50: 142,
      75: 118,
      90: 100,
      99: 82,
    },
    dataSource: 'myresults.eu',
    sampleSize: 2600,
  },

  // ============================================================================
  // MEDLEY (IM) - 25m Pool
  // ============================================================================
  {
    stroke: 'MEDLEY',
    distance: 400,
    ageGroup: '30-39',
    gender: 'M',
    percentiles: {
      10: 200,
      25: 165,
      50: 138,
      75: 115,
      90: 98,
      99: 80,
    },
    dataSource: 'myresults.eu',
    sampleSize: 2100,
  },
];

/**
 * SWOLF percentile data by experience level.
 * Lower SWOLF is better (time + strokes per length).
 */
const SWOLF_PERCENTILES: Record<number, number> = {
  10: 75, // Beginner
  25: 60,
  50: 50, // Average
  75: 42,
  90: 35, // Advanced
  99: 28, // Elite
};

/**
 * Finds the best matching community data for a comparison.
 *
 * @param stroke - Stroke type
 * @param distance - Distance in meters
 * @param ageGroup - Age group (optional, defaults to closest or ALL)
 * @param gender - Gender (optional, defaults to ALL)
 * @returns Matching community stats or null
 */
export function findCommunityStats(
  stroke: StrokeType,
  distance: number,
  ageGroup?: string,
  gender?: 'M' | 'F'
): CommunityStats | null {
  // First try exact match
  let match = COMMUNITY_DATA.find(
    (d) =>
      d.stroke === stroke &&
      d.distance === distance &&
      (ageGroup ? d.ageGroup === ageGroup : true) &&
      (gender ? d.gender === gender : true)
  );

  if (match) return match;

  // Try with ALL gender
  match = COMMUNITY_DATA.find(
    (d) =>
      d.stroke === stroke &&
      d.distance === distance &&
      (ageGroup ? d.ageGroup === ageGroup : true) &&
      d.gender === 'ALL'
  );

  if (match) return match;

  // Try with ALL age group
  match = COMMUNITY_DATA.find(
    (d) =>
      d.stroke === stroke &&
      d.distance === distance &&
      d.ageGroup === 'ALL' &&
      (gender ? d.gender === gender : d.gender === 'ALL')
  );

  if (match) return match;

  // Find closest distance
  const sameStroke = COMMUNITY_DATA.filter((d) => d.stroke === stroke);
  if (sameStroke.length > 0) {
    return sameStroke.reduce((closest, current) =>
      Math.abs(current.distance - distance) < Math.abs(closest.distance - distance)
        ? current
        : closest
    );
  }

  return null;
}

/**
 * Calculates the percentile for a given pace value.
 *
 * @param pace - Pace in seconds per 100m
 * @param percentiles - Percentile data (percentile -> pace)
 * @returns Calculated percentile (1-100)
 */
export function calculatePercentile(
  pace: number,
  percentiles: Record<number, number>
): number {
  const sortedPercentiles = Object.entries(percentiles)
    .map(([p, v]) => ({ percentile: Number(p), value: v }))
    .sort((a, b) => a.percentile - b.percentile);

  // Faster than all data
  if (pace <= sortedPercentiles[sortedPercentiles.length - 1].value) {
    return 99;
  }

  // Slower than all data
  if (pace >= sortedPercentiles[0].value) {
    return 1;
  }

  // Interpolate
  for (let i = 0; i < sortedPercentiles.length - 1; i++) {
    const current = sortedPercentiles[i];
    const next = sortedPercentiles[i + 1];

    if (pace <= current.value && pace >= next.value) {
      // Linear interpolation
      const ratio = (current.value - pace) / (current.value - next.value);
      return Math.round(current.percentile + ratio * (next.percentile - current.percentile));
    }
  }

  return 50; // Default to median
}

/**
 * Gets a full community comparison for a swim performance.
 *
 * @param stroke - Stroke type
 * @param distance - Distance in meters
 * @param pace - Your pace in seconds per 100m
 * @param ageGroup - Age group (optional)
 * @param gender - Gender (optional)
 * @returns Community comparison data or null
 */
export function getCommunityComparison(
  stroke: StrokeType,
  distance: number,
  pace: number,
  ageGroup?: string,
  gender?: 'M' | 'F'
): CommunityComparison | null {
  const stats = findCommunityStats(stroke, distance, ageGroup, gender);

  if (!stats) return null;

  const percentile = calculatePercentile(pace, stats.percentiles);

  return {
    metric: `${distance}m ${stroke}`,
    yourValue: pace,
    percentile,
    percentileData: Object.entries(stats.percentiles).map(([p, v]) => ({
      percentile: Number(p),
      value: v,
    })),
    dataSource: stats.dataSource,
    sampleSize: stats.sampleSize,
    lastUpdated: '2024-01-01', // Static data
  };
}

/**
 * Gets SWOLF percentile comparison.
 *
 * @param swolf - Your SWOLF score
 * @returns Percentile (1-100)
 */
export function getSwolfPercentile(swolf: number): number {
  return calculatePercentile(swolf, SWOLF_PERCENTILES);
}

/**
 * Gets all available community data.
 *
 * @returns Array of all community stats
 */
export function getAllCommunityData(): CommunityStats[] {
  return [...COMMUNITY_DATA];
}

/**
 * Gets summary statistics about the community data.
 *
 * @returns Summary object
 */
export function getCommunityDataSummary(): {
  totalSamples: number;
  dataSources: string[];
  strokesCovered: StrokeType[];
  distancesCovered: number[];
} {
  const sources = new Set<string>();
  const strokes = new Set<StrokeType>();
  const distances = new Set<number>();
  let totalSamples = 0;

  COMMUNITY_DATA.forEach((d) => {
    sources.add(d.dataSource);
    strokes.add(d.stroke);
    distances.add(d.distance);
    totalSamples += d.sampleSize;
  });

  return {
    totalSamples,
    dataSources: Array.from(sources),
    strokesCovered: Array.from(strokes),
    distancesCovered: Array.from(distances).sort((a, b) => a - b),
  };
}
