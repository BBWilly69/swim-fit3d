package de.siefeucht.swimmerge.domain.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Unit tests for {@link SwimLength}.
 */
class SwimLengthTest {

    private static final Instant START = Instant.parse("2026-01-30T06:00:00Z");
    private static final Instant END = Instant.parse("2026-01-30T06:00:22Z");

    @Nested
    @DisplayName("Constructor Validation")
    class ConstructorValidation {

        @Test
        @DisplayName("Should create valid SwimLength")
        void shouldCreateValidLength() {
            SwimLength length = new SwimLength(0, START, END, 25, 18, 32);

            assertThat(length.index(), is(0));
            assertThat(length.startTime(), is(START));
            assertThat(length.endTime(), is(END));
            assertThat(length.distanceMeters(), is(25));
            assertThat(length.strokeCount(), is(18));
            assertThat(length.strokeRate(), is(32));
        }

        @Test
        @DisplayName("Should allow null stroke data")
        void shouldAllowNullStrokeData() {
            SwimLength length = new SwimLength(0, START, END, 25, null, null);

            assertThat(length.strokeCount(), is(nullValue()));
            assertThat(length.strokeRate(), is(nullValue()));
        }

        @Test
        @DisplayName("Should throw when index is negative")
        void shouldThrowWhenIndexNegative() {
            assertThrows(IllegalArgumentException.class, () ->
                    new SwimLength(-1, START, END, 25, null, null));
        }

        @Test
        @DisplayName("Should throw when startTime is null")
        void shouldThrowWhenStartTimeNull() {
            assertThrows(IllegalArgumentException.class, () ->
                    new SwimLength(0, null, END, 25, null, null));
        }

        @Test
        @DisplayName("Should throw when endTime is null")
        void shouldThrowWhenEndTimeNull() {
            assertThrows(IllegalArgumentException.class, () ->
                    new SwimLength(0, START, null, 25, null, null));
        }

        @Test
        @DisplayName("Should throw when endTime is before startTime")
        void shouldThrowWhenEndTimeBeforeStartTime() {
            assertThrows(IllegalArgumentException.class, () ->
                    new SwimLength(0, END, START, 25, null, null));
        }

        @Test
        @DisplayName("Should throw when endTime equals startTime")
        void shouldThrowWhenEndTimeEqualsStartTime() {
            assertThrows(IllegalArgumentException.class, () ->
                    new SwimLength(0, START, START, 25, null, null));
        }

        @Test
        @DisplayName("Should throw when distance is zero")
        void shouldThrowWhenDistanceZero() {
            assertThrows(IllegalArgumentException.class, () ->
                    new SwimLength(0, START, END, 0, null, null));
        }

        @Test
        @DisplayName("Should throw when distance is negative")
        void shouldThrowWhenDistanceNegative() {
            assertThrows(IllegalArgumentException.class, () ->
                    new SwimLength(0, START, END, -25, null, null));
        }

        @Test
        @DisplayName("Should throw when strokeCount is negative")
        void shouldThrowWhenStrokeCountNegative() {
            assertThrows(IllegalArgumentException.class, () ->
                    new SwimLength(0, START, END, 25, -1, null));
        }

        @Test
        @DisplayName("Should throw when strokeRate is negative")
        void shouldThrowWhenStrokeRateNegative() {
            assertThrows(IllegalArgumentException.class, () ->
                    new SwimLength(0, START, END, 25, null, -1));
        }
    }

    @Nested
    @DisplayName("Calculated Properties")
    class CalculatedProperties {

        @Test
        @DisplayName("Should calculate duration correctly")
        void shouldCalculateDuration() {
            SwimLength length = new SwimLength(0, START, END, 25, null, null);

            assertThat(length.durationSeconds(), is(closeTo(22.0, 0.001)));
        }

        @Test
        @DisplayName("Should calculate pace per 100m correctly")
        void shouldCalculatePace() {
            SwimLength length = new SwimLength(0, START, END, 25, null, null);

            // 22 seconds for 25m = 88 seconds per 100m
            assertThat(length.pacePer100m(), is(closeTo(88.0, 0.001)));
        }
    }
}
