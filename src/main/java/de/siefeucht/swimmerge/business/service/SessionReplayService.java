package de.siefeucht.swimmerge.business.service;

import de.siefeucht.swimmerge.domain.model.SwimActivity;
import de.siefeucht.swimmerge.domain.model.SwimLap;
import de.siefeucht.swimmerge.domain.model.SwimLength;
import de.siefeucht.swimmerge.presentation.dto.SessionReplayDto;
import de.siefeucht.swimmerge.presentation.dto.SessionReplayDto.LapMarkerDto;
import de.siefeucht.swimmerge.presentation.dto.SessionReplayDto.LengthMarkerDto;
import de.siefeucht.swimmerge.presentation.dto.SessionReplayDto.StrokeEventDto;
import de.siefeucht.swimmerge.presentation.dto.SessionReplayDto.StrokeType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service for generating session replay data from swim activities.
 *
 * <p>Transforms {@link SwimActivity} domain objects into {@link SessionReplayDto}
 * objects suitable for 3D visualization and stroke-by-stroke playback.
 *
 * <p>The service generates synthetic stroke events based on length timing
 * and stroke count data, providing smooth animation keyframes for the
 * 3D pool visualization.
 */
@Service
public class SessionReplayService {

    private static final Logger LOG = LoggerFactory.getLogger(SessionReplayService.class);

    /**
     * Default number of lanes for pool visualization.
     */
    private static final int DEFAULT_LANE_COUNT = 5;

    /**
     * Number of stroke events to generate per second for smooth animation.
     */
    private static final int EVENTS_PER_SECOND = 10;

    /**
     * In-memory cache for demo purposes. Replace with repository in production.
     */
    private final Map<UUID, SwimActivity> activityCache = new ConcurrentHashMap<>();

    /**
     * Creates session replay data for a given activity.
     *
     * @param activity the swim activity to transform
     * @return session replay DTO ready for frontend consumption
     */
    public SessionReplayDto createReplayData(SwimActivity activity) {
        LOG.info("Creating session replay data for activity {}", activity.id());

        Instant sessionStart = activity.startTime();
        long totalDurationMs = Duration.between(sessionStart, activity.endTime()).toMillis();

        List<StrokeEventDto> events = generateStrokeEvents(activity, sessionStart);
        List<LengthMarkerDto> lengthMarkers = generateLengthMarkers(activity, sessionStart);
        List<LapMarkerDto> lapMarkers = generateLapMarkers(activity, sessionStart);

        LOG.info("Generated {} events, {} length markers, {} lap markers",
                events.size(), lengthMarkers.size(), lapMarkers.size());

        return new SessionReplayDto(
                activity.id(),
                totalDurationMs,
                activity.poolLengthMeters(),
                DEFAULT_LANE_COUNT,
                events,
                lengthMarkers,
                lapMarkers
        );
    }

    /**
     * Retrieves an activity by ID from the cache.
     *
     * @param activityId the activity UUID
     * @return optional containing the activity if found
     */
    public Optional<SwimActivity> getActivity(UUID activityId) {
        return Optional.ofNullable(activityCache.get(activityId));
    }

    /**
     * Caches an activity for later retrieval.
     *
     * @param activity the activity to cache
     */
    public void cacheActivity(SwimActivity activity) {
        activityCache.put(activity.id(), activity);
        LOG.debug("Cached activity {}", activity.id());
    }

    /**
     * Returns all cached activity IDs.
     *
     * @return list of cached activity UUIDs
     */
    public List<UUID> getCachedActivityIds() {
        return List.copyOf(activityCache.keySet());
    }

    /**
     * Generates synthetic stroke events for smooth animation.
     *
     * <p>Creates evenly-spaced events throughout each length based on
     * the stroke count and timing data. Events include position, stroke
     * phase, and optional metrics like heart rate.
     *
     * @param activity     the source activity
     * @param sessionStart reference start time
     * @return list of stroke events ordered by timestamp
     */
    private List<StrokeEventDto> generateStrokeEvents(SwimActivity activity, Instant sessionStart) {
        List<StrokeEventDto> events = new ArrayList<>();

        for (SwimLength length : activity.lengths()) {
            long startMs = Duration.between(sessionStart, length.startTime()).toMillis();
            long endMs = Duration.between(sessionStart, length.endTime()).toMillis();
            long durationMs = endMs - startMs;

            // Determine direction based on length index (even = forward, odd = backward)
            boolean forward = (length.index() % 2) == 0;

            // Calculate number of events for this length
            int eventCount = Math.max(1, (int) (durationMs / 1000.0 * EVENTS_PER_SECOND));

            // Determine stroke type (default to freestyle for now)
            StrokeType strokeType = determineStrokeType(length);

            // Calculate velocity
            double velocity = length.distanceMeters() / (durationMs / 1000.0);

            for (int i = 0; i < eventCount; i++) {
                double progress = (double) i / eventCount;
                long timestampMs = startMs + (long) (durationMs * progress);

                // Position calculation
                double positionX = forward ? progress : (1.0 - progress);

                // Stroke phase cycles through 0-1 based on stroke count
                int strokesInLength = length.strokeCount() != null ? length.strokeCount() : 15;
                double strokePhase = (progress * strokesInLength) % 1.0;

                events.add(new StrokeEventDto(
                        timestampMs,
                        positionX,
                        0.0, // Center of lane
                        strokeType,
                        strokePhase,
                        null, // Heart rate - could be added from Garmin data
                        velocity,
                        length.index()
                ));
            }
        }

        // Sort by timestamp (should already be sorted, but ensure)
        events.sort((a, b) -> Long.compare(a.timestampMs(), b.timestampMs()));

        return events;
    }

