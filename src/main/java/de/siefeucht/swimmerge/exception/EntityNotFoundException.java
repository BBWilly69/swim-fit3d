package de.siefeucht.swimmerge.exception;

import java.io.Serial;
import java.util.UUID;

/**
 * Exception thrown when a requested entity cannot be found.
 *
 * <p>This is typically thrown by service layer when a lookup by ID
 * returns no result. Results in HTTP 404 response.
 */
public class EntityNotFoundException extends SwimMergeException {

    @Serial
    private static final long serialVersionUID = 1L;

    private final String entityType;
    private final String identifier;

    /**
     * Creates a new exception for a missing entity.
     *
     * @param entityType type name of the entity (e.g., "SwimActivity")
     * @param identifier the identifier that was not found
     */
    public EntityNotFoundException(String entityType, String identifier) {
        super(String.format("%s not found with identifier: %s", entityType, identifier));
        this.entityType = entityType;
        this.identifier = identifier;
    }

    /**
     * Creates a new exception for a missing entity by UUID.
     *
     * @param entityType type name of the entity
     * @param id         the UUID that was not found
     */
    public EntityNotFoundException(String entityType, UUID id) {
        this(entityType, id.toString());
    }

    /**
     * Returns the entity type that was not found.
     *
     * @return entity type name
     */
    public String getEntityType() {
        return entityType;
    }

    /**
     * Returns the identifier that was not found.
     *
     * @return identifier string
     */
    public String getIdentifier() {
        return identifier;
    }
}
