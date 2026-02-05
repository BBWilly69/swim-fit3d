package de.siefeucht.swimmerge.importer;

import de.siefeucht.swimmerge.domain.model.SwimActivity;

import java.io.InputStream;

/**
 * Interface for importing swim activity data from device-specific file formats.
 *
 * <p>Implementations translate raw device data into the normalized domain model.
 * They must NOT:
 * <ul>
 *     <li>Merge data from multiple sources</li>
 *     <li>Align or correct timestamps</li>
 *     <li>Apply any business logic beyond translation</li>
 * </ul>
 *
 * <p>Each importer is responsible for a single device/format combination.
 */
public interface ActivityImporter {

    /**
     * Imports swim activity data from the given input stream.
     *
     * @param inputStream the raw file data, must not be null
     * @param fileName    original file name for error reporting
     * @param poolLengthMeters pool length in meters (25 or 50), 
     *                         or null to auto-detect from file
     * @return the imported activity with source set appropriately
     * @throws de.siefeucht.swimmerge.exception.ImportException if import fails
     */
    SwimActivity importActivity(InputStream inputStream, String fileName, Integer poolLengthMeters);

    /**
     * Checks if this importer supports the given file.
     *
     * @param fileName the file name to check
     * @return true if this importer can handle the file
     */
    boolean supports(String fileName);

    /**
     * Returns the file extension this importer handles.
     *
     * @return file extension without dot (e.g., "fit", "tcx")
     */
    String getFileExtension();
}
