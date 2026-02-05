package de.siefeucht.swimmerge.domain.model;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * Represents a lap within a swim activity.
 *
 * <p>A lap is a logical grouping of lengths, typically representing a
 * specific distance (e.g., 100m = 4 lengths in a 25m pool). Laps are
 * reconstructed from FORM length data, not blindly copied from device data.
 *
 * <p>Reconstruction rules:
 * <ul>
 *     <li>Lap start = first length start time</li>
 *     <li>Lap end = last length end time</li>
 *     <li>Distance = sum of contained length distances</li>
 * </ul>
 *
 * <p>Immutable value object.
 *
 * @param lapIndex       zero-based index of this lap within the activity
 * @param startTime      instant when the first length of this lap started
 * @param endTime        instant when the last length of this lap ended
 * @param distanceMeters total distance covered in this lap
 * @param duration       elapsed time for this lap
 * @param lengths        list of lengths comprising this lap
 * @param confidence     confidence score for merge quality
 */
public record SwimLap(
        int lapIndex,
        Instant startTime,
        Instant endTime,
        int distanceMeters,
        Duration duration,
        List<SwimLength> lengths,
        LapConfidence confidence
) {

    /**
     * Creates a new SwimLap with validation.
     *
     * @param lapIndex       zero-based index, must be non-negative
     * @param startTime      start instant, must not be null
     * @param endTime        end instant, must not be null and after startTime
     * @param distanceMeters total distance, must be positive
     * @param duration       lap duration, must not be null
     * @param lengths        list of lengths, must not be null or empty
     * @param confidence     confidence level, must not be null
     * @throws IllegalArgumentException if validation fails
     */
    public SwimLap {
        if (lapIndex < 0) {
            throw new IllegalArgumentException("Lap index must be non-negative, got: " + lapIndex);
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
        if (duration == null) {
            throw new IllegalArgumentException("Duration must not be null");
        }
        if (lengths == null || lengths.isEmpty()) {
            throw new IllegalArgumentException("Lengths must not be null or empty");
        }
        if (confidence == null) {
            throw new IllegalArgumentException("Confidence must not be null");
        }
        // Make defensive copy to ensure immutability
        lengths = List.copyOf(lengths);
    }

    /**
     * Calculates the average pace for this lap in seconds per 100 meters.
     *
     * @return pace as seconds per 100m
     */
    public double pacePer100m() {
        return (duration.toMillis() / 1000.0 / distanceMeters) * 100.0;
    }

    /**
     * Returns the number of lengths in this lap.
     *
     * @return count of lengths
     */
    public int lengthCount() {
        return lengths.size();
    }

    /**
     * Calculates the average stroke count per length in this lap.
     *
     * @return average stroke count, or null if no stroke data available
     */
    public Double averageStrokeCount() {
        List<Integer> counts = lengths.stream()
                .map(SwimLength::strokeCount)
                .filter(c -> c != null)
                .toList();

        if (counts.isEmpty()) {
            return null;
        }

        return counts.stream()
                .mapToInt(Integer::intValue)
                .average()
                .orElse(0.0);
    }
}
