package de.siefeucht.swimmerge.domain.model;

/**
 * Identifies the source device of swim activity data.
 *
 * <p>Understanding the source is critical because each device has
 * different strengths and weaknesses:
 * <ul>
 *     <li>{@link #GARMIN} - Accurate time base (button-triggered), unreliable turn detection</li>
 *     <li>{@link #FORM} - Accurate turn/length detection, may have delayed start (water contact trigger)</li>
 *     <li>{@link #MERGED} - Combined data using best attributes from each source</li>
 * </ul>
 */
public enum ActivitySource {

    /**
     * Data originates from Garmin Swim 2.
     * Strengths: Precise start/stop times (button-triggered).
     * Weaknesses: Systematic errors in turn detection.
     */
    GARMIN,

    /**
     * Data originates from FORM Smart Swim 2.
     * Strengths: 100% accurate turn/length detection.
     * Weaknesses: Start may be delayed (water contact trigger).
     */
    FORM,

    /**
     * Data has been merged from multiple sources.
     * Uses FORM for lengths/turns and Garmin for time base.
     */
    MERGED
}
