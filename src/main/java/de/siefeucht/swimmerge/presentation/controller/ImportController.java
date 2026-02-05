package de.siefeucht.swimmerge.presentation.controller;

import de.siefeucht.swimmerge.business.service.SessionReplayService;
import de.siefeucht.swimmerge.business.service.ZipArchiveImportService;
import de.siefeucht.swimmerge.business.service.ZipArchiveImportService.ImportProgress;
import de.siefeucht.swimmerge.business.service.ZipArchiveImportService.ImportResult;
import de.siefeucht.swimmerge.domain.model.SwimActivity;
import de.siefeucht.swimmerge.presentation.dto.ImportResultDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * REST controller for importing swim activity files.
 *
 * <p>Provides endpoints for:
 * <ul>
 *   <li>Synchronous ZIP archive import</li>
 *   <li>Streaming import with SSE progress updates</li>
 * </ul>
 *
 * <p>Supports ZIP archives containing FIT and CSV files from
 * FORM Smart Swim 2 and Garmin Swim 2 devices.
 */
@RestController
@RequestMapping("/api/import")
@Tag(name = "Import", description = "Swim activity file import operations")
public class ImportController {

    private static final Logger LOG = LoggerFactory.getLogger(ImportController.class);

    /**
     * SSE timeout: 5 minutes (in milliseconds).
     */
    private static final long SSE_TIMEOUT = 5 * 60 * 1000L;

    private final ZipArchiveImportService importService;
    private final SessionReplayService sessionReplayService;
    private final ExecutorService executorService;

    /**
     * Creates a new ImportController.
     *
     * @param importService        service for importing archives
     * @param sessionReplayService service for caching activities for replay
     */
    public ImportController(
            ZipArchiveImportService importService,
            SessionReplayService sessionReplayService
    ) {
        this.importService = importService;
        this.sessionReplayService = sessionReplayService;
        this.executorService = Executors.newCachedThreadPool();
    }

