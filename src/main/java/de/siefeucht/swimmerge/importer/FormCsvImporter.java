package de.siefeucht.swimmerge.importer;

import de.siefeucht.swimmerge.domain.model.ActivitySource;
import de.siefeucht.swimmerge.domain.model.LapConfidence;
import de.siefeucht.swimmerge.domain.model.SwimActivity;
import de.siefeucht.swimmerge.domain.model.SwimLap;
import de.siefeucht.swimmerge.domain.model.SwimLength;
import de.siefeucht.swimmerge.exception.ImportException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Importer for FORM Smart Swim 2 CSV export files.
 *
 * <p>FORM allows exporting swim activity data as CSV files. This importer
 * parses the CSV format and creates SwimActivity domain objects.
 *
 * <p>CSV structure (example):
 * <pre>
 * Date,Time,Pool Length,Total Distance,Total Time,Laps,...
 * 2024-01-15,10:30:00,25,1000,00:30:00,40,...
 * </pre>
 *
 * <p>FORM CSV data is highly accurate for:
 * <ul>
 *   <li>Length/turn counting (turn detection)</li>
 *   <li>Stroke type classification</li>
 *   <li>Stroke counting</li>
 * </ul>
 *
 * @see ActivityImporter
 * @see FitImporter
 */
@Component
public class FormCsvImporter implements ActivityImporter {

    private static final Logger LOG = LoggerFactory.getLogger(FormCsvImporter.class);

    private static final String FILE_EXTENSION = "csv";
    private static final int DEFAULT_POOL_LENGTH = 25;

    /**
     * Common CSV column names used by FORM exports.
     * Names are case-insensitive during parsing.
     */
    private static final String COL_DATE = "date";
    private static final String COL_TIME = "time";
    private static final String COL_START_TIME = "start_time";
    private static final String COL_POOL_LENGTH = "pool_length";
    private static final String COL_TOTAL_DISTANCE = "total_distance";
    private static final String COL_TOTAL_TIME = "total_time";
    private static final String COL_DURATION = "duration";
    private static final String COL_LAPS = "laps";
    private static final String COL_LENGTHS = "lengths";
    private static final String COL_STROKE_TYPE = "stroke_type";
    private static final String COL_STROKE_COUNT = "stroke_count";
    private static final String COL_SWOLF = "swolf";

    /**
     * Date/time formatters for various FORM CSV formats.
     */
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss");
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_DATE_TIME;

