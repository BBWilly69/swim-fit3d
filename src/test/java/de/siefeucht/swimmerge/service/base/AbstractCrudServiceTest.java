package de.siefeucht.swimmerge.service.base;

import de.siefeucht.swimmerge.exception.EntityNotFoundException;
import de.siefeucht.swimmerge.exception.ValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link AbstractCrudService}.
 *
 * <p>Tests all CRUD operations and validation logic with 100% coverage
 * of the abstract base class.
 */
@ExtendWith(MockitoExtension.class)
class AbstractCrudServiceTest {

    @Mock
    private JpaRepository<TestEntity, UUID> repository;

    @Mock
    private BaseMapper<TestEntity, TestDto> mapper;

    private TestCrudService service;

    @BeforeEach
    void setUp() {
        service = new TestCrudService(repository, mapper);
    }

    @Nested
    @DisplayName("Constructor Tests")
    class ConstructorTests {

        @Test
        @DisplayName("Should throw exception when repository is null")
        void shouldThrowWhenRepositoryNull() {
            assertThrows(NullPointerException.class, () ->
                    new TestCrudService(null, mapper));
        }

        @Test
        @DisplayName("Should throw exception when mapper is null")
        void shouldThrowWhenMapperNull() {
            assertThrows(NullPointerException.class, () ->
                    new TestCrudService(repository, null));
        }
    }

    @Nested
    @DisplayName("Create Tests")
    class CreateTests {

        @Test
        @DisplayName("Should create entity successfully")
        void shouldCreateEntitySuccessfully() {
            UUID id = UUID.randomUUID();
            TestDto inputDto = new TestDto(null, "Test");
            TestEntity entity = new TestEntity(id, "Test");
            TestDto outputDto = new TestDto(id, "Test");

            when(mapper.toEntity(inputDto)).thenReturn(entity);
            when(repository.save(entity)).thenReturn(entity);
            when(mapper.toDto(entity)).thenReturn(outputDto);

            TestDto result = service.create(inputDto);

            assertThat(result, is(notNullValue()));
            assertThat(result.id(), is(id));
            assertThat(result.name(), is("Test"));

            verify(mapper).toEntity(inputDto);
            verify(repository).save(entity);
            verify(mapper).toDto(entity);
        }

        @Test
        @DisplayName("Should throw ValidationException when DTO is null")
        void shouldThrowWhenDtoNull() {
            ValidationException ex = assertThrows(ValidationException.class, () ->
                    service.create(null));

            assertThat(ex.getMessage(), containsString("DTO"));
            assertThat(ex.getMessage(), containsString("must not be null"));
        }
    }

    @Nested
    @DisplayName("FindById Tests")
    class FindByIdTests {

        @Test
        @DisplayName("Should find entity by ID successfully")
        void shouldFindEntityById() {
            UUID id = UUID.randomUUID();
            TestEntity entity = new TestEntity(id, "Test");
            TestDto dto = new TestDto(id, "Test");

            when(repository.findById(id)).thenReturn(Optional.of(entity));
            when(mapper.toDto(entity)).thenReturn(dto);

            TestDto result = service.findById(id);

            assertThat(result, is(notNullValue()));
            assertThat(result.id(), is(id));
        }

        @Test
        @DisplayName("Should throw EntityNotFoundException when not found")
        void shouldThrowWhenNotFound() {
            UUID id = UUID.randomUUID();
            when(repository.findById(id)).thenReturn(Optional.empty());

            EntityNotFoundException ex = assertThrows(EntityNotFoundException.class, () ->
                    service.findById(id));

            assertThat(ex.getEntityType(), is("TestEntity"));
            assertThat(ex.getIdentifier(), is(id.toString()));
        }

        @Test
        @DisplayName("Should throw ValidationException when ID is null")
        void shouldThrowWhenIdNull() {
            ValidationException ex = assertThrows(ValidationException.class, () ->
                    service.findById(null));

            assertThat(ex.getMessage(), containsString("ID"));
        }
    }

    @Nested
    @DisplayName("FindAll Tests")
    class FindAllTests {

        @Test
        @DisplayName("Should return all entities")
        void shouldReturnAllEntities() {
            UUID id1 = UUID.randomUUID();
            UUID id2 = UUID.randomUUID();
            List<TestEntity> entities = List.of(
                    new TestEntity(id1, "Test1"),
                    new TestEntity(id2, "Test2")
            );
            List<TestDto> dtos = List.of(
                    new TestDto(id1, "Test1"),
                    new TestDto(id2, "Test2")
            );

            when(repository.findAll()).thenReturn(entities);
            when(mapper.toDtoList(entities)).thenReturn(dtos);

            List<TestDto> result = service.findAll();

            assertThat(result, hasSize(2));
            assertThat(result.get(0).name(), is("Test1"));
            assertThat(result.get(1).name(), is("Test2"));
        }