    /**
     * Imports activities from a ZIP archive synchronously.
     *
     * <p>Accepts ZIP files containing FIT and/or CSV activity files.
     * The source device (FORM or Garmin) is auto-detected from file metadata.
     *
     * @param file           ZIP archive file
     * @param poolLengthMeters optional pool length override (25 or 50)
     * @return import result with activities and errors
     */
    @PostMapping(value = "/zip", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            summary = "Import ZIP archive",
            description = "Import swim activities from a ZIP archive containing FIT and/or CSV files"
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Import successful",
                    content = @Content(schema = @Schema(implementation = ImportResponseDto.class))
            ),
            @ApiResponse(responseCode = "400", description = "Invalid file or format"),
            @ApiResponse(responseCode = "413", description = "File too large")
    })
    public ResponseEntity<ImportResponseDto> importZip(
            @Parameter(description = "ZIP archive containing FIT/CSV files", required = true)
            @RequestParam("file") MultipartFile file,
            
            @Parameter(description = "Pool length in meters (auto-detect if not specified)")
            @RequestParam(value = "poolLength", required = false) Integer poolLengthMeters
    ) {
        LOG.info("Received import request for file: {} (size: {} bytes)", 
                file.getOriginalFilename(), file.getSize());

        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ImportResponseDto.error("File is empty"));
        }

        String filename = file.getOriginalFilename();
        if (filename == null || !filename.toLowerCase().endsWith(".zip")) {
            return ResponseEntity.badRequest()
                    .body(ImportResponseDto.error("File must be a ZIP archive"));
        }

        try {
            ImportResult result = importService.importArchiveStream(
                    file.getInputStream(),
                    filename,
                    poolLengthMeters,
                    null  // No progress callback for sync import
            );

            // Cache imported activities for session replay
            result.activities().forEach(sessionReplayService::cacheActivity);
            LOG.info("Cached {} activities for session replay", result.activities().size());

            return ResponseEntity.ok(ImportResponseDto.fromResult(result, filename));
            
        } catch (IOException e) {
            LOG.error("Failed to read uploaded file: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ImportResponseDto.error("Failed to read file: " + e.getMessage()));
        } catch (Exception e) {
            LOG.error("Import failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ImportResponseDto.error("Import failed: " + e.getMessage()));
        }
    }

    /**
     * Imports activities from a ZIP archive with SSE progress streaming.
     *
     * <p>Returns a Server-Sent Events stream with real-time progress updates.
     * The final event contains the complete import result.
     *
     * <p>SSE event format:
     * <pre>
     * event: progress
     * data: {"step":"PROCESSING","currentFile":"activity.fit","processedFiles":1,"totalFiles":5,"percentComplete":20.0}
     *
     * event: complete
     * data: {"success":true,"activitiesImported":5,"errors":[]}
     * </pre>
     *
     * @param file           ZIP archive file
     * @param poolLengthMeters optional pool length override
     * @return SSE emitter for progress events
     */
    @PostMapping(value = "/zip/stream", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            summary = "Import ZIP archive with progress streaming",
            description = "Import swim activities with real-time SSE progress updates"
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "SSE stream established",
                    content = @Content(mediaType = MediaType.TEXT_EVENT_STREAM_VALUE)
            ),
            @ApiResponse(responseCode = "400", description = "Invalid file or format")
    })
    public SseEmitter importZipWithProgress(
            @Parameter(description = "ZIP archive containing FIT/CSV files", required = true)
            @RequestParam("file") MultipartFile file,
            
            @Parameter(description = "Pool length in meters (auto-detect if not specified)")
            @RequestParam(value = "poolLength", required = false) Integer poolLengthMeters
    ) {
        LOG.info("Received streaming import request for file: {} (size: {} bytes)", 
                file.getOriginalFilename(), file.getSize());

        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);
        
        // Validate file before starting async processing
        if (file.isEmpty()) {
            sendErrorAndComplete(emitter, "File is empty");
            return emitter;
        }

        String filename = file.getOriginalFilename();
        if (filename == null || !filename.toLowerCase().endsWith(".zip")) {
            sendErrorAndComplete(emitter, "File must be a ZIP archive");
            return emitter;
        }

        // Read file content before async processing (MultipartFile may not be available later)
        byte[] fileContent;
        try {
            fileContent = file.getBytes();
        } catch (IOException e) {
            sendErrorAndComplete(emitter, "Failed to read file: " + e.getMessage());
            return emitter;
        }

        // Process import asynchronously
        executorService.submit(() -> processImportAsync(emitter, fileContent, filename, poolLengthMeters));

        // Handle client disconnect
        emitter.onCompletion(() -> LOG.debug("SSE connection completed for: {}", filename));
        emitter.onTimeout(() -> LOG.warn("SSE connection timed out for: {}", filename));
        emitter.onError(e -> LOG.error("SSE error for {}: {}", filename, e.getMessage()));

        return emitter;
    }

    /**
     * Processes the import asynchronously and sends progress via SSE.
     *
     * @param emitter          SSE emitter for sending events
     * @param fileContent      ZIP file content
     * @param filename         original filename
     * @param poolLengthMeters optional pool length
     */
    private void processImportAsync(SseEmitter emitter, byte[] fileContent, 
                                     String filename, Integer poolLengthMeters) {
        try {
            ImportResult result = importService.importArchiveStream(
                    new java.io.ByteArrayInputStream(fileContent),
                    filename,
                    poolLengthMeters,
                    progress -> sendProgress(emitter, progress)
            );

            // Cache imported activities for session replay
            result.activities().forEach(sessionReplayService::cacheActivity);
            LOG.info("Cached {} activities for session replay (async)", result.activities().size());

            // Send final result
            ImportResponseDto response = ImportResponseDto.fromResult(result, filename);
            emitter.send(SseEmitter.event()
                    .name("complete")
                    .data(response));
            
            emitter.complete();
            
        } catch (Exception e) {
            LOG.error("Streaming import failed for {}", filename, e);
            sendErrorAndComplete(emitter, e.getMessage());
        }
    }

    /**
     * Sends a progress event via SSE.
     *
     * @param emitter  SSE emitter
     * @param progress progress information
     */
    private void sendProgress(SseEmitter emitter, ImportProgress progress) {
        try {
            ProgressEventDto event = new ProgressEventDto(
                    progress.step().name(),
                    progress.currentFile(),
                    progress.processedFiles(),
                    progress.totalFiles(),
                    progress.percentComplete()
            );
            
            emitter.send(SseEmitter.event()
                    .name("progress")
                    .data(event));
        } catch (IOException e) {
            LOG.warn("Failed to send progress event: {}", e.getMessage());
        }
    }

    /**
     * Sends an error event and completes the SSE stream.
     *
     * @param emitter SSE emitter
     * @param error   error message
     */
    private void sendErrorAndComplete(SseEmitter emitter, String error) {
        try {
            emitter.send(SseEmitter.event()
                    .name("error")
                    .data(ImportResponseDto.error(error)));
            emitter.complete();
        } catch (IOException e) {
            LOG.error("Failed to send error event", e);
            emitter.completeWithError(e);
        }
    }

    /**
     * DTO for import response.
     *
     * @param success           true if import completed
     * @param fileName          original file name
     * @param activitiesImported number of activities imported
     * @param activities        imported activity summaries
     * @param errors            list of errors encountered
     * @param errorMessage      overall error message (if failed)
     */
    public record ImportResponseDto(
            boolean success,
            String fileName,
            int activitiesImported,
            List<ActivitySummaryDto> activities,
            List<ImportErrorDto> errors,
            String errorMessage
    ) {
        /**
         * Creates a successful response from import result.
         *
         * @param result   import result
         * @param fileName original file name
         * @return response DTO
         */
        public static ImportResponseDto fromResult(ImportResult result, String fileName) {
            List<ActivitySummaryDto> summaries = result.activities().stream()
                    .map(ActivitySummaryDto::from)
                    .toList();
            
            List<ImportErrorDto> errors = result.errors().stream()
                    .map(e -> new ImportErrorDto(e.fileName(), e.errorMessage()))
                    .toList();
            
            return new ImportResponseDto(
                    true,
                    fileName,
                    result.activities().size(),
                    summaries,
                    errors,
                    null
            );
        }
        
        /**
         * Creates an error response.
         *
         * @param errorMessage error description
         * @return error response DTO
         */
        public static ImportResponseDto error(String errorMessage) {
            return new ImportResponseDto(false, null, 0, List.of(), List.of(), errorMessage);
        }
    }

    /**
     * Summary of an imported activity.
     *
     * @param id           activity ID
     * @param source       device source (GARMIN, FORM)
     * @param startTime    activity start
     * @param endTime      activity end
     * @param durationMins duration in minutes
     * @param distanceM    distance in meters
     * @param lengthCount  number of lengths
     * @param poolLengthM  pool length in meters
     */
    public record ActivitySummaryDto(
            String id,
            String source,
            String startTime,
            String endTime,
            long durationMins,
            int distanceM,
            int lengthCount,
            int poolLengthM
    ) {
        /**
         * Creates a summary from a SwimActivity.
         *
         * @param activity swim activity
         * @return summary DTO
         */
        public static ActivitySummaryDto from(SwimActivity activity) {
            Duration duration = activity.duration();
            return new ActivitySummaryDto(
                    activity.id().toString(),
                    activity.source().name(),
                    activity.startTime().toString(),
                    activity.endTime().toString(),
                    duration.toMinutes(),
                    activity.totalDistanceMeters(),
                    activity.lengths().size(),
                    activity.poolLengthMeters()
            );
        }
    }

    /**
     * Import error information.
     *
     * @param fileName     file that caused the error
     * @param errorMessage error description
     */
    public record ImportErrorDto(String fileName, String errorMessage) {}

    /**
     * Progress event for SSE streaming.
     *
     * @param step           current import step
     * @param currentFile    file being processed
     * @param processedFiles files processed so far
     * @param totalFiles     total files to process
     * @param percentComplete completion percentage
     */
    public record ProgressEventDto(
            String step,
            String currentFile,
            int processedFiles,
            int totalFiles,
            double percentComplete
    ) {}
}
