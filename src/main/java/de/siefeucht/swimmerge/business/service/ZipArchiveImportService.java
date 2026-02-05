package de.siefeucht.swimmerge.business.service;

import de.siefeucht.swimmerge.domain.model.SwimActivity;
import de.siefeucht.swimmerge.exception.ImportException;
import de.siefeucht.swimmerge.importer.ActivityImporter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.function.Consumer;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Service for importing swim activities from ZIP archives.
 *
 * <p>Handles ZIP files containing FIT and/or CSV activity exports from
 * FORM Smart Swim 2 and Garmin Swim 2 devices.
 *
 * <p>Import workflow:
 * <ol>
 *   <li>Validate ZIP structure</li>
 *   <li>Extract supported files (FIT, CSV)</li>
 *   <li>Parse each file using appropriate importer</li>
 *   <li>Report progress via callback</li>
 *   <li>Return list of imported activities</li>
 * </ol>
 *
 * <p>The service automatically detects the device source from FIT file metadata.
 *
 * @see ActivityImporter
 */
@Service
public class ZipArchiveImportService {

    private static final Logger LOG = LoggerFactory.getLogger(ZipArchiveImportService.class);

    /**
     * Maximum allowed archive size (100 MB).
     */
    private static final long MAX_ARCHIVE_SIZE = 100 * 1024 * 1024;

    /**
     * Maximum allowed number of entries in archive.
     */
    private static final int MAX_ENTRIES = 1000;

    /**
     * Supported file extensions (lowercase).
     */
    private static final List<String> SUPPORTED_EXTENSIONS = List.of(".fit", ".csv");

    private final List<ActivityImporter> importers;

    /**
     * Creates a new ZipArchiveImportService with the given importers.
     *
     * @param importers list of available activity importers
     */
    public ZipArchiveImportService(List<ActivityImporter> importers) {
        this.importers = Objects.requireNonNull(importers, "importers must not be null");
        LOG.info("ZipArchiveImportService initialized with {} importers", importers.size());
    }

    /**
     * Imports activities from a ZIP archive file.
     *
     * @param archivePath      path to the ZIP archive
     * @param poolLengthMeters optional pool length override (null to auto-detect)
     * @param progressCallback optional callback for progress updates
     * @return result containing imported activities and any errors
     * @throws ImportException if archive cannot be read
     */
    public ImportResult importArchive(Path archivePath, Integer poolLengthMeters,
                                       Consumer<ImportProgress> progressCallback) {
        Objects.requireNonNull(archivePath, "archivePath must not be null");

        LOG.info("Starting import of archive: {}", archivePath);
        
        validateArchiveFile(archivePath);
        
        List<SwimActivity> activities = new ArrayList<>();
        List<ImportError> errors = new ArrayList<>();
        
        try (InputStream fileStream = Files.newInputStream(archivePath);
             ZipInputStream zipStream = new ZipInputStream(fileStream)) {
            
            List<FileEntry> entries = scanArchive(zipStream, archivePath.toString());
            LOG.info("Found {} importable files in archive", entries.size());
            
            // Re-open stream for actual extraction
            try (InputStream stream2 = Files.newInputStream(archivePath);
                 ZipInputStream zip2 = new ZipInputStream(stream2)) {
                
                processEntries(zip2, entries, poolLengthMeters, progressCallback, activities, errors);
            }
            
        } catch (IOException e) {
            throw new ImportException(archivePath.toString(), "Failed to read archive: " + e.getMessage(), e);
        }
        
        LOG.info("Import complete: {} activities imported, {} errors", activities.size(), errors.size());
        return new ImportResult(activities, errors);
    }

