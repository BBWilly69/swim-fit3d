package de.siefeucht.swimmerge.config;

import de.siefeucht.swimmerge.exception.EntityNotFoundException;
import de.siefeucht.swimmerge.exception.ImportException;
import de.siefeucht.swimmerge.exception.SwimMergeException;
import de.siefeucht.swimmerge.exception.ValidationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.time.Instant;

/**
 * Global exception handler for REST API.
 *
 * <p>Converts application exceptions to RFC 7807 Problem Detail responses.
 * All error responses follow a consistent structure for API consumers.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger LOG = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private static final String TYPE_BASE = "https://swimmerge.siefeucht.de/errors/";

    /**
     * Handles entity not found exceptions.
     *
     * @param ex the exception
     * @return problem detail with 404 status
     */
    @ExceptionHandler(EntityNotFoundException.class)
    public ProblemDetail handleEntityNotFound(EntityNotFoundException ex) {
        LOG.debug("Entity not found: {}", ex.getMessage());

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND,
                ex.getMessage()
        );
        problem.setType(URI.create(TYPE_BASE + "not-found"));
        problem.setTitle("Entity Not Found");
        problem.setProperty("entityType", ex.getEntityType());
        problem.setProperty("identifier", ex.getIdentifier());
        problem.setProperty("timestamp", Instant.now());

        return problem;
    }

    /**
     * Handles validation exceptions.
     *
     * @param ex the exception
     * @return problem detail with 400 status
     */
    @ExceptionHandler(ValidationException.class)
    public ProblemDetail handleValidation(ValidationException ex) {
        LOG.debug("Validation failed: {}", ex.getMessage());

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                ex.getMessage()
        );
        problem.setType(URI.create(TYPE_BASE + "validation"));
        problem.setTitle("Validation Error");
        if (ex.getField() != null) {
            problem.setProperty("field", ex.getField());
        }
        problem.setProperty("timestamp", Instant.now());

        return problem;
    }

    /**
     * Handles import exceptions.
     *
     * @param ex the exception
     * @return problem detail with 400 status
     */
    @ExceptionHandler(ImportException.class)
    public ProblemDetail handleImport(ImportException ex) {
        LOG.warn("Import failed: {}", ex.getMessage(), ex);

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                ex.getMessage()
        );
        problem.setType(URI.create(TYPE_BASE + "import"));
        problem.setTitle("Import Error");
        problem.setProperty("fileName", ex.getFileName());
        problem.setProperty("timestamp", Instant.now());

        return problem;
    }

    /**
     * Handles generic application exceptions.
     *
     * @param ex the exception
     * @return problem detail with 500 status
     */
    @ExceptionHandler(SwimMergeException.class)
    public ProblemDetail handleSwimMerge(SwimMergeException ex) {
        LOG.error("Application error: {}", ex.getMessage(), ex);

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR,
                ex.getMessage()
        );
        problem.setType(URI.create(TYPE_BASE + "internal"));
        problem.setTitle("Internal Error");
        problem.setProperty("timestamp", Instant.now());

        return problem;
    }

    /**
     * Handles unexpected exceptions.
     *
     * @param ex the exception
     * @return problem detail with 500 status
     */
    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpected(Exception ex) {
        LOG.error("Unexpected error: {}", ex.getMessage(), ex);

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "An unexpected error occurred"
        );
        problem.setType(URI.create(TYPE_BASE + "unexpected"));
        problem.setTitle("Unexpected Error");
        problem.setProperty("timestamp", Instant.now());

        return problem;
    }
}