    /**
     * Generates length markers for the timeline.
     *
     * @param activity     the source activity
     * @param sessionStart reference start time
     * @return list of length markers
     */
    private List<LengthMarkerDto> generateLengthMarkers(SwimActivity activity, Instant sessionStart) {
        return activity.lengths().stream()
                .map(length -> new LengthMarkerDto(
                        length.index(),
                        Duration.between(sessionStart, length.startTime()).toMillis(),
                        Duration.between(sessionStart, length.endTime()).toMillis(),
                        length.distanceMeters(),
                        length.strokeCount(),
                        length.pacePer100m()
                ))
                .toList();
    }

    /**
     * Generates lap markers for the timeline.
     *
     * @param activity     the source activity
     * @param sessionStart reference start time
     * @return list of lap markers
     */
    private List<LapMarkerDto> generateLapMarkers(SwimActivity activity, Instant sessionStart) {
        return activity.laps().stream()
                .map(lap -> {
                    List<SwimLength> lapLengths = lap.lengths();
                    int startIndex = lapLengths.isEmpty() ? 0 : lapLengths.get(0).index();
                    int endIndex = lapLengths.isEmpty() ? 0 : lapLengths.get(lapLengths.size() - 1).index();

                    return new LapMarkerDto(
                            lap.lapIndex(),
                            Duration.between(sessionStart, lap.startTime()).toMillis(),
                            Duration.between(sessionStart, lap.endTime()).toMillis(),
                            lap.distanceMeters(),
                            startIndex,
                            endIndex,
                            "Lap " + (lap.lapIndex() + 1)
                    );
                })
                .toList();
    }

    /**
     * Determines the stroke type for a given length.
     *
     * <p>Currently defaults to FREESTYLE. In a full implementation,
     * this would analyze stroke patterns from FORM data.
     *
     * @param length the swim length
     * @return detected or default stroke type
     */
    private StrokeType determineStrokeType(SwimLength length) {
        // TODO: Implement stroke detection from FORM data
        // For now, default to freestyle
        return StrokeType.FREESTYLE;
    }

    /**
     * Generates demo replay data for testing without real activity data.
     *
     * @param durationMinutes duration of the demo session
     * @param poolLength      pool length in meters
     * @return demo session replay DTO
     */
    public SessionReplayDto generateDemoReplayData(int durationMinutes, int poolLength) {
        LOG.info("Generating demo replay data: {}min, {}m pool", durationMinutes, poolLength);

        UUID activityId = UUID.randomUUID();
        Instant sessionStart = Instant.now().minusSeconds(durationMinutes * 60L);
        long totalDurationMs = durationMinutes * 60L * 1000L;

        // Calculate approximate lengths based on typical pace (2:00/100m)
        double paceSecondsPerLength = (120.0 / 100.0) * poolLength;
        int lengthCount = (int) ((durationMinutes * 60.0) / paceSecondsPerLength);

        List<StrokeEventDto> events = new ArrayList<>();
        List<LengthMarkerDto> lengthMarkers = new ArrayList<>();
        List<LapMarkerDto> lapMarkers = new ArrayList<>();

        long currentTimeMs = 0;
        int lengthsPerLap = 4; // 100m laps

        for (int lengthIndex = 0; lengthIndex < lengthCount; lengthIndex++) {
            // Add some variation to pace (±10%)
            double variation = 0.9 + (Math.random() * 0.2);
            long lengthDurationMs = (long) (paceSecondsPerLength * 1000 * variation);

            long startMs = currentTimeMs;
            long endMs = currentTimeMs + lengthDurationMs;

            // Add length marker
            int strokeCount = 12 + (int) (Math.random() * 6); // 12-18 strokes
            double pace = (lengthDurationMs / 1000.0 / poolLength) * 100.0;

            lengthMarkers.add(new LengthMarkerDto(
                    lengthIndex, startMs, endMs, poolLength, strokeCount, pace
            ));

            // Generate stroke events
            boolean forward = (lengthIndex % 2) == 0;
            int eventCount = (int) (lengthDurationMs / 100); // 10 events/second

            for (int i = 0; i < eventCount; i++) {
                double progress = (double) i / eventCount;
                long timestampMs = startMs + (long) (lengthDurationMs * progress);
                double positionX = forward ? progress : (1.0 - progress);
                double strokePhase = (progress * strokeCount) % 1.0;
                double velocity = poolLength / (lengthDurationMs / 1000.0);

                events.add(new StrokeEventDto(
                        timestampMs, positionX, 0.0,
                        StrokeType.FREESTYLE, strokePhase,
                        145 + (int) (Math.random() * 20), // HR 145-165
                        velocity, lengthIndex
                ));
            }

            // Add lap marker every 4 lengths
            if ((lengthIndex + 1) % lengthsPerLap == 0) {
                int lapIndex = lengthIndex / lengthsPerLap;
                int lapStartLength = lapIndex * lengthsPerLap;
                LengthMarkerDto firstLength = lengthMarkers.get(lapStartLength);

                lapMarkers.add(new LapMarkerDto(
                        lapIndex,
                        firstLength.startTimestampMs(),
                        endMs,
                        poolLength * lengthsPerLap,
                        lapStartLength,
                        lengthIndex,
                        "Lap " + (lapIndex + 1)
                ));

                // Add 10-15 seconds rest between laps
                currentTimeMs = endMs + 10000 + (long) (Math.random() * 5000);
            } else {
                currentTimeMs = endMs;
            }
        }

        return new SessionReplayDto(
                activityId,
                totalDurationMs,
                poolLength,
                DEFAULT_LANE_COUNT,
                events,
                lengthMarkers,
                lapMarkers
        );
    }
}
