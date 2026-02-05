package de.siefeucht.swimmerge.importer;

import com.garmin.fit.DateTime;
import com.garmin.fit.DisplayMeasure;
import com.garmin.fit.FileIdMesg;
import com.garmin.fit.FitDecoder;
import com.garmin.fit.FitMessages;
import com.garmin.fit.FitRuntimeException;
import com.garmin.fit.LapMesg;
import com.garmin.fit.LengthMesg;
import com.garmin.fit.LengthType;
import com.garmin.fit.Manufacturer;
import com.garmin.fit.SessionMesg;
import de.siefeucht.swimmerge.domain.model.ActivitySource;
import de.siefeucht.swimmerge.domain.model.LapConfidence;
import de.siefeucht.swimmerge.domain.model.SwimActivity;
import de.siefeucht.swimmerge.domain.model.SwimLap;
import de.siefeucht.swimmerge.domain.model.SwimLength;
import de.siefeucht.swimmerge.exception.ImportException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Universal FIT file importer supporting both Garmin and FORM devices.
 *
 * <p>This importer handles FIT files from:
 * <ul>
 *   <li>Garmin Swim 2 - Manufacturer ID: Garmin (1)</li>
 *   <li>FORM Smart Swim 2 - Manufacturer ID: FORM (264)</li>
 * </ul>
 *
 * <p>The source device is automatically detected from the FIT file's FileId message
 * and the activity is tagged appropriately for later merge processing.
 *
 * <p>FIT file structure for pool swimming (from Garmin documentation):
 * <ul>
 *   <li>Length messages: One per pool length (active or idle/rest)</li>
 *   <li>Lap messages: Group active and idle lengths into sets</li>
 *   <li>Session message: Overall activity summary with pool length</li>
 * </ul>
 *
 * @see ActivityImporter
 * @see <a href="https://developer.garmin.com/fit/cookbook/encoding-activity-files/">Garmin FIT Cookbook</a>
 */
@Component
public class FitImporter implements ActivityImporter {

    private static final Logger LOG = LoggerFactory.getLogger(FitImporter.class);

    /**
     * FIT epoch starts at 1989-12-31 00:00:00 UTC.
     * Garmin timestamps are seconds since this epoch.
     */
    private static final Instant FIT_EPOCH = Instant.parse("1989-12-31T00:00:00Z");

    /**
     * FORM manufacturer ID in the FIT protocol.
     */
    private static final int FORM_MANUFACTURER_ID = 264;

    /**
     * Default pool length if not specified in file or parameters.
     */
    private static final int DEFAULT_POOL_LENGTH = 25;

