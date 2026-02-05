# COPILOT INSTRUCTIONS
# ====================
# Global instructions for AI-assisted development of this project.

## Project Context
Swim activity data merge application combining FORM Smart Swim 2 and Garmin Swim 2 data.

## Technology Stack

### Backend
- Java 21
- Spring Boot 4.0
- Maven
- Lombok
- MapStruct
- Spring Data JPA
- PostgreSQL
- Flyway
- OpenAPI / Swagger UI
- JUnit 5 + Hamcrest

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- **yarn** (package manager - ALWAYS use yarn, NEVER npm)
- TailwindCSS 4.x
- Recharts + ECharts (charts)
- Framer Motion (animations)
- react-i18next (internationalization)
- Lucide React (icons)

### Frontend Rules
1. ALWAYS use `yarn` for package management (not npm)
2. Run `yarn add <package>` for dependencies
3. Run `yarn add -D <package>` for dev dependencies
4. Run `yarn build` to build
5. Run `yarn dev` to start dev server
6. All UI text must be i18n-ready (use `useTranslation` hook)
7. All components must support theme switching via CSS variables
8. Reuse components from `/src/components/ui/`

## Hard Rules (MUST follow)

### Code Quality
1. NEVER generate incomplete or non-compiling code
2. All JavaDoc and code comments MUST be in English
3. Every public class MUST have JavaDoc
4. Every method MUST have JavaDoc describing: purpose, inputs, outputs, edge cases
5. No TODOs in generated code unless explicitly requested
6. Cyclomatic complexity per method ≤ 10
7. Prefer generic, reusable functions over copy-paste

### Architecture
8. Strict 3-layer architecture: Presentation → Business → Persistence
9. No business logic in controllers (delegation only)
10. Domain objects must be vendor-neutral (no FORM/Garmin specifics)

### Naming Convention (MANDATORY)
| Type | Pattern | Example |
|------|---------|---------|
| Entity | `<Name>` | `SwimActivity` |
| DTO | `<Name>Dto` | `SwimActivityDto` |
| Mapper | `<Name>Mapper` | `SwimActivityMapper` |
| Repository | `<Name>Repository` | `SwimActivityRepository` |
| Controller | `<Name>Controller` | `SwimActivityController` |
| Service | `<Name>Service` | `SwimActivityService` |
| Validator | `<Name>Validator` | `SwimActivityValidator` |

### Data Handling
11. Time handling MUST use java.time (Instant, Duration)
12. Deterministic logic only (no "magic" heuristics without explanation)
13. Prefer immutability where possible
14. Fail fast with explicit exceptions

### Testing
15. 100% coverage on generic/abstract base classes
16. JUnit 5 with nested test classes
17. Hamcrest matchers for assertions

### OpenAPI
18. OpenAPI specs split by module with selectable examples
19. Examples must be realistic and complete

##garmin fit information
https://developer.garmin.com/fit/cookbook/encoding-activity-files/

https://developer.garmin.com/fit/cookbook/developer-data/

https://developer.garmin.com/fit/cookbook/encoding-workout-files/

## Merge Logic Rules (Domain-Specific)

### Start Time Resolution
```
IF Garmin.start <= FORM.start + 5s THEN
    use Garmin.start
ELSE
    use FORM.start
```

### End Time Resolution
```
IF Garmin.stop >= FORM.stop - 5s THEN
    use Garmin.stop
ELSE
    use FORM.stop
```

### Data Priority
- Lengths/Turns: FORM (100% accurate)
- Time Base: Garmin (button-triggered)
- Distance: Calculated (FORM lengths × pool length)

## Model Recommendations
- Use **Claude Opus 4.5 in Agent Mode** for complex multi-file implementations
- Use **GPT-4.1** for boilerplate-heavy tasks requiring strict correctness
- Use **GPT-4o** for UI/visualization work

## Response Format
Every response MUST end with a model recommendation for the next task:
```
→ Use [Model Name] in [Mode] for [next task description]
```
