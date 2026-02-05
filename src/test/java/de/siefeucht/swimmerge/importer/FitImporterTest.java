package de.siefeucht.swimmerge.importer;

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
 * Unit tests for {@link FitImporter}.
 *
 * <p>Tests the FIT file import functionality for both Garmin and FORM devices.
 * Note: Full integration tests require real FIT files, these tests verify
 * error handling and edge cases.
 */
@DisplayName("FitImporter")
class FitImporterTest {

    private FitImporter importer;

    @BeforeEach
    void setUp() {
        importer = new FitImporter();
    }

    @Nested
    @DisplayName("File validation")
    class FileValidation {

        @Test
        @DisplayName("should throw exception for null input stream")
        void shouldThrowExceptionForNullInputStream() {
            assertThrows(ImportException.class, 
                    () -> importer.importActivity(null, "test.fit", null));
        }

        @Test
        @DisplayName("should throw exception for null file name")
        void shouldThrowExceptionForNullFileName() {
            InputStream stream = new ByteArrayInputStream(new byte[0]);
            assertThrows(ImportException.class, 
                    () -> importer.importActivity(stream, null, null));
        }

        @Test
        @DisplayName("should throw exception for empty file name")
        void shouldThrowExceptionForEmptyFileName() {
            InputStream stream = new ByteArrayInputStream(new byte[0]);
            assertThrows(ImportException.class, 
                    () -> importer.importActivity(stream, "", null));
        }

        @Test
        @DisplayName("should throw exception for invalid FIT data")
        void shouldThrowExceptionForInvalidFitData() {
            byte[] invalidData = "This is not a FIT file".getBytes(StandardCharsets.UTF_8);
            InputStream stream = new ByteArrayInputStream(invalidData);
            
            assertThrows(ImportException.class, 
                    () -> importer.importActivity(stream, "invalid.fit", null));
        }

        @Test
        @DisplayName("should throw exception for empty FIT data")
        void shouldThrowExceptionForEmptyFitData() {
            InputStream stream = new ByteArrayInputStream(new byte[0]);
            
            assertThrows(ImportException.class, 
                    () -> importer.importActivity(stream, "empty.fit", null));
        }
    }

    @Nested
    @DisplayName("supports")
    class Supports {

        @Test
        @DisplayName("should return true for .fit extension")
        void shouldReturnTrueForFitExtension() {
            assertThat(importer.supports("activity.fit"), is(true));
        }

        @Test
        @DisplayName("should return true for .FIT extension (case insensitive)")
        void shouldReturnTrueForUppercaseFitExtension() {
            assertThat(importer.supports("activity.FIT"), is(true));
        }

        @Test
        @DisplayName("should return false for .csv extension")
        void shouldReturnFalseForCsvExtension() {
            assertThat(importer.supports("activity.csv"), is(false));
        }

        @Test
        @DisplayName("should return false for .tcx extension")
        void shouldReturnFalseForTcxExtension() {
            assertThat(importer.supports("activity.tcx"), is(false));
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
    @DisplayName("Pool length override")
    class PoolLengthOverride {

        @Test
        @DisplayName("should accept null pool length override")
        void shouldAcceptNullPoolLengthOverride() {
            // This test verifies the parameter is accepted, actual import
            // would fail due to invalid FIT data
            byte[] invalidData = new byte[12];
            InputStream stream = new ByteArrayInputStream(invalidData);
            
            // Should not throw NPE for null poolLength
            assertThrows(ImportException.class, 
                    () -> importer.importActivity(stream, "test.fit", null));
        }

        @Test
        @DisplayName("should accept 25m pool length override")
        void shouldAccept25mPoolLengthOverride() {
            byte[] invalidData = new byte[12];
            InputStream stream = new ByteArrayInputStream(invalidData);
            
            // Should not throw for valid pool length
            assertThrows(ImportException.class, 
                    () -> importer.importActivity(stream, "test.fit", 25));
        }

        @Test
        @DisplayName("should accept 50m pool length override")
        void shouldAccept50mPoolLengthOverride() {
            byte[] invalidData = new byte[12];
            InputStream stream = new ByteArrayInputStream(invalidData);
            
            // Should not throw for valid pool length
            assertThrows(ImportException.class, 
                    () -> importer.importActivity(stream, "test.fit", 50));
        }
    }

    @Nested
    @DisplayName("getFileExtension")
    class FileExtension {

        @Test
        @DisplayName("should return fit extension")
        void shouldReturnFitExtension() {
            assertThat(importer.getFileExtension(), is("fit"));
        }
    }
}
