# Swim Data Merge

Deterministic merge of swim activity data from FORM Smart Swim 2 and Garmin Swim 2 devices.

## Prerequisites

- Java 21+
- Maven 3.9+
- PostgreSQL 15+ (or Docker)

## Quick Start

```bash
# 1. Start PostgreSQL (if using Docker)
docker run -d \
  --name swimmerge-db \
  -e POSTGRES_DB=swimmerge \
  -e POSTGRES_USER=swimmerge \
  -e POSTGRES_PASSWORD=swimmerge \
  -p 5432:5432 \
  postgres:15

# 2. Build and run
mvn clean install
mvn spring-boot:run
```

## API Documentation

After starting the application, access Swagger UI at:
- http://localhost:8080/api/swagger-ui.html

## Project Structure

```
src/main/java/de/siefeucht/swimmerge/
├── config/         # Configuration classes
├── controller/     # REST controllers
├── domain/
│   └── model/      # Domain objects (records)
├── exception/      # Custom exceptions
├── service/
│   └── base/       # Generic CRUD service
├── persistence/    # JPA entities & repositories
├── mapper/         # MapStruct mappers
├── importers/      # FIT/TCX import logic
├── merge/          # Merge engine
└── export/         # Export functionality
```

## Merge Rules

| Aspect | Source | Reason |
|--------|--------|--------|
| Lengths/Turns | FORM | 100% accurate turn detection |
| Start Time | Garmin* | Button-triggered precision |
| End Time | Garmin* | Button-triggered precision |
| Distance | Calculated | FORM lengths × pool length |

*Garmin time used only if within 5s tolerance of FORM time.

## License

Private
