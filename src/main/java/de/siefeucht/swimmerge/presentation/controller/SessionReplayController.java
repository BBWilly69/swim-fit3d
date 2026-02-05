package de.siefeucht.swimmerge.presentation.controller;

import de.siefeucht.swimmerge.business.service.SessionReplayService;
import de.siefeucht.swimmerge.domain.model.SwimActivity;
import de.siefeucht.swimmerge.presentation.dto.SessionReplayDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for session replay data.
 *
 * <p>Provides endpoints for retrieving stroke-by-stroke playback data
 * suitable for 3D visualization of swim activities.
 *
 * <p>Endpoints:
 * <ul>
 *   <li>GET /replay/{id} - Get replay data for specific activity</li>
 *   <li>GET /replay/demo - Get demo replay data for testing</li>
 *   <li>GET /replay/activities - List available activities</li>
 * </ul>
 */
@RestController
@RequestMapping("/replay")
@Tag(name = "Session Replay", description = "Stroke-by-stroke playback data for 3D visualization")
public class SessionReplayController {

    private static final Logger LOG = LoggerFactory.getLogger(SessionReplayController.class);

    private final SessionReplayService replayService;

    /**
     * Creates a new SessionReplayController.
     *
     * @param replayService service for generating replay data
     */
    public SessionReplayController(SessionReplayService replayService) {
        this.replayService = replayService;
    }

    /**
     * Retrieves session replay data for a specific activity.
     *
     * <p>Returns all stroke events, length markers, and lap markers
     * needed to render the activity in the 3D pool visualization.
     *
     * @param activityId UUID of the activity to retrieve
     * @return replay data DTO or 404 if not found
     */
    @GetMapping("/{activityId}")
    @Operation(
            summary = "Get session replay data",
            description = "Retrieves stroke-by-stroke replay data for 3D visualization of a swim activity"
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Replay data retrieved successfully",
                    content = @Content(schema = @Schema(implementation = SessionReplayDto.class))
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Activity not found"
            )
    })
    public ResponseEntity<SessionReplayDto> getReplayData(
            @Parameter(description = "Activity UUID", required = true)
            @PathVariable UUID activityId
    ) {
        LOG.info("Fetching replay data for activity: {}", activityId);

        return replayService.getActivity(activityId)
                .map(activity -> {
                    SessionReplayDto replay = replayService.createReplayData(activity);
                    LOG.info("Returning replay with {} events for activity {}",
                            replay.events().size(), activityId);
                    return ResponseEntity.ok(replay);
                })
                .orElseGet(() -> {
                    LOG.warn("Activity not found: {}", activityId);
                    return ResponseEntity.notFound().build();
                });
    }

    /**
     * Generates demo replay data for testing the 3D visualization.
     *
     * <p>Creates synthetic swim session data without requiring
     * actual imported activities. Useful for UI development and demos.
     *
     * @param durationMinutes session duration (default: 30)
     * @param poolLength      pool length in meters (default: 25)
     * @return demo replay data DTO
     */
    @GetMapping("/demo")
    @Operation(
            summary = "Get demo replay data",
            description = "Generates synthetic replay data for testing the 3D visualization"
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Demo replay data generated",
                    content = @Content(schema = @Schema(implementation = SessionReplayDto.class))
            )
    })
    public ResponseEntity<SessionReplayDto> getDemoReplayData(
            @Parameter(description = "Session duration in minutes", example = "30")
            @RequestParam(value = "duration", defaultValue = "30") int durationMinutes,

            @Parameter(description = "Pool length in meters", example = "25")
            @RequestParam(value = "poolLength", defaultValue = "25") int poolLength
    ) {
        LOG.info("Generating demo replay data: {}min, {}m pool", durationMinutes, poolLength);

        // Validate inputs
        if (durationMinutes < 1 || durationMinutes > 180) {
            return ResponseEntity.badRequest().build();
        }
        if (poolLength != 25 && poolLength != 50) {
            return ResponseEntity.badRequest().build();
        }

        SessionReplayDto replay = replayService.generateDemoReplayData(durationMinutes, poolLength);

        LOG.info("Generated demo with {} events, {} lengths, {} laps",
                replay.events().size(), replay.lengthMarkers().size(), replay.lapMarkers().size());

        return ResponseEntity.ok(replay);
    }

    /**
     * Lists all available activities that have replay data.
     *
     * @return list of activity UUIDs
     */
    @GetMapping("/activities")
    @Operation(
            summary = "List available activities",
            description = "Returns a list of activity IDs that have replay data available"
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Activity list retrieved",
                    content = @Content(schema = @Schema(implementation = ActivityListResponse.class))
            )
    })
    public ResponseEntity<ActivityListResponse> listActivities() {
        List<UUID> activityIds = replayService.getCachedActivityIds();
        LOG.info("Returning {} cached activity IDs", activityIds.size());
        return ResponseEntity.ok(new ActivityListResponse(activityIds, activityIds.size()));
    }

    /**
     * Response DTO for activity list.
     *
     * @param activityIds list of available activity UUIDs
     * @param count       total count
     */
    @Schema(description = "List of available activities")
    public record ActivityListResponse(

            @Schema(description = "List of activity UUIDs")
            List<UUID> activityIds,

            @Schema(description = "Total count")
            int count

    ) {}
}
