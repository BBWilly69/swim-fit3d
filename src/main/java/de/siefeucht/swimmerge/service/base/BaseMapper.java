package de.siefeucht.swimmerge.service.base;

import java.util.List;
import java.util.Optional;

/**
 * Generic mapper interface for entity-DTO conversions.
 *
 * <p>All entity-specific mappers should extend this interface.
 * MapStruct will generate implementations automatically.
 *
 * @param <E> entity type
 * @param <D> DTO type
 */
public interface BaseMapper<E, D> {

    /**
     * Converts an entity to its DTO representation.
     *
     * @param entity the entity to convert, must not be null
     * @return the DTO representation
     */
    D toDto(E entity);

    /**
     * Converts a DTO to its entity representation.
     *
     * @param dto the DTO to convert, must not be null
     * @return the entity representation
     */
    E toEntity(D dto);

    /**
     * Converts a list of entities to DTOs.
     *
     * @param entities list of entities to convert
     * @return list of DTOs
     */
    List<D> toDtoList(List<E> entities);

    /**
     * Converts a list of DTOs to entities.
     *
     * @param dtos list of DTOs to convert
     * @return list of entities
     */
    List<E> toEntityList(List<D> dtos);

    /**
     * Converts an optional entity to an optional DTO.
     *
     * @param entity optional entity
     * @return optional DTO
     */
    default Optional<D> toDto(Optional<E> entity) {
        return entity.map(this::toDto);
    }
}