    /**
     * {@inheritDoc}
     */
    @Override
    public SwimActivity importActivity(InputStream inputStream, String fileName, Integer poolLengthMeters) {
        Objects.requireNonNull(inputStream, "inputStream must not be null");
        String effectiveFileName = fileName != null ? fileName : "unknown.csv";

        LOG.info("Importing FORM CSV file: {}", effectiveFileName);

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            
            // Read header line
            String headerLine = reader.readLine();
            if (headerLine == null || headerLine.isBlank()) {
                throw new ImportException(effectiveFileName, "CSV file is empty");
            }

            Map<String, Integer> columnIndex = parseHeader(headerLine);
            
            // Read data lines
            List<String[]> dataRows = new ArrayList<>();
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.isBlank()) {
                    dataRows.add(parseCsvLine(line));
                }
            }

            if (dataRows.isEmpty()) {
                throw new ImportException(effectiveFileName, "CSV file contains no data rows");
            }

            return buildActivity(dataRows, columnIndex, effectiveFileName, poolLengthMeters);
            
        } catch (ImportException e) {
            throw e;
        } catch (Exception e) {
            throw new ImportException(effectiveFileName, "Failed to parse CSV: " + e.getMessage(), e);
        }
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean supports(String fileName) {
        return fileName != null && fileName.toLowerCase().endsWith("." + FILE_EXTENSION);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public String getFileExtension() {
        return FILE_EXTENSION;
    }

    /**
     * Parses the CSV header line and returns a map of column names to indices.
     *
     * @param headerLine the CSV header line
     * @return map of lowercase column names to their index
     */
    private Map<String, Integer> parseHeader(String headerLine) {
        String[] columns = parseCsvLine(headerLine);
        
        return java.util.stream.IntStream.range(0, columns.length)
                .boxed()
                .collect(Collectors.toMap(
                        i -> columns[i].toLowerCase().trim().replace(" ", "_"),
                        i -> i,
                        (a, b) -> a  // Keep first occurrence for duplicates
                ));
    }

    /**
     * Parses a single CSV line respecting quoted fields.
     *
     * @param line the CSV line to parse
     * @return array of field values
     */
    private String[] parseCsvLine(String line) {
        List<String> fields = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;

        for (char c : line.toCharArray()) {
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                fields.add(current.toString().trim());
                current = new StringBuilder();
            } else {
                current.append(c);
            }
        }
        fields.add(current.toString().trim());

        return fields.toArray(new String[0]);
    }

    /**
     * Builds a SwimActivity from parsed CSV data.
     *
     * @param dataRows         parsed data rows
     * @param columnIndex      column name to index mapping
     * @param fileName         file name for error reporting
     * @param poolLengthMeters optional pool length override
     * @return constructed SwimActivity
     */
    private SwimActivity buildActivity(List<String[]> dataRows, Map<String, Integer> columnIndex,
                                       String fileName, Integer poolLengthMeters) {
        // Use first row for activity-level data
        String[] firstRow = dataRows.get(0);
        
        // Determine pool length
        int poolLength = determinePoolLength(firstRow, columnIndex, poolLengthMeters);
        
        // Parse activity times
        Instant startTime = parseStartTime(firstRow, columnIndex, fileName);
        Duration totalDuration = parseDuration(firstRow, columnIndex);
        Instant endTime = startTime.plus(totalDuration);
        
        // Ensure end is after start
        if (!endTime.isAfter(startTime)) {
            endTime = startTime.plusSeconds(1);
        }

        // Build lengths from rows (each row might represent a length or summary)
        List<SwimLength> lengths = buildLengths(dataRows, columnIndex, poolLength, startTime);
        
        // Build laps grouping lengths
        List<SwimLap> laps = buildLaps(lengths, dataRows, columnIndex, poolLength);

        LOG.info("Imported FORM CSV activity: {} lengths, {} laps, pool={}m", 
                lengths.size(), laps.size(), poolLength);

        return new SwimActivity(
                UUID.randomUUID(),
                startTime,
                endTime,
                poolLength,
                lengths,
                laps,
                ActivitySource.FORM
        );
    }

    /**
     * Determines pool length from CSV data or override.
     *
     * @param row              data row
     * @param columnIndex      column mapping
     * @param poolLengthMeters optional override
     * @return pool length in meters
     */
    private int determinePoolLength(String[] row, Map<String, Integer> columnIndex, Integer poolLengthMeters) {
        if (poolLengthMeters != null && poolLengthMeters > 0) {
            return poolLengthMeters;
        }
        
        Integer poolColIdx = columnIndex.get(COL_POOL_LENGTH);
        if (poolColIdx != null && poolColIdx < row.length) {
            String value = row[poolColIdx].trim();
            try {
                int parsed = Integer.parseInt(value.replaceAll("[^0-9]", ""));
                if (parsed > 0) {
                    return parsed;
                }
            } catch (NumberFormatException e) {
                LOG.debug("Could not parse pool length: {}", value);
            }
        }
        
        return DEFAULT_POOL_LENGTH;
    }

    /**
     * Parses the activity start time from CSV data.
     *
     * @param row         data row
     * @param columnIndex column mapping
     * @param fileName    file name for error reporting
     * @return parsed start time
     */
    private Instant parseStartTime(String[] row, Map<String, Integer> columnIndex, String fileName) {
        // Try combined start_time column
        Integer startTimeIdx = columnIndex.get(COL_START_TIME);
        if (startTimeIdx != null && startTimeIdx < row.length) {
            Instant parsed = parseTimestamp(row[startTimeIdx]);
            if (parsed != null) return parsed;
        }

        // Try separate date and time columns
        Integer dateIdx = columnIndex.get(COL_DATE);
        Integer timeIdx = columnIndex.get(COL_TIME);
        
        if (dateIdx != null && timeIdx != null && dateIdx < row.length && timeIdx < row.length) {
            String dateStr = row[dateIdx].trim();
            String timeStr = row[timeIdx].trim();
            
            try {
                LocalDateTime ldt = LocalDateTime.parse(dateStr + " " + timeStr, DATETIME_FORMATTER);
                return ldt.toInstant(ZoneOffset.UTC);
            } catch (DateTimeParseException e) {
                LOG.debug("Could not parse date/time: {} {}", dateStr, timeStr);
            }
        }

        LOG.warn("Could not parse start time from {}, using current time", fileName);
        return Instant.now();
    }

    /**
     * Parses a timestamp string in various formats.
     *
     * @param value timestamp string
     * @return parsed Instant or null
     */
    private Instant parseTimestamp(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        
        String trimmed = value.trim();
        
        // Try ISO format
        try {
            return Instant.parse(trimmed);
        } catch (DateTimeParseException ignored) {}
        
        // Try ISO date-time
        try {
            return LocalDateTime.parse(trimmed, ISO_FORMATTER).toInstant(ZoneOffset.UTC);
        } catch (DateTimeParseException ignored) {}
        
        // Try custom format
        try {
            return LocalDateTime.parse(trimmed, DATETIME_FORMATTER).toInstant(ZoneOffset.UTC);
        } catch (DateTimeParseException ignored) {}
        
        return null;
    }

    /**
     * Parses total duration from CSV data.
     *
     * @param row         data row
     * @param columnIndex column mapping
     * @return parsed duration or default
     */
    private Duration parseDuration(String[] row, Map<String, Integer> columnIndex) {
        // Try total_time column
        Integer timeIdx = columnIndex.get(COL_TOTAL_TIME);
        if (timeIdx != null && timeIdx < row.length) {
            Duration parsed = parseDurationString(row[timeIdx]);
            if (parsed != null) return parsed;
        }

        // Try duration column
        Integer durationIdx = columnIndex.get(COL_DURATION);
        if (durationIdx != null && durationIdx < row.length) {
            Duration parsed = parseDurationString(row[durationIdx]);
            if (parsed != null) return parsed;
        }

        return Duration.ofMinutes(30); // Default fallback
    }

    /**
     * Parses a duration string in HH:MM:SS or MM:SS format.
     *
     * @param value duration string
     * @return parsed Duration or null
     */
    private Duration parseDurationString(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        
        String trimmed = value.trim();
        String[] parts = trimmed.split(":");
        
        try {
            if (parts.length == 3) {
                // HH:MM:SS
                int hours = Integer.parseInt(parts[0]);
                int minutes = Integer.parseInt(parts[1]);
                int seconds = Integer.parseInt(parts[2].split("\\.")[0]); // Remove milliseconds
                return Duration.ofHours(hours).plusMinutes(minutes).plusSeconds(seconds);
            } else if (parts.length == 2) {
                // MM:SS
                int minutes = Integer.parseInt(parts[0]);
                int seconds = Integer.parseInt(parts[1].split("\\.")[0]);
                return Duration.ofMinutes(minutes).plusSeconds(seconds);
            }
        } catch (NumberFormatException e) {
            LOG.debug("Could not parse duration: {}", value);
        }
        
        return null;
    }

    /**
     * Builds SwimLength objects from CSV data.
     *
     * <p>If CSV contains length-level data, each row becomes a length.
     * Otherwise, creates synthetic lengths from summary data.
     *
     * @param dataRows    parsed data rows
     * @param columnIndex column mapping
     * @param poolLength  pool length in meters
     * @param startTime   activity start time
     * @return list of SwimLength objects
     */
    private List<SwimLength> buildLengths(List<String[]> dataRows, Map<String, Integer> columnIndex,
                                           int poolLength, Instant startTime) {
        List<SwimLength> lengths = new ArrayList<>();
        
        // Check if we have length-level data (multiple rows with individual length data)
        boolean hasLengthData = dataRows.size() > 1 || columnIndex.containsKey(COL_STROKE_COUNT);
        
        if (hasLengthData && dataRows.size() > 1) {
            // Each row is a length
            Instant currentTime = startTime;
            
            for (int i = 0; i < dataRows.size(); i++) {
                String[] row = dataRows.get(i);
                
                // Parse duration for this length (default 30 seconds)
                Duration lengthDuration = Duration.ofSeconds(30);
                Integer durationIdx = columnIndex.get(COL_DURATION);
                if (durationIdx != null && durationIdx < row.length) {
                    Duration parsed = parseDurationString(row[durationIdx]);
                    if (parsed != null) lengthDuration = parsed;
                }
                
                Instant endTime = currentTime.plus(lengthDuration);
                
                Integer strokeCount = parseIntColumn(row, columnIndex, COL_STROKE_COUNT);
                Integer strokeRate = calculateStrokeRate(strokeCount, lengthDuration.toSeconds());
                
                lengths.add(new SwimLength(
                        i,
                        currentTime,
                        endTime,
                        poolLength,
                        strokeCount,
                        strokeRate
                ));
                
                currentTime = endTime;
            }
        } else {
            // Summary row - create synthetic lengths from total
            String[] firstRow = dataRows.get(0);
            
            int totalLengths = 1;
            Integer lengthsIdx = columnIndex.get(COL_LENGTHS);
            if (lengthsIdx != null && lengthsIdx < firstRow.length) {
                try {
                    totalLengths = Math.max(1, Integer.parseInt(firstRow[lengthsIdx].trim()));
                } catch (NumberFormatException ignored) {}
            } else {
                // Try laps column
                Integer lapsIdx = columnIndex.get(COL_LAPS);
                if (lapsIdx != null && lapsIdx < firstRow.length) {
                    try {
                        totalLengths = Math.max(1, Integer.parseInt(firstRow[lapsIdx].trim()));
                    } catch (NumberFormatException ignored) {}
                }
            }

            Duration totalDuration = parseDuration(firstRow, columnIndex);
            Duration lengthDuration = totalDuration.dividedBy(totalLengths);
            
            Instant currentTime = startTime;
            for (int i = 0; i < totalLengths; i++) {
                Instant endTime = currentTime.plus(lengthDuration);
                lengths.add(new SwimLength(
                        i,
                        currentTime,
                        endTime,
                        poolLength,
                        null,
                        null
                ));
                currentTime = endTime;
            }
        }
        
        return lengths;
    }

    /**
     * Builds SwimLap objects grouping lengths.
     *
     * @param lengths     parsed lengths
     * @param dataRows    original CSV data
     * @param columnIndex column mapping
     * @param poolLength  pool length
     * @return list of SwimLap objects
     */
    private List<SwimLap> buildLaps(List<SwimLength> lengths, List<String[]> dataRows,
                                     Map<String, Integer> columnIndex, int poolLength) {
        if (lengths.isEmpty()) {
            return List.of();
        }

        // Group all lengths into a single lap for simplicity
        // Future: detect rest periods to split into multiple laps
        SwimLength first = lengths.get(0);
        SwimLength last = lengths.get(lengths.size() - 1);

        Duration totalDuration = Duration.between(first.startTime(), last.endTime());
        int totalDistance = lengths.size() * poolLength;

        SwimLap lap = new SwimLap(
                0,
                first.startTime(),
                last.endTime(),
                totalDistance,
                totalDuration,
                lengths,
                LapConfidence.HIGH  // FORM has accurate length detection
        );

        return List.of(lap);
    }

    /**
     * Parses an integer value from a CSV column.
     *
     * @param row         data row
     * @param columnIndex column mapping
     * @param columnName  column name to parse
     * @return parsed integer or null
     */
    private Integer parseIntColumn(String[] row, Map<String, Integer> columnIndex, String columnName) {
        Integer idx = columnIndex.get(columnName);
        if (idx == null || idx >= row.length) {
            return null;
        }
        
        String value = row[idx].trim();
        if (value.isBlank()) {
            return null;
        }
        
        try {
            return Integer.parseInt(value.replaceAll("[^0-9]", ""));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * Calculates stroke rate from count and duration.
     *
     * @param strokeCount number of strokes
     * @param durationSeconds duration in seconds
     * @return stroke rate (strokes/minute) or null
     */
    private Integer calculateStrokeRate(Integer strokeCount, long durationSeconds) {
        if (strokeCount == null || strokeCount <= 0 || durationSeconds <= 0) {
            return null;
        }
        return (int) Math.round((strokeCount / (double) durationSeconds) * 60.0);
    }
}
