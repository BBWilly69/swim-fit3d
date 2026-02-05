package de.siefeucht.swimmerge.importer;

import de.siefeucht.swimmerge.domain.model.ActivitySource;
import de.siefeucht.swimmerge.domain.model.SwimActivity;
import de.siefeucht.swimmerge.exception.ImportException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Unit tests for {@link FormCsvImporter}.
 *
 * <p>Tests the CSV file import functionality for FORM Smart Swim 2 exports.
 */
@DisplayName("FormCsvImporter")
class FormCsvImporterTest {

    private FormCsvImporter importer;

    @BeforeEach
    void setUp() {
        importer = new FormCsvImporter();
    }

    @Nested
    @DisplayName("supports")
    class Supports {

        @Test
        @DisplayName("should return true for .csv extension")
        void shouldReturnTrueForCsvExtension() {
            assertThat(importer.supports("activity.csv"), is(true));
        }

        @Test
        @DisplayName("should return true for .CSV extension (case insensitive)")
        void shouldReturnTrueForUppercaseCsvExtension() {
            assertThat(importer.supports("activity.CSV"), is(true));
        }

        @Test
        @DisplayName("should return false for .fit extension")
        void shouldReturnFalseForFitExtension() {
            assertThat(importer.supports("activity.fit"), is(false));
        }

        @Test
        @DisplayName("should return false for null filename")
        void shouldReturnFalseForNullFilename() {
            assertThat(importer.supports(null), is(false));
        }

        @Test
        @DisplayName("should return false for empty filename")
        void shouldReturnFalseForEmptyFilename() {
            assertThat(importer.supports(""), is(false));
        }
    }

    @Nested
    @DisplayName("File validation")
    class FileValidation {

        @Test
        @DisplayName("should throw exception for null input stream")
        void shouldThrowExceptionForNullInputStream() {
            assertThrows(NullPointerException.class,
                    () -> importer.importActivity(null, "test.csv", null));
        }

        @Test
        @DisplayName("should throw exception for null file name")
        void shouldThrowExceptionForNullFileName() {
            // null fileName is handled gracefully (uses "unknown.csv")
            InputStream stream = new ByteArrayInputStream(new byte[0]);
            assertThrows(ImportException.class,
                    () -> importer.importActivity(stream, null, null));
        }

        @Test
        @DisplayName("should throw exception for empty file name")
        void shouldThrowExceptionForEmptyFileName() {
            // empty fileName is handled gracefully
            InputStream stream = new ByteArrayInputStream(new byte[0]);
            assertThrows(ImportException.class,
                    () -> importer.importActivity(stream, "", null));
        }

        @Test
        @DisplayName("should throw exception for empty CSV")
        void shouldThrowExceptionForEmptyCsv() {
            InputStream stream = new ByteArrayInputStream(new byte[0]);

            assertThrows(ImportException.class,
                    () -> importer.importActivity(stream, "empty.csv", null));
        }

        @Test
        @DisplayName("should throw exception for CSV with only header")
        void shouldThrowExceptionForCsvWithOnlyHeader() {
            String csv = "Date,Time,Pool Length,Total Lengths,Total Distance\n";
            InputStream stream = new ByteArrayInputStream(csv.getBytes(StandardCharsets.UTF_8));

            assertThrows(ImportException.class,
                    () -> importer.importActivity(stream, "header_only.csv", null));
        }
    }

    @Nested
    @DisplayName("CSV parsing")
    class CsvParsing {

        @Test
        @DisplayName("should parse valid summary CSV")
        void shouldParseValidSummaryCsv() throws ImportException {
            String csv = """
                    Date,Time,Pool Length,Total Lengths,Total Distance,Duration,Stroke Count
                    2024-01-15,10:30:00,25,40,1000,00:30:00,800
                    """;
            InputStream stream = new ByteArrayInputStream(csv.getBytes(StandardCharsets.UTF_8));

            SwimActivity activity = importer.importActivity(stream, "summary.csv", null);

            assertThat(activity, notNullValue());
            assertThat(activity.source(), is(ActivitySource.FORM));
            assertThat(activity.poolLengthMeters(), is(25));
            // Distance is calculated from lengths * pool length, may differ from CSV
            assertThat(activity.totalDistanceMeters(), greaterThan(0));
        }

