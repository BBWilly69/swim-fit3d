package de.siefeucht.swimmerge.domain.model;

/**
 * Indicates the confidence level of merged lap data.
 *
 * <p>Confidence scoring is crucial for transparency in the merge process.
 * Users should be able to see which laps have high certainty and which
 * might require manual review.
 *
 * <p>Scoring rules:
 * <ul>
 *     <li>{@link #HIGH} - FORM length count matches expected, Garmin time overlap &gt; 95%</li>
 *     <li>{@link #MEDIUM} - Minor time deviation between sources</li>
 *     <li>{@link #LOW} - Start/stop conflicts or significant discrepancies</li>
 * </ul>
 */
public enum LapConfidence {

    /**
     * High confidence: All data sources agree within acceptable tolerance.
     * FORM length count matches expected, Garmin time overlap exceeds 95%.
     */
    HIGH,

    /**
     * Medium confidence: Minor discrepancies exist but data is usable.
     * Typically indicates small time deviations between sources.
     */
    MEDIUM,

    /**
     * Low confidence: Significant conflicts detected.
     * Start/stop time conflicts or major data mismatches require review.
     */
    LOW
}