        @Test
        @DisplayName("Should return empty list when no entities")
        void shouldReturnEmptyList() {
            when(repository.findAll()).thenReturn(List.of());
            when(mapper.toDtoList(List.of())).thenReturn(List.of());

            List<TestDto> result = service.findAll();

            assertThat(result, is(empty()));
        }
    }

    @Nested
    @DisplayName("Update Tests")
    class UpdateTests {

        @Test
        @DisplayName("Should update entity successfully")
        void shouldUpdateEntitySuccessfully() {
            UUID id = UUID.randomUUID();
            TestDto inputDto = new TestDto(id, "Updated");
            TestEntity entity = new TestEntity(id, "Updated");
            TestDto outputDto = new TestDto(id, "Updated");

            when(repository.existsById(id)).thenReturn(true);
            when(mapper.toEntity(inputDto)).thenReturn(entity);
            when(repository.save(entity)).thenReturn(entity);
            when(mapper.toDto(entity)).thenReturn(outputDto);

            TestDto result = service.update(id, inputDto);

            assertThat(result.name(), is("Updated"));
        }

        @Test
        @DisplayName("Should throw EntityNotFoundException when entity not found")
        void shouldThrowWhenEntityNotFound() {
            UUID id = UUID.randomUUID();
            TestDto dto = new TestDto(id, "Updated");

            when(repository.existsById(id)).thenReturn(false);

            assertThrows(EntityNotFoundException.class, () ->
                    service.update(id, dto));
        }

        @Test
        @DisplayName("Should throw ValidationException when ID is null")
        void shouldThrowWhenIdNull() {
            assertThrows(ValidationException.class, () ->
                    service.update(null, new TestDto(null, "Test")));
        }

        @Test
        @DisplayName("Should throw ValidationException when DTO is null")
        void shouldThrowWhenDtoNull() {
            assertThrows(ValidationException.class, () ->
                    service.update(UUID.randomUUID(), null));
        }
    }

    @Nested
    @DisplayName("Delete Tests")
    class DeleteTests {

        @Test
        @DisplayName("Should delete entity successfully")
        void shouldDeleteEntitySuccessfully() {
            UUID id = UUID.randomUUID();
            when(repository.existsById(id)).thenReturn(true);

            service.delete(id);

            verify(repository).deleteById(id);
        }

        @Test
        @DisplayName("Should throw EntityNotFoundException when entity not found")
        void shouldThrowWhenEntityNotFound() {
            UUID id = UUID.randomUUID();
            when(repository.existsById(id)).thenReturn(false);

            assertThrows(EntityNotFoundException.class, () ->
                    service.delete(id));

            verify(repository, never()).deleteById(any());
        }

        @Test
        @DisplayName("Should throw ValidationException when ID is null")
        void shouldThrowWhenIdNull() {
            assertThrows(ValidationException.class, () ->
                    service.delete(null));
        }
    }

    @Nested
    @DisplayName("ExistsById Tests")
    class ExistsByIdTests {

        @Test
        @DisplayName("Should return true when entity exists")
        void shouldReturnTrueWhenExists() {
            UUID id = UUID.randomUUID();
            when(repository.existsById(id)).thenReturn(true);

            assertThat(service.existsById(id), is(true));
        }

        @Test
        @DisplayName("Should return false when entity does not exist")
        void shouldReturnFalseWhenNotExists() {
            UUID id = UUID.randomUUID();
            when(repository.existsById(id)).thenReturn(false);

            assertThat(service.existsById(id), is(false));
        }

        @Test
        @DisplayName("Should throw ValidationException when ID is null")
        void shouldThrowWhenIdNull() {
            assertThrows(ValidationException.class, () ->
                    service.existsById(null));
        }
    }

    @Nested
    @DisplayName("Count Tests")
    class CountTests {

        @Test
        @DisplayName("Should return correct count")
        void shouldReturnCorrectCount() {
            when(repository.count()).thenReturn(42L);

            assertThat(service.count(), is(42L));
        }

        @Test
        @DisplayName("Should return zero when empty")
        void shouldReturnZeroWhenEmpty() {
            when(repository.count()).thenReturn(0L);

            assertThat(service.count(), is(0L));
        }
    }

    // Test implementations for abstract class testing

    /**
     * Test entity for unit testing.
     */
    record TestEntity(UUID id, String name) {
    }

    /**
     * Test DTO for unit testing.
     */
    record TestDto(UUID id, String name) {
    }

    /**
     * Concrete implementation of AbstractCrudService for testing.
     */
    static class TestCrudService extends AbstractCrudService<TestEntity, TestDto, UUID> {

        TestCrudService(JpaRepository<TestEntity, UUID> repository, BaseMapper<TestEntity, TestDto> mapper) {
            super(repository, mapper);
        }

        @Override
        protected String getEntityName() {
            return "TestEntity";
        }

        @Override
        protected String getEntityId(TestEntity entity) {
            return entity.id() != null ? entity.id().toString() : "new";
        }
    }
}