    /**
     * {@inheritDoc}
     */
    @Override
    public SwimActivity importActivity(InputStream inputStream, String fileName, Integer poolLengthMeters) {
        if (inputStream == null) {
            throw new ImportException(fileName, "Input stream must not be null");
        }
        String effectiveFileName = fileName != null ? fileName : "unknown.fit";

        LOG.info("Importing FIT file: {}", effectiveFileName);

        try {
            FitDecoder decoder = new FitDecoder();
            FitMessages messages = decoder.decode(inputStream);

            return buildActivity(messages, effectiveFileName, poolLengthMeters);
        } catch (FitRuntimeException e) {
            throw new ImportException(effectiveFileName, "Failed to decode FIT file: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new ImportException(effectiveFileName, "Unexpected error during import: " + e.getMessage(), e);
        }
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean supports(String fileName) {
        return fileName != null && fileName.toLowerCase().endsWith(".fit");
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public String getFileExtension() {
        return "fit";
    }

    /**
     * Builds a SwimActivity from decoded FIT messages.
     *
     * @param messages         decoded FIT messages
     * @param fileName         original file name
     * @param poolLengthMeters optional pool length override
     * @return constructed SwimActivity
     */
    private SwimActivity buildActivity(FitMessages messages, String fileName, Integer poolLengthMeters) {
        // Detect source device from FileId message
        ActivitySource source = detectSource(messages, fileName);
        
        // Extract session data for overall activity info
        List<SessionMesg> sessions = messages.getSessionMesgs();
        if (sessions.isEmpty()) {
            throw new ImportException(fileName, "No session data found in FIT file");
        }

        SessionMesg session = sessions.get(0);
        
        // Determine pool length
        int poolLength = determinePoolLength(session, poolLengthMeters, fileName);
        
        // Extract timestamps
        Instant startTime = convertTimestamp(session.getStartTime());
        Instant endTime = calculateEndTime(session, startTime);

        // Build lengths from length messages
        List<SwimLength> lengths = buildLengths(messages.getLengthMesgs(), poolLength);
        
        // Build laps from lap messages
        List<SwimLap> laps = buildLaps(messages.getLapMesgs(), lengths, poolLength, source);

        LOG.info("Imported {} activity from {}: {} lengths, {} laps, pool={}m", 
                source, fileName, lengths.size(), laps.size(), poolLength);

        return new SwimActivity(
                UUID.randomUUID(),
                startTime,
                endTime,
                poolLength,
                lengths,
                laps,
                source
        );
    }

    /**
     * Detects the source device from the FIT file's FileId message.
     *
     * @param messages decoded FIT messages
     * @param fileName file name for logging
     * @return detected ActivitySource (GARMIN or FORM)
     */
    private ActivitySource detectSource(FitMessages messages, String fileName) {
        List<FileIdMesg> fileIds = messages.getFileIdMesgs();
        
        if (fileIds.isEmpty()) {
            LOG.warn("No FileId message in {}, defaulting to GARMIN source", fileName);
            return ActivitySource.GARMIN;
        }

        FileIdMesg fileId = fileIds.get(0);
        Integer manufacturerId = fileId.getManufacturer();
        
        if (manufacturerId == null) {
            LOG.warn("No manufacturer in FileId of {}, defaulting to GARMIN source", fileName);
            return ActivitySource.GARMIN;
        }

        if (manufacturerId == FORM_MANUFACTURER_ID) {
            LOG.debug("Detected FORM device (manufacturer ID: {})", manufacturerId);
            return ActivitySource.FORM;
        } else if (manufacturerId == Manufacturer.GARMIN) {
            LOG.debug("Detected Garmin device (manufacturer ID: {})", manufacturerId);
            return ActivitySource.GARMIN;
        } else {
            LOG.warn("Unknown manufacturer ID {} in {}, defaulting to GARMIN", manufacturerId, fileName);
            return ActivitySource.GARMIN;
        }
    }

    /**
     * Calculates the end time from session data.
     *
     * @param session   FIT session message
     * @param startTime calculated start time
     * @return end time, guaranteed to be after start time
     */
    private Instant calculateEndTime(SessionMesg session, Instant startTime) {
        Float elapsedTime = session.getTotalElapsedTime();
        if (elapsedTime != null && elapsedTime > 0) {
            return startTime.plusMillis((long) (elapsedTime * 1000));
        }
        // Fallback: at least 1 second after start
        return startTime.plusSeconds(1);
    }

    /**
     * Determines pool length from session data or override.
     *
     * @param session          FIT session message
     * @param poolLengthMeters optional override
     * @param fileName         for error reporting
     * @return pool length in meters
     */
    private int determinePoolLength(SessionMesg session, Integer poolLengthMeters, String fileName) {
        // 1. Use override if provided
        if (poolLengthMeters != null && poolLengthMeters > 0) {
            return poolLengthMeters;
        }

        // 2. Try to get from FIT file
        Float poolLengthFromFile = session.getPoolLength();
        if (poolLengthFromFile != null && poolLengthFromFile > 0) {
            DisplayMeasure unit = session.getPoolLengthUnit();
            
            // Convert yards to meters if needed
            if (unit == DisplayMeasure.STATUTE) {
                // Pool length in yards, convert to meters
                return (int) Math.round(poolLengthFromFile * 0.9144);
            }
            return poolLengthFromFile.intValue();
        }

        // 3. Default to 25m
        LOG.warn("Pool length not found in FIT file {}, defaulting to {}m", fileName, DEFAULT_POOL_LENGTH);
        return DEFAULT_POOL_LENGTH;
    }

    /**
     * Builds SwimLength objects from FIT length messages.
     *
     * <p>Active lengths represent actual swimming, idle lengths represent rest periods.
     * Only active lengths are included in the result.
     *
     * @param lengthMesgs FIT length messages
     * @param poolLength  pool length in meters
     * @return list of SwimLength objects (active only)
     */
    private List<SwimLength> buildLengths(List<LengthMesg> lengthMesgs, int poolLength) {
        List<SwimLength> lengths = new ArrayList<>();
        
        for (LengthMesg msg : lengthMesgs) {
            // Skip rest intervals (LengthType.IDLE = rest between sets)
            if (msg.getLengthType() == LengthType.IDLE) {
                continue;
            }

            Instant start = convertTimestamp(msg.getStartTime());
            Instant end = calculateLengthEndTime(msg, start);

            Integer strokeCount = extractStrokeCount(msg);
            Integer strokeRate = extractStrokeRate(msg);

            lengths.add(new SwimLength(
                    lengths.size(),
                    start,
                    end,
                    poolLength,
                    strokeCount,
                    strokeRate
            ));
        }

        return lengths;
    }

    /**
     * Calculates the end time for a length message.
     *
     * @param msg   length message
     * @param start calculated start time
     * @return end time, guaranteed to be after start time
     */
    private Instant calculateLengthEndTime(LengthMesg msg, Instant start) {
        Float totalTime = msg.getTotalElapsedTime();
        if (totalTime != null && totalTime > 0) {
            return start.plusMillis((long) (totalTime * 1000));
        }
        // Fallback: use timer time
        Float timerTime = msg.getTotalTimerTime();
        if (timerTime != null && timerTime > 0) {
            return start.plusMillis((long) (timerTime * 1000));
        }
        // Minimum 1 second
        return start.plusSeconds(1);
    }

    /**
     * Extracts stroke count from length message.
     *
     * @param msg length message
     * @return stroke count or null if not available
     */
    private Integer extractStrokeCount(LengthMesg msg) {
        return msg.getTotalStrokes();
    }

    /**
     * Extracts stroke rate from length message.
     *
     * <p>FIT stores cadence as strokes per arm, we convert to total strokes per minute.
     *
     * @param msg length message
     * @return stroke rate (strokes/min) or null if not available
     */
    private Integer extractStrokeRate(LengthMesg msg) {
        Short cadence = msg.getAvgSwimmingCadence();
        if (cadence != null) {
            // Cadence is strokes per arm, multiply by 2 for total
            return cadence.intValue() * 2;
        }
        return null;
    }

    /**
     * Builds SwimLap objects from FIT lap messages.
     *
     * <p>Each lap groups consecutive active lengths into a set. Laps also track
     * rest periods between active sets.
     *
     * @param lapMesgs   FIT lap messages
     * @param lengths    already parsed lengths
     * @param poolLength pool length in meters
     * @param source     detected source device
     * @return list of SwimLap objects
     */
    private List<SwimLap> buildLaps(List<LapMesg> lapMesgs, List<SwimLength> lengths, 
                                     int poolLength, ActivitySource source) {
        List<SwimLap> laps = new ArrayList<>();
        int lengthIndex = 0;

        for (int i = 0; i < lapMesgs.size(); i++) {
            LapMesg msg = lapMesgs.get(i);

            Instant start = convertTimestamp(msg.getStartTime());
            Instant end = calculateLapEndTime(msg, start);

            // Get number of lengths in this lap
            int numLengths = msg.getNumLengths() != null ? msg.getNumLengths() : 0;
            int numActiveLengths = msg.getNumActiveLengths() != null ? msg.getNumActiveLengths() : numLengths;

            // Calculate distance
            int distance = calculateLapDistance(msg, numActiveLengths, poolLength);

            // Collect lengths for this lap
            List<SwimLength> lapLengths = collectLapLengths(lengths, lengthIndex, numActiveLengths, start, end);
            lengthIndex += lapLengths.size();

            // Update times from actual lengths if available
            if (!lapLengths.isEmpty()) {
                start = lapLengths.get(0).startTime();
                end = lapLengths.get(lapLengths.size() - 1).endTime();
            }

            Duration duration = Duration.between(start, end);
            if (duration.isZero() || duration.isNegative()) {
                duration = Duration.ofSeconds(1);
            }

            // Determine confidence based on source
            LapConfidence confidence = source == ActivitySource.FORM 
                    ? LapConfidence.HIGH 
                    : LapConfidence.MEDIUM;

            // Create placeholder length if no lengths found
            if (lapLengths.isEmpty()) {
                lapLengths = List.of(createPlaceholderLength(i, start, end, poolLength));
            }

            laps.add(new SwimLap(
                    i,
                    start,
                    end,
                    distance > 0 ? distance : poolLength,
                    duration,
                    lapLengths,
                    confidence
            ));
        }

        return laps;
    }

    /**
     * Calculates end time for a lap message.
     *
     * @param msg   lap message
     * @param start calculated start time
     * @return end time
     */
    private Instant calculateLapEndTime(LapMesg msg, Instant start) {
        Float totalTime = msg.getTotalElapsedTime();
        if (totalTime != null && totalTime > 0) {
            return start.plusMillis((long) (totalTime * 1000));
        }
        return start.plusSeconds(1);
    }

    /**
     * Calculates total distance for a lap.
     *
     * @param msg              lap message
     * @param numActiveLengths number of active lengths
     * @param poolLength       pool length in meters
     * @return calculated distance in meters
     */
    private int calculateLapDistance(LapMesg msg, int numActiveLengths, int poolLength) {
        // Prefer calculated from lengths
        if (numActiveLengths > 0) {
            return numActiveLengths * poolLength;
        }
        // Fallback to total distance from message
        Float totalDistance = msg.getTotalDistance();
        if (totalDistance != null && totalDistance > 0) {
            return totalDistance.intValue();
        }
        return poolLength;
    }

    /**
     * Collects lengths belonging to a specific lap based on time boundaries.
     *
     * @param lengths    all parsed lengths
     * @param startIndex starting index in lengths list
     * @param maxLengths maximum number of lengths to collect
     * @param lapStart   lap start time
     * @param lapEnd     lap end time
     * @return list of lengths for this lap
     */
    private List<SwimLength> collectLapLengths(List<SwimLength> lengths, int startIndex, 
                                                 int maxLengths, Instant lapStart, Instant lapEnd) {
        List<SwimLength> lapLengths = new ArrayList<>();
        
        for (int i = startIndex; i < lengths.size() && lapLengths.size() < maxLengths; i++) {
            SwimLength length = lengths.get(i);
            // Allow 5 second tolerance for timing
            Instant tolerance = lapEnd.plusSeconds(5);
            if (!length.startTime().isBefore(lapStart.minusSeconds(5)) && 
                !length.endTime().isAfter(tolerance)) {
                lapLengths.add(length);
            }
        }
        
        return lapLengths;
    }

    /**
     * Creates a placeholder length when no length data is available for a lap.
     *
     * @param index      length index
     * @param start      start time
     * @param end        end time
     * @param poolLength distance in meters
     * @return placeholder SwimLength
     */
    private SwimLength createPlaceholderLength(int index, Instant start, Instant end, int poolLength) {
        return new SwimLength(index, start, end, poolLength, null, null);
    }

    /**
     * Converts a FIT timestamp to Java Instant.
     *
     * <p>FIT timestamps are seconds since FIT epoch (1989-12-31 00:00:00 UTC).
     *
     * @param dateTime FIT DateTime object
     * @return Java Instant, or current time if null
     */
    private Instant convertTimestamp(DateTime dateTime) {
        if (dateTime == null) {
            return Instant.now();
        }
        return FIT_EPOCH.plusSeconds(dateTime.getTimestamp());
    }
}
