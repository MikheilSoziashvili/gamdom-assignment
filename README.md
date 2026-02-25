# Gamdom QA Automation Framework

A senior QA engineer demonstration project showcasing a production-grade Playwright + TypeScript test automation framework targeting the Gamdom.com iGaming platform and the JIRA REST API.

---

## Project Overview

This repository demonstrates the design and implementation of a scalable, maintainable QA automation framework for an iGaming platform. It covers:

- **UI automation** of critical Gamdom.com user journeys (homepage navigation, game lobby, login validation).
- **API automation** of JIRA issue CRUD operations via a typed API client.
- **Exploratory testing documentation** for five high-risk business areas.
- **Complex scenario analysis** for the Live Crash game's WebSocket-driven, timing-critical mechanics.

The framework is intentionally structured to reflect patterns used in enterprise QA organisations: clear separation of concerns, reusable abstractions, and straightforward onboarding for new team members.

---

## Tech Stack

| Tool / Library | Version | Purpose |
|----------------|---------|---------|
| [Playwright](https://playwright.dev) | ^1.x | Browser automation and WebSocket interception |
| TypeScript | ^5.x | Type safety across pages, fixtures, and API clients |
| Node.js | 18+ | Runtime |
| Page Object Model | — | UI abstraction pattern |
| Custom Fixtures | — | Dependency injection for pages and API clients |
| Factory Pattern | — | Deterministic, composable test data generation |
| JIRA REST API | v2 | API layer automation target |

---

## Project Structure

```
gamdom-assignment/
├── .env.example                        # Environment variable template
├── tsconfig.json                       # TypeScript compiler configuration
├── package.json                        # Dependencies and npm scripts
├── playwright.config.ts                # Playwright projects, reporters, base URL
├── README.md                           # This file
├── docs/
│   ├── exploratory-testing.md          # 5-area exploratory testing charters
│   └── complex-scenario-analysis.md   # Deep dive: Live Crash game testing
├── src/
│   ├── config/
│   │   └── environment.ts              # Typed env variable access (no raw process.env in tests)
│   ├── pages/
│   │   ├── base.page.ts                # Shared Playwright helpers for all page objects
│   │   ├── header.component.ts         # Reusable header component object
│   │   ├── home.page.ts                # Gamdom homepage interactions
│   │   ├── game-lobby.page.ts          # Game lobby search, filter, launch
│   │   └── login.page.ts               # Login form interactions and validation
│   ├── api/
│   │   └── jira-api-client.ts          # Typed JIRA REST API client (Playwright APIRequestContext)
│   ├── fixtures/
│   │   ├── ui.fixtures.ts              # Playwright fixtures: page objects injected into tests
│   │   └── api.fixtures.ts             # Playwright fixtures: API client injected into tests
│   └── data/
│       └── factories/
│           └── issue.factory.ts        # JIRA issue payload factory (builder pattern)
└── tests/
    ├── ui/
    │   ├── homepage-navigation.spec.ts # Homepage nav, hero section, category links
    │   ├── game-lobby.spec.ts          # Search, filter, game card assertions
    │   └── login-validation.spec.ts    # Login field validation and error states
    └── api/
        └── jira-issues-crud.spec.ts    # JIRA issue create / read / update / delete
```

---

## Setup Instructions

### Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **npm 9+** (bundled with Node.js 18)
- A Gamdom.com account (for authenticated UI tests)
- A JIRA account with an API token (for API tests)

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Copy the example file and populate it with your credentials:

```bash
cp .env.example .env
```

Open `.env` and set the following values:

```dotenv
# Gamdom
GAMDOM_BASE_URL=https://gamdom.com
GAMDOM_USERNAME=your_gamdom_email@example.com
GAMDOM_PASSWORD=your_gamdom_password

# JIRA
JIRA_BASE_URL=https://your-org.atlassian.net
JIRA_EMAIL=your_jira_email@example.com
JIRA_API_TOKEN=your_jira_api_token
JIRA_PROJECT_KEY=YOUR_PROJECT_KEY
```

> The `src/config/environment.ts` module reads these values and throws a descriptive error at startup if any required variable is missing — preventing silent failures in CI.

### Install Playwright Browsers

```bash
npx playwright install --with-deps chromium
```

To install all browsers (Chromium, Firefox, WebKit):

```bash
npx playwright install --with-deps
```

---

## Running Tests

### All Tests

```bash
npm test
```

### UI Tests Only

```bash
npm run test:ui
```

Runs tests under `tests/ui/` using the `ui` Playwright project (Chromium, headed or headless per config).

### API Tests Only

```bash
npm run test:api
```

Runs tests under `tests/api/` using the `api` Playwright project (no browser, APIRequestContext only).

### View HTML Report

```bash
npm run test:report
```

Opens the Playwright HTML report from the last test run in your default browser.

### Additional Playwright Options

```bash
# Run in headed mode (watch the browser)
npx playwright test --headed

# Run a specific spec file
npx playwright test tests/ui/game-lobby.spec.ts

# Run with Playwright UI mode (interactive)
npx playwright test --ui

# Debug a specific test
npx playwright test --debug tests/ui/login-validation.spec.ts
```

---

## Framework Architecture

### Page Object Model (POM)

Every distinct UI surface has a corresponding page object class in `src/pages/`. Page objects encapsulate:

- **Locators** — defined as class properties using Playwright's `Locator` API, evaluated lazily.
- **Actions** — methods that perform user interactions (e.g., `loginPage.submitCredentials(email, password)`).
- **Assertions** — methods that verify page state (e.g., `gameLobbyPage.expectGameVisible(title)`).

Tests contain no raw selectors or direct `page.*` calls — they interact only through page object methods. This means selector changes require a single update in one file, not across every test.

### Component Object

`header.component.ts` demonstrates the **Component Object** pattern for UI elements that appear across multiple pages. The header (navigation, login button, user menu) is modelled separately and composed into page objects that need it, avoiding selector duplication.

### Custom Fixtures

`src/fixtures/ui.fixtures.ts` and `src/fixtures/api.fixtures.ts` extend Playwright's base `test` object using the fixtures API. This provides **dependency injection**: tests declare what they need (e.g., `homePage`, `jiraClient`) as function parameters, and the fixture layer constructs and tears down those objects.

```typescript
// In a test file — no setup boilerplate
test('game lobby search returns results', async ({ gameLobbyPage }) => {
  await gameLobbyPage.searchFor('Blackjack');
  await gameLobbyPage.expectResultsVisible();
});
```

### API Client Abstraction

`src/api/jira-api-client.ts` wraps Playwright's `APIRequestContext` with typed methods (`createIssue`, `getIssue`, `updateIssue`, `deleteIssue`). Tests interact with the API through this client rather than raw `request.post(...)` calls. Benefits:

- Type-safe request/response shapes.
- Centralised base URL, authentication headers, and error handling.
- Easy to swap the underlying transport without touching tests.

### Factory Pattern

`src/data/factories/issue.factory.ts` generates JIRA issue payloads using a builder-style factory. Tests specify only what they care about; the factory provides sensible defaults for the rest:

```typescript
const payload = IssueFactory.create({
  summary: 'Login button unresponsive on mobile viewport',
  priority: 'High',
});
```

This keeps test data intentions explicit and prevents test coupling through shared fixtures.

---

## Design Patterns

| Pattern | Where Used | Why |
|---------|------------|-----|
| Page Object Model | `src/pages/*.page.ts` | Decouples test logic from selectors; single point of maintenance |
| Component Object | `src/pages/header.component.ts` | Reuses cross-page UI components without duplication |
| Fixture / Dependency Injection | `src/fixtures/*.fixtures.ts` | Eliminates boilerplate setup in each test; promotes reuse |
| Factory / Builder | `src/data/factories/issue.factory.ts` | Deterministic, readable test data with minimal coupling |
| Adapter / Wrapper | `src/api/jira-api-client.ts` | Hides transport details; enables typing and centralised error handling |
| Configuration Object | `src/config/environment.ts` | Single source of truth for env vars; fails fast with clear messages |

---

## Documentation

| Document | Description |
|----------|-------------|
| [Exploratory Testing Charters](./docs/exploratory-testing.md) | SBTM-style charters for 5 critical Gamdom business areas: authentication, cashier, game lobby, sports betting, and responsible gaming |
| [Complex Scenario Analysis](./docs/complex-scenario-analysis.md) | Deep technical analysis of the Live Crash game: WebSocket state management, race conditions, multiplier precision, and a full test case catalogue |

---

## Scaling Strategy

This framework is intentionally minimal to demonstrate patterns clearly. In a production engagement, it would scale in the following directions:

### Additional Page Objects

Each new feature area (sports betting, cashier, responsible gaming tools) gets its own page object or component. The base page class provides shared utilities; new pages inherit and extend without repetition.

### CI/CD Integration

The framework is CI-ready. A GitHub Actions or GitLab CI pipeline would:

1. Spin up a Node.js environment.
2. Run `npm ci` and `npx playwright install --with-deps`.
3. Execute `npm test` with environment variables injected as secrets.
4. Publish the HTML report as a pipeline artifact.
5. Fail the pipeline on any test failure, blocking merges to main.

### Parallel Execution

Playwright's `workers` configuration enables parallel test execution across multiple CPU cores or multiple CI agents. Tests are already written to be stateless and independently runnable — a prerequisite for safe parallelism.

### Visual Regression Testing

Playwright's `expect(page).toHaveScreenshot()` API can be added to any test to capture and compare pixel-level screenshots. A dedicated visual regression project in `playwright.config.ts` would run on schedule (e.g., nightly) and alert on unexpected UI changes.

### Cross-Browser Coverage

The current config targets Chromium. Adding Firefox and WebKit projects to `playwright.config.ts` requires no test changes — the same page objects and fixtures work across all browsers.

### Reporting and Observability

The HTML reporter can be replaced or supplemented with:
- **Allure Reporter** for richer test categorisation and history trending.
- **Slack / Teams notifications** on test failure via CI webhook.
- **Test result upload to JIRA/Xray** using the existing JIRA API client as a foundation.

---

## Contributing

1. Branch from `main` with a descriptive branch name.
2. Add or update page objects before writing new test steps.
3. Use the factory for any new test data shapes.
4. Run `npm test` locally before opening a pull request.
5. Update this README if you add new patterns or scripts.
# gamdom-assignment
