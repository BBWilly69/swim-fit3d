package de.siefeucht.swimmerge.presentation.dto;

import de.siefeucht.swimmerge.domain.model.ActivitySource;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Data Transfer Object for activity import requests.
 *
 * <p>Represents the metadata and content reference for importing a swim activity
 * from an external file format (FIT or TCX).
 *
 * @param filename    original filename for format detection
 * @param source      expected source device type
 * @param poolLength  pool length in meters (optional, defaults to 25)
 */
@Schema(description = "Request for importing a swim activity file")
public record ImportRequestDto(

        @Schema(
                description = "Original filename with extension (used for format detection)",
                example = "2024-01-15_swim.fit",
                requiredMode = Schema.RequiredMode.REQUIRED
        )
        @NotBlank(message = "Filename must not be blank")
        String filename,

        @Schema(
                description = "Expected source device type (GARMIN or FORM)",
                example = "GARMIN",
                requiredMode = Schema.RequiredMode.REQUIRED
        )
        @NotNull(message = "Source must not be null")
        ActivitySource source,

        @Schema(
                description = "Pool length in meters (defaults to 25 if not specified)",
                example = "25",
                minimum = "10",
                maximum = "100",
                requiredMode = Schema.RequiredMode.NOT_REQUIRED
        )
        Integer poolLength

) {
    /**
     * Creates an ImportRequestDto with default pool length.
     *
     * @param filename original filename
     * @param source   source device type
     */
    public ImportRequestDto(String filename, ActivitySource source) {
        this(filename, source, 25);
    }

    /**
     * Returns the effective pool length (defaults to 25 if null).
     *
     * @return pool length in meters
     */
    public int effectivePoolLength() {
        return poolLength != null ? poolLength : 25;
    }
}
