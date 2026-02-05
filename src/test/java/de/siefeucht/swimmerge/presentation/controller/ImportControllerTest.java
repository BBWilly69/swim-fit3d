package de.siefeucht.swimmerge.presentation.controller;

import de.siefeucht.swimmerge.business.service.SessionReplayService;
import de.siefeucht.swimmerge.business.service.ZipArchiveImportService;
import de.siefeucht.swimmerge.business.service.ZipArchiveImportService.ImportResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link ImportController}.
 *
 * <p>Tests the REST endpoints for file import operations.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ImportController")
class ImportControllerTest {

    @Mock
    private ZipArchiveImportService importService;

    @Mock
    private SessionReplayService sessionReplayService;

    private ImportController controller;

    @BeforeEach
    void setUp() {
        controller = new ImportController(importService, sessionReplayService);
    }

    @Nested
    @DisplayName("importZip (synchronous)")
    class ImportZipSync {

        @Test
        @DisplayName("should return 400 for empty file")
        void shouldReturn400ForEmptyFile() {
            MockMultipartFile emptyFile = new MockMultipartFile(
                    "file", "empty.zip", "application/zip", new byte[0]);

            ResponseEntity<ImportController.ImportResponseDto> response = 
                    controller.importZip(emptyFile, null);

            assertThat(response.getStatusCode(), is(HttpStatus.BAD_REQUEST));
            assertThat(response.getBody(), notNullValue());
            assertThat(response.getBody().success(), is(false));
            assertThat(response.getBody().errorMessage(), containsString("empty"));
        }

        @Test
        @DisplayName("should return 400 for non-ZIP file")
        void shouldReturn400ForNonZipFile() {
            MockMultipartFile textFile = new MockMultipartFile(
                    "file", "test.txt", "text/plain", "Hello".getBytes());

            ResponseEntity<ImportController.ImportResponseDto> response = 
                    controller.importZip(textFile, null);

            assertThat(response.getStatusCode(), is(HttpStatus.BAD_REQUEST));
            assertThat(response.getBody().errorMessage(), containsString("ZIP"));
        }

        @Test
        @DisplayName("should return 200 on successful import")
        void shouldReturn200OnSuccessfulImport() throws IOException {
            MockMultipartFile zipFile = new MockMultipartFile(
                    "file", "activities.zip", "application/zip", 
                    createMinimalZipBytes());
            
            when(importService.importArchiveStream(
                    any(InputStream.class),
                    eq("activities.zip"),
                    eq(null),
                    eq(null)
            )).thenReturn(new ImportResult(List.of(), List.of()));

            ResponseEntity<ImportController.ImportResponseDto> response = 
                    controller.importZip(zipFile, null);

            assertThat(response.getStatusCode(), is(HttpStatus.OK));
            assertThat(response.getBody().success(), is(true));
            assertThat(response.getBody().fileName(), is("activities.zip"));
        }

        @Test
        @DisplayName("should pass pool length to service")
        void shouldPassPoolLengthToService() throws IOException {
            MockMultipartFile zipFile = new MockMultipartFile(
                    "file", "activities.zip", "application/zip", 
                    createMinimalZipBytes());
            
            when(importService.importArchiveStream(
                    any(InputStream.class),
                    eq("activities.zip"),
                    eq(50),
                    eq(null)
            )).thenReturn(new ImportResult(List.of(), List.of()));

            ResponseEntity<ImportController.ImportResponseDto> response = 
                    controller.importZip(zipFile, 50);

            assertThat(response.getStatusCode(), is(HttpStatus.OK));
        }

        @Test
        @DisplayName("should handle service exception")
        void shouldHandleServiceException() throws IOException {
            MockMultipartFile zipFile = new MockMultipartFile(
                    "file", "activities.zip", "application/zip", 
                    createMinimalZipBytes());
            
            when(importService.importArchiveStream(
                    any(InputStream.class),
                    any(),
                    any(),
                    any()
            )).thenThrow(new RuntimeException("Corrupted archive"));

            ResponseEntity<ImportController.ImportResponseDto> response = 
                    controller.importZip(zipFile, null);

            assertThat(response.getStatusCode(), is(HttpStatus.INTERNAL_SERVER_ERROR));
            assertThat(response.getBody().success(), is(false));
            assertThat(response.getBody().errorMessage(), containsString("Corrupted"));
        }
    }

    @Nested
    @DisplayName("importZipWithProgress (SSE)")
    class ImportZipWithProgress {

        @Test
        @DisplayName("should return SseEmitter for valid file")
        void shouldReturnSseEmitterForValidFile() {
            MockMultipartFile zipFile = new MockMultipartFile(
                    "file", "activities.zip", "application/zip", 
                    createMinimalZipBytes());

            var emitter = controller.importZipWithProgress(zipFile, null);

            assertThat(emitter, notNullValue());
        }

        @Test
        @DisplayName("should complete emitter with error for empty file")
        void shouldCompleteEmitterWithErrorForEmptyFile() {
            MockMultipartFile emptyFile = new MockMultipartFile(
                    "file", "empty.zip", "application/zip", new byte[0]);

            var emitter = controller.importZipWithProgress(emptyFile, null);

            // SseEmitter should be returned even for errors
            assertThat(emitter, notNullValue());
        }

        @Test
        @DisplayName("should complete emitter with error for non-ZIP file")
        void shouldCompleteEmitterWithErrorForNonZipFile() {
            MockMultipartFile textFile = new MockMultipartFile(
                    "file", "test.txt", "text/plain", "Hello".getBytes());

            var emitter = controller.importZipWithProgress(textFile, null);

            assertThat(emitter, notNullValue());
        }
    }

    @Nested
    @DisplayName("ImportResponseDto")
    class ImportResponseDtoTests {

        @Test
        @DisplayName("should create error response")
        void shouldCreateErrorResponse() {
            ImportController.ImportResponseDto response = 
                    ImportController.ImportResponseDto.error("Test error");

            assertThat(response.success(), is(false));
            assertThat(response.errorMessage(), is("Test error"));
            assertThat(response.fileName(), nullValue());
            assertThat(response.activitiesImported(), is(0));
            assertThat(response.activities(), is(empty()));
            assertThat(response.errors(), is(empty()));
        }

        @Test
        @DisplayName("should create response from empty result")
        void shouldCreateResponseFromEmptyResult() {
            ImportResult result = new ImportResult(List.of(), List.of());
            
            ImportController.ImportResponseDto response = 
                    ImportController.ImportResponseDto.fromResult(result, "test.zip");

            assertThat(response.success(), is(true));
            assertThat(response.fileName(), is("test.zip"));
            assertThat(response.activitiesImported(), is(0));
            assertThat(response.activities(), is(empty()));
            assertThat(response.errors(), is(empty()));
            assertThat(response.errorMessage(), nullValue());
        }
    }

    @Nested
    @DisplayName("ProgressEventDto")
    class ProgressEventDtoTests {

        @Test
        @DisplayName("should create progress event")
        void shouldCreateProgressEvent() {
            ImportController.ProgressEventDto event = new ImportController.ProgressEventDto(
                    "PROCESSING",
                    "activity.fit",
                    5,
                    10,
                    50.0
            );

            assertThat(event.step(), is("PROCESSING"));
            assertThat(event.currentFile(), is("activity.fit"));
            assertThat(event.processedFiles(), is(5));
            assertThat(event.totalFiles(), is(10));
            assertThat(event.percentComplete(), is(50.0));
        }
    }

    // Helper methods

    private byte[] createMinimalZipBytes() {
        // Minimal valid ZIP file header (empty archive)
        return new byte[] {
                0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00
        };
    }
}
