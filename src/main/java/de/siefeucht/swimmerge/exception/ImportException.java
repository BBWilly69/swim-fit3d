package de.siefeucht.swimmerge.exception;

import java.io.Serial;

/**
 * Exception thrown when file import fails.
 *
 * <p>Covers parsing errors, format issues, and corrupted data in
 * FIT, TCX, or CSV files.
 */
public class ImportException extends SwimMergeException {

    @Serial
    private static final long serialVersionUID = 1L;

    private final String fileName;

    /**
     * Creates a new import exception.
     *
     * @param fileName name of the file that failed to import
     * @param message  descriptive error message
     */
    public ImportException(String fileName, String message) {
        super(String.format("Failed to import '%s': %s", fileName, message));
        this.fileName = fileName;
    }

    /**
     * Creates a new import exception with cause.
     *
     * @param fileName name of the file that failed to import
     * @param message  descriptive error message
     * @param cause    underlying cause
     */
    public ImportException(String fileName, String message, Throwable cause) {
        super(String.format("Failed to import '%s': %s", fileName, message), cause);
        this.fileName = fileName;
    }

    /**
     * Returns the file name that failed to import.
     *
     * @return file name
     */
    public String getFileName() {
        return fileName;
    }
}
