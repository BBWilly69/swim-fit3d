package de.siefeucht.swimmerge.presentation.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Data Transfer Object for Session Replay data.
 *
 * <p>Provides stroke-by-stroke data for 3D visualization and playback
 * of swim activities. Contains all information needed to render a
 * swimming session in the 3D pool viewer.
 *
 * @param activityId         unique identifier of the swim activity
 * @param totalDurationMs    total session duration in milliseconds
 * @param poolLengthMeters   pool length (25 or 50 meters)
 * @param laneCount          number of lanes in pool visualization (default: 5)
 * @param events             ordered list of stroke events for playback
 * @param lengthMarkers      markers for each length (turn points)
 * @param lapMarkers         markers for each lap (rest points)
 */
@Schema(description = "Session replay data for 3D visualization")
public record SessionReplayDto(

        @Schema(description = "Unique activity identifier")
        UUID activityId,

        @Schema(description = "Total session duration in milliseconds")
        long totalDurationMs,

        @Schema(description = "Pool length in meters", example = "25")
        int poolLengthMeters,

        @Schema(description = "Number of lanes for visualization", example = "5")
        int laneCount,

        @Schema(description = "Ordered list of stroke events")
        List<StrokeEventDto> events,

        @Schema(description = "Length boundary markers")
        List<LengthMarkerDto> lengthMarkers,

        @Schema(description = "Lap boundary markers")
        List<LapMarkerDto> lapMarkers

) {
    /**
     * Creates a SessionReplayDto with validation.
     */
    public SessionReplayDto {
        if (activityId == null) {
            throw new IllegalArgumentException("Activity ID must not be null");
        }
        if (totalDurationMs <= 0) {
            throw new IllegalArgumentException("Total duration must be positive");
        }
        if (poolLengthMeters <= 0) {
            throw new IllegalArgumentException("Pool length must be positive");
        }
        if (laneCount <= 0) {
            throw new IllegalArgumentException("Lane count must be positive");
        }
        events = events == null ? List.of() : List.copyOf(events);
        lengthMarkers = lengthMarkers == null ? List.of() : List.copyOf(lengthMarkers);
        lapMarkers = lapMarkers == null ? List.of() : List.copyOf(lapMarkers);
    }

    /**
     * Represents a single stroke event during playback.
     *
     * @param timestampMs   milliseconds from session start
     * @param positionX     X position in pool (0.0 = start wall, 1.0 = far wall)
     * @param positionY     Y position (lane position, 0.0 = center of lane)
     * @param strokeType    type of stroke being performed
     * @param strokePhase   phase within stroke cycle (0.0-1.0)
     * @param heartRate     heart rate at this moment (nullable)
     * @param velocity      instantaneous velocity m/s (nullable)
     * @param lengthIndex   which length this event belongs to
     */
    @Schema(description = "Individual stroke event for animation")
    public record StrokeEventDto(

            @Schema(description = "Timestamp in milliseconds from session start")
            long timestampMs,

            @Schema(description = "X position in pool (0=start, 1=far wall)", minimum = "0", maximum = "1")
            double positionX,

            @Schema(description = "Y position (lane offset)", minimum = "-0.5", maximum = "0.5")
            double positionY,

            @Schema(description = "Stroke type", example = "FREESTYLE")
            StrokeType strokeType,

            @Schema(description = "Phase within stroke cycle (0-1)", minimum = "0", maximum = "1")
            double strokePhase,

            @Schema(description = "Heart rate in BPM", nullable = true)
            Integer heartRate,

            @Schema(description = "Velocity in m/s", nullable = true)
            Double velocity,

            @Schema(description = "Length index (0-based)")
            int lengthIndex

    ) {}

    /**
     * Stroke type enumeration matching frontend types.
     */
    @Schema(description = "Swimming stroke type")
    public enum StrokeType {
        /** Freestyle / Front Crawl */
        FREESTYLE,
        /** Backstroke */
        BACKSTROKE,
        /** Breaststroke */
        BREASTSTROKE,
        /** Butterfly */
        BUTTERFLY,
        /** Individual Medley (mixed) */
        IM,
        /** Drill / technique work */
        DRILL,
        /** Kicking only */
        KICK,
        /** Rest / standing */
        REST
    }

    /**
     * Marker for a completed length.
     *
     * @param lengthIndex      zero-based index
     * @param startTimestampMs start time in milliseconds
     * @param endTimestampMs   end time in milliseconds
     * @param distanceMeters   distance swum
     * @param strokeCount      number of strokes
     * @param paceSeconds      pace in seconds per 100m
     */
    @Schema(description = "Length marker for timeline")
    public record LengthMarkerDto(

            @Schema(description = "Length index (0-based)")
            int lengthIndex,

            @Schema(description = "Start timestamp in milliseconds")
            long startTimestampMs,

            @Schema(description = "End timestamp in milliseconds")
            long endTimestampMs,

            @Schema(description = "Distance in meters")
            int distanceMeters,

            @Schema(description = "Stroke count")
            Integer strokeCount,

            @Schema(description = "Pace in seconds per 100m")
            double paceSeconds

    ) {}

    /**
     * Marker for a completed lap.
     *
     * @param lapIndex         zero-based index
     * @param startTimestampMs start time in milliseconds
     * @param endTimestampMs   end time in milliseconds
     * @param distanceMeters   total lap distance
     * @param lengthStartIndex first length index in this lap
     * @param lengthEndIndex   last length index in this lap
     * @param label            display label (e.g., "Lap 1")
     */
    @Schema(description = "Lap marker for timeline")
    public record LapMarkerDto(

            @Schema(description = "Lap index (0-based)")
            int lapIndex,

            @Schema(description = "Start timestamp in milliseconds")
            long startTimestampMs,

            @Schema(description = "End timestamp in milliseconds")
            long endTimestampMs,

            @Schema(description = "Total distance in meters")
            int distanceMeters,

            @Schema(description = "First length index in this lap")
            int lengthStartIndex,

            @Schema(description = "Last length index in this lap")
            int lengthEndIndex,

            @Schema(description = "Display label")
            String label

    ) {}
}
