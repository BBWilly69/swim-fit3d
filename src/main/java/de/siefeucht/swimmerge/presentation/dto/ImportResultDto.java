package de.siefeucht.swimmerge.presentation.dto;

import de.siefeucht.swimmerge.domain.model.ActivitySource;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * Data Transfer Object for import operation results.
 *
 * <p>Contains summary information about a successfully imported swim activity
 * and any warnings encountered during the import process.
 *
 * @param activityId     generated unique identifier for the activity
 * @param source         detected source device type
 * @param startTime      activity start timestamp
 * @param endTime        activity end timestamp
 * @param totalDuration  total activity duration
 * @param totalDistance  total distance in meters
 * @param lengthCount    number of pool lengths detected
 * @param lapCount       number of laps detected
 * @param warnings       list of non-fatal issues encountered during import
 */
@Schema(description = "Result of a swim activity import operation")
public record ImportResultDto(

        @Schema(
                description = "Generated unique identifier for the imported activity",
                example = "550e8400-e29b-41d4-a716-446655440000"
        )
        String activityId,

        @Schema(
                description = "Detected source device type",
                example = "GARMIN"
        )
        ActivitySource source,

        @Schema(
                description = "Activity start timestamp (ISO 8601)",
                example = "2024-01-15T10:30:00Z"
        )
        Instant startTime,

        @Schema(
                description = "Activity end timestamp (ISO 8601)",
                example = "2024-01-15T11:15:00Z"
        )
        Instant endTime,

        @Schema(
                description = "Total activity duration in ISO 8601 format",
                example = "PT45M"
        )
        Duration totalDuration,

        @Schema(
                description = "Total distance swum in meters",
                example = "2000"
        )
        int totalDistance,

        @Schema(
                description = "Number of pool lengths detected",
                example = "80"
        )
        int lengthCount,

        @Schema(
                description = "Number of laps/sets detected",
                example = "4"
        )
        int lapCount,

        @Schema(
                description = "Non-fatal warnings encountered during import",
                example = "[\"Missing heart rate data\", \"Stroke type unknown for 2 lengths\"]"
        )
        List<String> warnings

) {
    /**
     * Creates an ImportResultDto without warnings.
     *
     * @param activityId    activity identifier
     * @param source        source device type
     * @param startTime     start timestamp
     * @param endTime       end timestamp
     * @param totalDuration total duration
     * @param totalDistance total distance
     * @param lengthCount   number of lengths
     * @param lapCount      number of laps
     */
    public ImportResultDto(
            String activityId,
            ActivitySource source,
            Instant startTime,
            Instant endTime,
            Duration totalDuration,
            int totalDistance,
            int lengthCount,
            int lapCount
    ) {
        this(activityId, source, startTime, endTime, totalDuration,
                totalDistance, lengthCount, lapCount, List.of());
    }

    /**
     * Returns true if there were any warnings during import.
     *
     * @return true if warnings exist
     */
    public boolean hasWarnings() {
        return warnings != null && !warnings.isEmpty();
    }
}
