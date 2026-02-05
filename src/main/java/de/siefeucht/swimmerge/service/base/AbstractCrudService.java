package de.siefeucht.swimmerge.service.base;

import de.siefeucht.swimmerge.exception.EntityNotFoundException;
import de.siefeucht.swimmerge.exception.ValidationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

/**
 * Abstract base service providing generic CRUD operations.
 *
 * <p>This class provides a standardized implementation of common CRUD
 * operations with built-in validation and error handling. All entity-specific
 * services should extend this class.
 *
 * <p>Features:
 * <ul>
 *     <li>Null-check validation on all inputs</li>
 *     <li>Automatic entity-DTO conversion via mapper</li>
 *     <li>Consistent exception handling</li>
 *     <li>Transaction management</li>
 *     <li>Logging</li>
 * </ul>
 *
 * <p>Subclasses must implement:
 * <ul>
 *     <li>{@link #getEntityName()} - Returns the entity type name for error messages</li>
 * </ul>
 *
 * @param <E>  entity type
 * @param <D>  DTO type
 * @param <ID> identifier type (typically UUID)
 */
public abstract class AbstractCrudService<E, D, ID> {

    /**
     * Logger instance for subclasses.
     */
    protected final Logger log = LoggerFactory.getLogger(getClass());

    /**
     * The JPA repository for entity persistence.
     */
    protected final JpaRepository<E, ID> repository;

    /**
     * The mapper for entity-DTO conversions.
     */
    protected final BaseMapper<E, D> mapper;

    /**
     * Constructs a new service with the required dependencies.
     *
     * @param repository JPA repository for the entity, must not be null
     * @param mapper     entity-DTO mapper, must not be null
     * @throws IllegalArgumentException if repository or mapper is null
     */
    protected AbstractCrudService(JpaRepository<E, ID> repository, BaseMapper<E, D> mapper) {
        this.repository = Objects.requireNonNull(repository, "Repository must not be null");
        this.mapper = Objects.requireNonNull(mapper, "Mapper must not be null");
    }

    /**
     * Returns the entity type name for error messages.
     *
     * @return entity name (e.g., "SwimActivity")
     */
    protected abstract String getEntityName();

    /**
     * Creates a new entity from a DTO.
     *
     * <p>Validates the DTO, converts it to an entity, persists it,
     * and returns the saved entity as a DTO.
     *
     * @param dto the DTO to create from, must not be null
     * @return the created entity as DTO
     * @throws ValidationException if dto is null or validation fails
     */
    @Transactional
    public D create(D dto) {
        validateNotNull(dto, "DTO");
        validateForCreate(dto);

        log.debug("Creating new {}", getEntityName());

        E entity = mapper.toEntity(dto);
        E saved = repository.save(entity);

        log.info("Created {} with ID: {}", getEntityName(), getEntityId(saved));

        return mapper.toDto(saved);
    }

    /**
     * Retrieves an entity by its identifier.
     *
     * @param id the entity identifier, must not be null
     * @return the entity as DTO
     * @throws ValidationException      if id is null
     * @throws EntityNotFoundException  if entity not found
     */
    @Transactional(readOnly = true)
    public D findById(ID id) {
        validateNotNull(id, "ID");

        log.debug("Finding {} by ID: {}", getEntityName(), id);

        return repository.findById(id)
                .map(mapper::toDto)
                .orElseThrow(() -> new EntityNotFoundException(getEntityName(), String.valueOf(id)));
    }

    /**
     * Retrieves all entities.
     *
     * @return list of all entities as DTOs
     */
    @Transactional(readOnly = true)
    public List<D> findAll() {
        log.debug("Finding all {}", getEntityName());

        List<E> entities = repository.findAll();

        log.debug("Found {} {} entities", entities.size(), getEntityName());

        return mapper.toDtoList(entities);
    }

    /**
     * Updates an existing entity.
     *
     * <p>Validates that the entity exists, then applies the update
     * from the provided DTO.
     *
     * @param id  the entity identifier, must not be null
     * @param dto the updated data, must not be null
     * @return the updated entity as DTO
     * @throws ValidationException      if id or dto is null
     * @throws EntityNotFoundException  if entity not found
     */
    @Transactional
    public D update(ID id, D dto) {
        validateNotNull(id, "ID");
        validateNotNull(dto, "DTO");
        validateForUpdate(id, dto);

        log.debug("Updating {} with ID: {}", getEntityName(), id);

        if (!repository.existsById(id)) {
            throw new EntityNotFoundException(getEntityName(), String.valueOf(id));
        }

        E entity = mapper.toEntity(dto);
        E saved = repository.save(entity);

        log.info("Updated {} with ID: {}", getEntityName(), id);

        return mapper.toDto(saved);
    }

    /**
     * Deletes an entity by its identifier.
     *
     * @param id the entity identifier, must not be null
     * @throws ValidationException      if id is null
     * @throws EntityNotFoundException  if entity not found
     */
    @Transactional
    public void delete(ID id) {
        validateNotNull(id, "ID");

        log.debug("Deleting {} with ID: {}", getEntityName(), id);

        if (!repository.existsById(id)) {
            throw new EntityNotFoundException(getEntityName(), String.valueOf(id));
        }

        repository.deleteById(id);

        log.info("Deleted {} with ID: {}", getEntityName(), id);
    }

    /**
     * Checks if an entity exists by its identifier.
     *
     * @param id the entity identifier, must not be null
     * @return true if entity exists, false otherwise
     * @throws ValidationException if id is null
     */
    @Transactional(readOnly = true)
    public boolean existsById(ID id) {
        validateNotNull(id, "ID");
        return repository.existsById(id);
    }

    /**
     * Returns the count of all entities.
     *
     * @return total number of entities
     */
    @Transactional(readOnly = true)
    public long count() {
        return repository.count();
    }

    /**
     * Validates that an object is not null.
     *
     * @param object    the object to validate
     * @param fieldName the field name for error messages
     * @throws ValidationException if object is null
     */
    protected void validateNotNull(Object object, String fieldName) {
        if (object == null) {
            throw new ValidationException(fieldName, "must not be null");
        }
    }

    /**
     * Performs custom validation before create operation.
     *
     * <p>Override this method to add entity-specific validation rules.
     * Default implementation does nothing.
     *
     * @param dto the DTO to validate
     * @throws ValidationException if validation fails
     */
    protected void validateForCreate(D dto) {
        // Default: no additional validation
    }

    /**
     * Performs custom validation before update operation.
     *
     * <p>Override this method to add entity-specific validation rules.
     * Default implementation does nothing.
     *
     * @param id  the entity ID
     * @param dto the DTO to validate
     * @throws ValidationException if validation fails
     */
    protected void validateForUpdate(ID id, D dto) {
        // Default: no additional validation
    }

    /**
     * Extracts the ID from an entity for logging purposes.
     *
     * <p>Override this method if the entity uses a non-standard ID accessor.
     * Default implementation returns entity.toString().
     *
     * @param entity the entity
     * @return string representation of the entity ID
     */
    protected String getEntityId(E entity) {
        return entity.toString();
    }
}