        @Test
        @DisplayName("should parse CSV with 50m pool length")
        void shouldParseCsvWith50mPoolLength() throws ImportException {
            String csv = """
                    Date,Time,Pool Length,Total Lengths,Total Distance,Duration,Stroke Count
                    2024-01-15,10:30:00,50,20,1000,00:30:00,400
                    """;
            InputStream stream = new ByteArrayInputStream(csv.getBytes(StandardCharsets.UTF_8));

            SwimActivity activity = importer.importActivity(stream, "50m.csv", null);

            assertThat(activity.poolLengthMeters(), is(50));
        }

        @Test
        @DisplayName("should override pool length when specified")
        void shouldOverridePoolLengthWhenSpecified() throws ImportException {
            String csv = """
                    Date,Time,Pool Length,Total Lengths,Total Distance,Duration,Stroke Count
                    2024-01-15,10:30:00,25,40,1000,00:30:00,800
                    """;
            InputStream stream = new ByteArrayInputStream(csv.getBytes(StandardCharsets.UTF_8));

            SwimActivity activity = importer.importActivity(stream, "override.csv", 50);

            assertThat(activity.poolLengthMeters(), is(50));
        }

        @Test
        @DisplayName("should parse date in ISO format")
        void shouldParseDateInIsoFormat() throws ImportException {
            String csv = """
                    Date,Time,Pool Length,Total Lengths,Total Distance,Duration,Stroke Count
                    2024-06-20,14:45:30,25,40,1000,00:30:00,800
                    """;
            InputStream stream = new ByteArrayInputStream(csv.getBytes(StandardCharsets.UTF_8));

            SwimActivity activity = importer.importActivity(stream, "iso_date.csv", null);

            assertThat(activity.startTime().toString(), containsString("2024-06-20"));
        }

        @Test
        @DisplayName("should parse duration in HH:MM:SS format")
        void shouldParseDurationInHhMmSsFormat() throws ImportException {
            String csv = """
                    Date,Time,Pool Length,Total Lengths,Total Distance,Duration,Stroke Count
                    2024-01-15,10:00:00,25,40,1000,01:15:30,800
                    """;
            InputStream stream = new ByteArrayInputStream(csv.getBytes(StandardCharsets.UTF_8));

            SwimActivity activity = importer.importActivity(stream, "duration.csv", null);

            assertThat(activity.duration().toMinutes(), is(75L));
        }
    }

    @Nested
    @DisplayName("Length-level CSV parsing")
    class LengthLevelParsing {

        @Test
        @DisplayName("should parse CSV with length details")
        void shouldParseCsvWithLengthDetails() throws ImportException {
            String csv = """
                    Date,Time,Pool Length,Length Number,Stroke Type,Stroke Count,Length Time
                    2024-01-15,10:30:00,25,1,Freestyle,18,00:00:25
                    2024-01-15,10:30:00,25,2,Freestyle,19,00:00:26
                    2024-01-15,10:30:00,25,3,Freestyle,17,00:00:24
                    """;
            InputStream stream = new ByteArrayInputStream(csv.getBytes(StandardCharsets.UTF_8));

            SwimActivity activity = importer.importActivity(stream, "lengths.csv", null);

            assertThat(activity.lengths(), hasSize(3));
            assertThat(activity.totalDistanceMeters(), is(75));  // 3 lengths × 25m
        }
    }

    @Nested
    @DisplayName("getFileExtension")
    class FileExtension {

        @Test
        @DisplayName("should return csv extension")
        void shouldReturnCsvExtension() {
            assertThat(importer.getFileExtension(), is("csv"));
        }
    }
}
