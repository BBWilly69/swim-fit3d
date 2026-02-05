/**
 * 3D Components Index
 *
 * Re-exports all 3D visualization components.
 * Components are designed for lazy-loading via React.lazy().
 *
 * @module components/3d
 */

// Main analysis pool (5-lane professional pool)
export { AnalysisPool3D } from './AnalysisPool3D';
export type { AnalysisPool3DProps, LaneSwimmerData } from './AnalysisPool3D';

// Legacy SwimPool3D (deprecated - use AnalysisPool3D)
export { SwimPool3D } from './SwimPool3D';
export type { SwimPool3DProps, LaneData, LaneSelectionType, LaneSelection } from './SwimPool3D';

// Swimmer component
export { SimpleLaneSwimmer, EXAMPLE_LENGTH_DATA } from './SimpleLaneSwimmer';
export type { SimpleLaneSwimmerProps, LengthData, StrokeType, SwimmerState } from './SimpleLaneSwimmer';

// Demo component (single lane)
export { SimpleLaneDemo } from './SimpleLaneDemo';
export type { SimpleLaneDemoProps } from './SimpleLaneDemo';

// Water effects (for custom implementations)
export { 
  MultiSwimmerWaterSurface, 
  MultiSwimmerSplashParticles,
  SPLASH_CONFIG,
} from './MultiSwimmerWaterEffects';
export type { SwimmerEffectsData } from './MultiSwimmerWaterEffects';

// UI Controls
export { 
  CameraPoolInfo, 
  LaneSelector, 
  TimelineScrubber,
} from './SwimPool3DControls';
export type { 
  CameraPoolInfoProps, 
  LaneSelectorProps, 
  LaneSelectionState,
  ActivityOption,
  FastestLapOption,
  TimelineScrubberProps,
} from './SwimPool3DControls';
