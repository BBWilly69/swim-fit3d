package de.siefeucht.swimmerge.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.ExternalDocumentation;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * OpenAPI/Swagger configuration.
 *
 * <p>Configures the API documentation with proper metadata,
 * servers, and tag definitions for organized endpoint grouping.
 */
@Configuration
public class OpenApiConfig {

    @Value("${server.port:8080}")
    private int serverPort;

    /**
     * Creates the OpenAPI specification bean.
     *
     * @return configured OpenAPI instance
     */
    @Bean
    public OpenAPI swimMergeOpenAPI() {
        return new OpenAPI()
                .info(apiInfo())
                .servers(servers())
                .tags(tags())
                .externalDocs(externalDocs())
                .components(new Components());
    }

    private Info apiInfo() {
        return new Info()
                .title("Swim Data Merge API")
                .description("""
                        REST API for merging swim activity data from FORM Smart Swim 2 
                        and Garmin Swim 2 devices.
                        
                        ## Key Features
                        - Import FIT files from Garmin Swim 2
                        - Import TCX/CSV files from FORM Smart Swim 2
                        - Deterministic merge using best data from each source
                        - Confidence scoring for merged data quality
                        
                        ## Data Priority Rules
                        | Aspect | Source |
                        |--------|--------|
                        | Lengths/Turns | FORM (authoritative) |
                        | Start Time | Garmin (if within tolerance) |
                        | End Time | Garmin (if within tolerance) |
                        | Distance | Calculated from FORM lengths |
                        """)
                .version("1.0.0")
                .contact(new Contact()
                        .name("Swim Merge Support")
                        .email("support@siefeucht.de"))
                .license(new License()
                        .name("Private")
                        .url("https://siefeucht.de/license"));
    }

    private List<Server> servers() {
        return List.of(
                new Server()
                        .url("http://localhost:" + serverPort + "/api")
                        .description("Local Development Server")
        );
    }

    private List<Tag> tags() {
        return List.of(
                new Tag()
                        .name("Activities")
                        .description("Swim activity management endpoints"),
                new Tag()
                        .name("Import")
                        .description("Data import from device files (FIT, TCX, CSV)"),
                new Tag()
                        .name("Merge")
                        .description("Activity data merge operations"),
                new Tag()
                        .name("Export")
                        .description("Export merged activities to various formats")
        );
    }

    private ExternalDocumentation externalDocs() {
        return new ExternalDocumentation()
                .description("Swim Data Merge Documentation")
                .url("https://siefeucht.de/swimmerge/docs");
    }
}
