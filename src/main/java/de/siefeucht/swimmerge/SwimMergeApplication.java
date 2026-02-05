package de.siefeucht.swimmerge;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Main entry point for the Swim Data Merge application.
 *
 * <p>This application provides deterministic merging of swim activity data
 * from FORM Smart Swim 2 and Garmin Swim 2 devices. It prioritizes:
 * <ul>
 *     <li>FORM for lap/length detection (100% accurate turn detection)</li>
 *     <li>Garmin for time base (button-triggered start/stop)</li>
 * </ul>
 *
 * @author siefeucht
 * @version 1.0.0
 */
@SpringBootApplication
public class SwimMergeApplication {

    /**
     * Application entry point.
     *
     * @param args command line arguments passed to Spring Boot
     */
    public static void main(String[] args) {
        SpringApplication.run(SwimMergeApplication.class, args);
    }
}