    /**
     * Imports activities from a ZIP archive input stream.
     *
     * @param inputStream      ZIP archive stream
     * @param fileName         original file name for error reporting
     * @param poolLengthMeters optional pool length override
     * @param progressCallback optional callback for progress updates
     * @return result containing imported activities and any errors
     * @throws ImportException if archive cannot be read
     */
    public ImportResult importArchiveStream(InputStream inputStream, String fileName,
                                             Integer poolLengthMeters,
                                             Consumer<ImportProgress> progressCallback) {
        Objects.requireNonNull(inputStream, "inputStream must not be null");
        String effectiveFileName = fileName != null ? fileName : "unknown.zip";
        
        LOG.info("Starting import of archive stream: {}", effectiveFileName);
        
        List<SwimActivity> activities = new ArrayList<>();
        List<ImportError> errors = new ArrayList<>();
        
        try {
            // Read entire stream into memory for two-pass processing
            byte[] archiveBytes = inputStream.readAllBytes();
            
            if (archiveBytes.length > MAX_ARCHIVE_SIZE) {
                throw new ImportException(effectiveFileName, 
                        String.format("Archive too large: %d bytes (max %d)", archiveBytes.length, MAX_ARCHIVE_SIZE));
            }
            
            // First pass: scan entries
            List<FileEntry> entries;
            try (ZipInputStream zipScan = new ZipInputStream(new ByteArrayInputStream(archiveBytes))) {
                entries = scanArchive(zipScan, effectiveFileName);
            }
            
            LOG.info("Found {} importable files in archive", entries.size());
            
            // Second pass: process entries
            try (ZipInputStream zipProcess = new ZipInputStream(new ByteArrayInputStream(archiveBytes))) {
                processEntries(zipProcess, entries, poolLengthMeters, progressCallback, activities, errors);
            }
            
        } catch (ImportException e) {
            throw e;
        } catch (IOException e) {
            throw new ImportException(effectiveFileName, "Failed to read archive: " + e.getMessage(), e);
        }
        
        LOG.info("Import complete: {} activities imported, {} errors", activities.size(), errors.size());
        return new ImportResult(activities, errors);
    }

    /**
     * Validates the archive file exists and is within size limits.
     *
     * @param archivePath path to validate
     * @throws ImportException if validation fails
     */
    private void validateArchiveFile(Path archivePath) {
        if (!Files.exists(archivePath)) {
            throw new ImportException(archivePath.toString(), "Archive file does not exist");
        }
        
        try {
            long size = Files.size(archivePath);
            if (size > MAX_ARCHIVE_SIZE) {
                throw new ImportException(archivePath.toString(),
                        String.format("Archive too large: %d bytes (max %d)", size, MAX_ARCHIVE_SIZE));
            }
        } catch (IOException e) {
            throw new ImportException(archivePath.toString(), "Cannot read archive size: " + e.getMessage(), e);
        }
    }

    /**
     * Scans the archive and returns list of importable entries.
     *
     * @param zipStream    ZIP input stream
     * @param archiveName  archive name for error reporting
     * @return list of importable file entries
     */
    private List<FileEntry> scanArchive(ZipInputStream zipStream, String archiveName) throws IOException {
        List<FileEntry> entries = new ArrayList<>();
        ZipEntry entry;
        int entryCount = 0;
        
        while ((entry = zipStream.getNextEntry()) != null) {
            entryCount++;
            if (entryCount > MAX_ENTRIES) {
                throw new ImportException(archiveName, 
                        String.format("Too many entries in archive (max %d)", MAX_ENTRIES));
            }
            
            if (entry.isDirectory()) {
                zipStream.closeEntry();
                continue;
            }
            
            String name = entry.getName();
            String lowerName = name.toLowerCase();
            
            // Check if it's a supported file type
            boolean supported = SUPPORTED_EXTENSIONS.stream()
                    .anyMatch(lowerName::endsWith);
            
            if (supported) {
                entries.add(new FileEntry(name, entry.getSize()));
            }
            
            zipStream.closeEntry();
        }
        
        return entries;
    }

