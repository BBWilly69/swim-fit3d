/**
 * Domain model package containing core business entities.
 *
 * <p>All classes in this package are:
 * <ul>
 *     <li>Immutable value objects (Java records)</li>
 *     <li>Vendor-neutral (no FORM/Garmin specifics)</li>
 *     <li>Self-validating (fail-fast on construction)</li>
 *     <li>Free of persistence annotations</li>
 * </ul>
 *
 * <p>Key domain concepts:
 * <ul>
 *     <li>{@link de.siefeucht.swimmerge.domain.model.SwimActivity} - Aggregate root for a swim session</li>
 *     <li>{@link de.siefeucht.swimmerge.domain.model.SwimLap} - Logical grouping of lengths</li>
 *     <li>{@link de.siefeucht.swimmerge.domain.model.SwimLength} - Single pool length (atomic unit)</li>
 *     <li>{@link de.siefeucht.swimmerge.domain.model.ActivitySource} - Data origin identifier</li>
 *     <li>{@link de.siefeucht.swimmerge.domain.model.LapConfidence} - Merge quality indicator</li>
 * </ul>
 */
package de.siefeucht.swimmerge.domain.model;
