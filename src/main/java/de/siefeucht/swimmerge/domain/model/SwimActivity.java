package de.siefeucht.swimmerge.domain.model;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Represents a complete swim activity session.
 *
 * <p>This is the aggregate root for swim activity data. It contains all
 * lengths and laps from a single swimming session, with metadata about
 * the pool configuration and data source.
 *
 * <p>The activity can originate from:
 * <ul>
 *     <li>GARMIN - Raw import from Garmin Swim 2 FIT file</li>
 *     <li>FORM - Raw import from FORM Smart Swim 2 TCX/CSV</li>
 *     <li>MERGED - Deterministically merged data using best of both sources</li>
 * </ul>
 *
 * <p>Immutable value object.
 *
 * @param id              unique identifier for this activity
 * @param startTime       resolved activity start time
 * @param endTime         resolved activity end time
 * @param poolLengthMeters pool length in meters (typically 25 or 50)
 * @param lengths         all individual lengths (FORM-authoritative)
 * @param laps            reconstructed laps grouped from lengths
 * @param source          origin of this activity data
 */
public record SwimActivity(
        UUID id,
        Instant startTime,
        Instant endTime,
        int poolLengthMeters,
        List<SwimLength> lengths,
        List<SwimLap> laps,
        ActivitySource source
) {

    /**
     * Creates a new SwimActivity with validation.
     *
     * @param id               unique identifier, auto-generated if null
     * @param startTime        activity start, must not be null
     * @param endTime          activity end, must not be null and after startTime
     * @param poolLengthMeters pool length, must be positive (typically 25 or 50)
     * @param lengths          list of lengths, must not be null
     * @param laps             list of laps, must not be null
     * @param source           data source, must not be null
     * @throws IllegalArgumentException if validation fails
     */
    public SwimActivity {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (startTime == null) {
            throw new IllegalArgumentException("Start time must not be null");
        }
        if (endTime == null) {
            throw new IllegalArgumentException("End time must not be null");
        }
        if (!endTime.isAfter(startTime)) {
            throw new IllegalArgumentException(
                    "End time must be after start time. Start: " + startTime + ", End: " + endTime);
        }
        if (poolLengthMeters <= 0) {
            throw new IllegalArgumentException("Pool length must be positive, got: " + poolLengthMeters);
        }
        if (lengths == null) {
            throw new IllegalArgumentException("Lengths must not be null");
        }
        if (laps == null) {
            throw new IllegalArgumentException("Laps must not be null");
        }
        if (source == null) {
            throw new IllegalArgumentException("Source must not be null");
        }
        // Make defensive copies
        lengths = List.copyOf(lengths);
        laps = List.copyOf(laps);
    }

    /**
     * Calculates the total duration of the activity.
     *
     * @return duration between start and end time
     */
    public Duration duration() {
        return Duration.between(startTime, endTime);
    }

    /**
     * Calculates the total distance swum in meters.
     *
     * @return sum of all length distances
     */
    public int totalDistanceMeters() {
        return lengths.stream()
                .mapToInt(SwimLength::distanceMeters)
                .sum();
    }

    /**
     * Returns the total number of lengths swum.
     *
     * @return count of lengths
     */
    public int lengthCount() {
        return lengths.size();
    }

    /**
     * Returns the total number of laps.
     *
     * @return count of laps
     */
    public int lapCount() {
        return laps.size();
    }

    /**
     * Calculates the overall average pace in seconds per 100 meters.
     *
     * @return pace as seconds per 100m, or 0 if no distance
     */
    public double averagePacePer100m() {
        int distance = totalDistanceMeters();
        if (distance == 0) {
            return 0.0;
        }
        return (duration().toMillis() / 1000.0 / distance) * 100.0;
    }

    /**
     * Checks if this activity has been merged from multiple sources.
     *
     * @return true if source is MERGED
     */
    public boolean isMerged() {
        return source == ActivitySource.MERGED;
    }
}
