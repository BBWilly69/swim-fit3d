package de.siefeucht.swimmerge.exception;

import java.io.Serial;

/**
 * Base exception for all application-specific exceptions.
 *
 * <p>Provides consistent error handling and messaging across the application.
 * All domain and service exceptions should extend this class.
 */
public class SwimMergeException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * Creates a new exception with a message.
     *
     * @param message descriptive error message
     */
    public SwimMergeException(String message) {
        super(message);
    }

    /**
     * Creates a new exception with a message and cause.
     *
     * @param message descriptive error message
     * @param cause   underlying cause of the exception
     */
    public SwimMergeException(String message, Throwable cause) {
        super(message, cause);
    }
}
