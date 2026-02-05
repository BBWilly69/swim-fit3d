package de.siefeucht.swimmerge.exception;

import java.io.Serial;

/**
 * Exception thrown when validation fails.
 *
 * <p>Used for both input validation and business rule validation.
 * Results in HTTP 400 response.
 */
public class ValidationException extends SwimMergeException {

    @Serial
    private static final long serialVersionUID = 1L;

    private final String field;

    /**
     * Creates a new validation exception with a message.
     *
     * @param message descriptive error message
     */
    public ValidationException(String message) {
        super(message);
        this.field = null;
    }

    /**
     * Creates a new validation exception for a specific field.
     *
     * @param field   the field that failed validation
     * @param message descriptive error message
     */
    public ValidationException(String field, String message) {
        super(String.format("Validation failed for '%s': %s", field, message));
        this.field = field;
    }

    /**
     * Returns the field that failed validation, if applicable.
     *
     * @return field name or null if not field-specific
     */
    public String getField() {
        return field;
    }
}