    /**
     * Processes archive entries and imports activities.
     *
     * @param zipStream        ZIP input stream
     * @param entries          list of entries to process
     * @param poolLengthMeters optional pool length override
     * @param progressCallback optional progress callback
     * @param activities       list to add imported activities to
     * @param errors           list to add errors to
     */
    private void processEntries(ZipInputStream zipStream, List<FileEntry> entries,
                                 Integer poolLengthMeters, Consumer<ImportProgress> progressCallback,
                                 List<SwimActivity> activities, List<ImportError> errors) throws IOException {
        int totalFiles = entries.size();
        int processedFiles = 0;
        
        ZipEntry entry;
        while ((entry = zipStream.getNextEntry()) != null) {
            if (entry.isDirectory()) {
                zipStream.closeEntry();
                continue;
            }
            
            String name = entry.getName();
            
            // Check if this entry is in our list of importable files
            boolean shouldProcess = entries.stream()
                    .anyMatch(e -> e.name().equals(name));
            
            if (!shouldProcess) {
                zipStream.closeEntry();
                continue;
            }
            
            processedFiles++;
            
            // Report progress
            if (progressCallback != null) {
                progressCallback.accept(new ImportProgress(
                        ImportStep.PROCESSING,
                        name,
                        processedFiles,
                        totalFiles,
                        (double) processedFiles / totalFiles * 100
                ));
            }
            
            try {
                // Read entry content into byte array (don't close the zip stream!)
                byte[] content = zipStream.readAllBytes();
                
                // Find appropriate importer
                ActivityImporter importer = findImporter(name);
                if (importer == null) {
                    errors.add(new ImportError(name, "No importer found for file type"));
                    continue;
                }
                
                // Import the activity
                SwimActivity activity = importer.importActivity(
                        new ByteArrayInputStream(content), 
                        name, 
                        poolLengthMeters
                );
                
                activities.add(activity);
                LOG.debug("Successfully imported: {}", name);
                
            } catch (ImportException e) {
                LOG.warn("Failed to import {}: {}", name, e.getMessage());
                errors.add(new ImportError(name, e.getMessage()));
            } catch (Exception e) {
                LOG.error("Unexpected error importing {}", name, e);
                errors.add(new ImportError(name, "Unexpected error: " + e.getMessage()));
            }
            
            zipStream.closeEntry();
        }
        
        // Report completion
        if (progressCallback != null) {
            progressCallback.accept(new ImportProgress(
                    ImportStep.COMPLETE,
                    null,
                    totalFiles,
                    totalFiles,
                    100.0
            ));
        }
    }

    /**
     * Finds an appropriate importer for the given file name.
     *
     * @param fileName file name to check
     * @return matching importer or null
     */
    private ActivityImporter findImporter(String fileName) {
        return importers.stream()
                .filter(imp -> imp.supports(fileName))
                .findFirst()
                .orElse(null);
    }

    /**
     * Represents a file entry in the archive.
     *
     * @param name file name (with path)
     * @param size file size in bytes
     */
    public record FileEntry(String name, long size) {}

    /**
     * Represents an import error for a specific file.
     *
     * @param fileName     name of the file that failed
     * @param errorMessage error description
     */
    public record ImportError(String fileName, String errorMessage) {}

    /**
     * Result of an archive import operation.
     *
     * @param activities successfully imported activities
     * @param errors     list of errors encountered
     */
    public record ImportResult(List<SwimActivity> activities, List<ImportError> errors) {
        
        /**
         * Returns true if any activities were imported.
         *
         * @return true if at least one activity was imported
         */
        public boolean hasActivities() {
            return activities != null && !activities.isEmpty();
        }
        
        /**
         * Returns true if any errors occurred.
         *
         * @return true if at least one error occurred
         */
        public boolean hasErrors() {
            return errors != null && !errors.isEmpty();
        }
        
        /**
         * Returns the total number of files processed (success + error).
         *
         * @return total file count
         */
        public int totalFilesProcessed() {
            int successCount = activities != null ? activities.size() : 0;
            int errorCount = errors != null ? errors.size() : 0;
            return successCount + errorCount;
        }
    }

    /**
     * Represents the current step in the import process.
     */
    public enum ImportStep {
        /** Validating archive structure */
        VALIDATING,
        /** Scanning archive contents */
        SCANNING,
        /** Processing individual files */
        PROCESSING,
        /** Import completed */
        COMPLETE,
        /** Error occurred */
        ERROR
    }

    /**
     * Progress information for an ongoing import.
     *
     * @param step          current import step
     * @param currentFile   file currently being processed (null if not processing)
     * @param processedFiles number of files processed
     * @param totalFiles    total number of files to process
     * @param percentComplete completion percentage (0-100)
     */
    public record ImportProgress(
            ImportStep step,
            String currentFile,
            int processedFiles,
            int totalFiles,
            double percentComplete
    ) {}
}
