package de.siefeucht.swimmerge.domain.model;

import java.time.Instant;

/**
 * Represents a single pool length (one direction) in a swim activity.
 *
 * <p>This is the atomic unit of swim tracking. FORM Smart Swim 2 provides
 * highly accurate length detection via turn recognition, making it the
 * authoritative source for length data.
 *
 * <p>Immutable value object following domain-driven design principles.
 *
 * @param index         zero-based index of this length within the activity
 * @param startTime     instant when the swimmer started this length
 * @param endTime       instant when the swimmer completed this length (touched wall)
 * @param distanceMeters distance covered in this length (typically pool length)
 * @param strokeCount   number of strokes taken during this length (nullable)
 * @param strokeRate    strokes per minute during this length (nullable)
 */
public record SwimLength(
        int index,
        Instant startTime,
        Instant endTime,
        int distanceMeters,
        Integer strokeCount,
        Integer strokeRate
) {

    /**
     * Creates a new SwimLength with validation.
     *
     * @param index          zero-based index, must be non-negative
     * @param startTime      start instant, must not be null
     * @param endTime        end instant, must not be null and after startTime
     * @param distanceMeters distance in meters, must be positive
     * @param strokeCount    stroke count, may be null
     * @param strokeRate     stroke rate, may be null
     * @throws IllegalArgumentException if validation fails
     */
    public SwimLength {
        if (index < 0) {
            throw new IllegalArgumentException("Index must be non-negative, got: " + index);
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
        if (distanceMeters <= 0) {
            throw new IllegalArgumentException("Distance must be positive, got: " + distanceMeters);
        }
        if (strokeCount != null && strokeCount < 0) {
            throw new IllegalArgumentException("Stroke count must be non-negative, got: " + strokeCount);
        }
        if (strokeRate != null && strokeRate < 0) {
            throw new IllegalArgumentException("Stroke rate must be non-negative, got: " + strokeRate);
        }
    }

    /**
     * Calculates the duration of this length in seconds.
     *
     * @return duration in seconds as a double for precision
     */
    public double durationSeconds() {
        return (endTime.toEpochMilli() - startTime.toEpochMilli()) / 1000.0;
    }

    /**
     * Calculates the pace in seconds per 100 meters.
     *
     * @return pace as seconds per 100m
     */
    public double pacePer100m() {
        return (durationSeconds() / distanceMeters) * 100.0;
    }
}
