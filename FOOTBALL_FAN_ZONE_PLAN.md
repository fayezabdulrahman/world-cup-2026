# Football Fan Zone Repurpose Plan

## Purpose

After the 2026 World Cup ends, repurpose the existing World Cup dashboard into a year-round European football fan zone.

The current layouts, card structure, navigation style, responsive behavior, and overall visual identity should be retained wherever possible. The work should primarily replace tournament-specific data, terminology, and logic rather than redesign the site.

## Product Goals

- Allow users to switch between major European leagues.
- Show upcoming fixtures, live matches, and past results for the selected league.
- Show the current league table in the existing standings layout.
- Predict the likely league champion using an explainable model.
- Replace national squads with the clubs and players in the selected league.
- Let users select a favourite club and receive a personalized overview.
- Keep the site useful throughout the domestic football season.

## Initial League Support

Launch with:

- Premier League
- La Liga
- Bundesliga
- Serie A
- Ligue 1

Design the league configuration so competitions such as the Champions League, Europa League, Eredivisie, Primeira Liga, Scottish Premiership, and domestic cups can be added later without restructuring the app.

## Existing Feature Mapping

| Current World Cup feature | Football Fan Zone replacement |
| --- | --- |
| World Cup 2026 branding | Football Fan Zone branding |
| Tournament overview | Selected league overview |
| World Cup team selector | League selector |
| Upcoming fixtures | Upcoming fixtures in the selected league |
| Live Match | Live match centre for the selected league |
| Past Fixtures | Results from the selected league |
| Group standings | Current league table |
| AI Winner Prediction | Predicted league champion and title probabilities |
| Knockout Map | Remove from navigation and application |
| Squads | Clubs and their current squads |
| My World Cup | My Team |
| Favourite national teams | One primary favourite club, with optional additional followed clubs later |
| Tournament calendar export | Favourite club fixture calendar |

## Navigation

Retain the existing navigation layout and update it to:

1. Overview
2. My Team
3. Live Match
4. Past Fixtures
5. AI Prediction
6. Squads

Remove `Knockout Map`.

Add a persistent league selector near the site branding or at the top of the overview. On mobile, it must fit naturally into the existing menu.

The selected league should:

- Be available on every page.
- Persist in local storage.
- Be reflected in the URL so a league view can be bookmarked or shared.
- Default to the Premier League for a new visitor.
- Refresh all league-dependent content when changed.

A future-friendly URL format would be:

```text
#/premier-league/overview
#/la-liga/predictions
#/bundesliga/squads
```

The exact routing approach can be decided during implementation. The important requirement is that league and page state are represented together.

## Page Plans

### 1. Overview

Keep the current dashboard layout.

Update the hero and dashboard cards to show:

- Selected league name, logo, country, and season.
- Live match spotlight, or the next scheduled match when none is live.
- Latest completed result.
- Upcoming fixtures.
- Current league table using the existing group-table visual style.
- Favourite team highlighting throughout the fixture list and table.
- A favourite team summary in the existing team snapshot area.

The favourite team summary can include:

- League position
- Points
- Recent form
- Next fixture
- Latest result
- Top scorer, when available
- Injury or suspension count, when reliable data is available

When no favourite team is selected, the card should invite the user to choose one.

### 2. Fixtures and Live Match

Reuse the current fixtures and live-match layouts.

Required behavior:

- Only show matches belonging to the selected league.
- Group fixtures by date or matchweek where useful.
- Keep kickoff times localized to the viewer.
- Preserve compact matchday mode.
- Highlight the favourite team's fixtures.
- Continue polling during live matches.
- Show score, match status, timeline, statistics, and lineups when supplied by the provider.
- Handle postponed, cancelled, suspended, and rescheduled matches explicitly.

Replace World Cup-specific labels such as group and tournament matchday with:

- League name
- Matchweek
- Stadium
- Match status

### 3. Past Fixtures

Keep the existing results and historical match-detail layout.

Add:

- Matchweek filter
- Team filter
- Date range or month filter
- Favourite team shortcut
- Clear empty states when a provider has incomplete historical data

Match details should continue to show final score, statistics, timeline, and lineups where available.

### 4. League Table

Repurpose `GroupsSection` and `buildGroupStandings` into a standard league table.

Display:

- Position
- Club
- Played
- Won
- Drawn
- Lost
- Goals for
- Goals against
- Goal difference
- Points
- Recent form, if available

Add visual qualification and relegation markers based on league configuration rather than hard-coded positions. For example, Champions League places and relegation places differ between competitions and seasons.

Prefer official provider standings. Keep a local standings calculator as a fallback and for verification.

### 5. AI Prediction

Keep the existing prediction page layout, contender ranking, probability display, and explanation panel.

Change the question to:

> Which club is best placed to win this league?

The model should produce a title probability for every club in the selected league. It should be recalculated when league data changes.

Suggested model inputs:

- Current points
- Games played
- Goal difference
- Goals scored and conceded
- Recent league form
- Home and away performance
- Remaining fixture difficulty
- Pre-season or long-term team strength rating
- Player availability, only if the data is reliable
- Market or external rating data, only if licensing permits it

The model should account for unequal games played and the remaining schedule. It should not simply rank the current table.

The page must:

- Explain the factors in plain language.
- Label probabilities as estimates, not guarantees.
- Show when the prediction was last updated.
- Show early-season uncertainty.
- Avoid calling the feature AI if the eventual implementation is only a static weighted formula; either build a genuine forecasting model or rename it to League Prediction.

Before implementation, define a testable forecasting method. A reasonable first version would simulate the remaining season many times using team strength ratings, current form, home advantage, and fixture difficulty.

### 6. Squads

Keep the existing squad page structure but replace national teams with clubs in the selected league.

The club selector should list only clubs in the active league. For each club show, when available:

- Club badge and name
- Manager
- Preferred or recent formation
- Full first-team squad
- Player positions
- Shirt numbers
- Age
- Nationality
- Current injuries or suspensions
- Projected or most-used starting XI

The existing pitch and projected XI layout can remain. Static World Cup squad JSON and hard-coded national-team formations should be removed once the league data source is ready.

### 7. My Team

Rename `My World Cup` to `My Team`.

For the first release, let the user choose one primary favourite club. Store:

- Favourite club ID
- Club name and badge fallback
- Club's league ID
- Notification preference
- Notification lead time

The My Team page should provide:

- Next fixture
- Latest result
- Current league position
- Recent form
- Upcoming fixture list
- Calendar export
- Match reminders
- Direct links to live and completed match details

The overview dashboard should use this preference to:

- Highlight favourite-team fixtures.
- Focus the team snapshot card on the favourite club.
- Show a compact favourite-team status panel.
- Provide a quick route to My Team.

If a user changes to a different league, their favourite club should remain saved. Show it in the overview only when it belongs to the selected league, with a clear shortcut back to its league otherwise.

## Data Architecture

### Competition Configuration

Create a central league configuration rather than scattering league rules through components.

Example shape:

```js
{
  id: 'premier-league',
  providerCompetitionId: '...',
  name: 'Premier League',
  shortName: 'PL',
  country: 'England',
  logo: '...',
  season: '2026-27',
  tableZones: {
    championsLeague: [1, 4],
    europaLeague: [5, 5],
    relegation: [18, 20]
  }
}
```

Provider IDs, qualification rules, and season labels must be configuration-driven.

### Normalized Domain Models

Replace World Cup-shaped objects with provider-neutral models:

- `Competition`
- `Season`
- `Club`
- `Player`
- `Fixture`
- `Venue`
- `Standing`
- `MatchDetails`
- `Prediction`
- `UserPreferences`

Components should consume normalized data rather than raw provider responses. This will make it possible to change data providers without rewriting the UI.

Keep compatibility fields only during migration. New code should use football-generic names such as `homeTeamId`, `awayTeamId`, `badge`, `competitionId`, and `matchweek`.

### Data Service Boundary

Replace `src/lib/worldCup.js` with smaller generic modules, for example:

```text
src/config/competitions.js
src/lib/football.js
src/lib/standings.js
src/lib/predictions.js
src/services/footballApi.js
src/services/normalizeFootballData.js
```

Suggested API responsibilities:

```text
/api/football/competitions
/api/football/:competitionId/overview
/api/football/:competitionId/fixtures
/api/football/:competitionId/standings
/api/football/:competitionId/teams
/api/football/matches/:matchId
```

The server layer should hold provider keys, normalize provider errors, apply caching, and avoid exposing secrets to the browser.

### Data Provider Selection

Choose the production provider at implementation time because pricing, coverage, rate limits, and licensing can change.

Evaluate candidates against:

- Coverage for all target leagues
- Fixtures, results, standings, squads, lineups, and live statistics
- Stable club and competition IDs across seasons
- Live update speed
- Historical data availability
- Rate limits and caching terms
- Badge and player image licensing
- Commercial display rights
- Cost at expected traffic

Do not assume the current World Cup feed or ESPN proxy can provide complete, licensed multi-league coverage.

### Caching and Refresh

Use different cache policies by data type:

- Competition metadata and clubs: long cache
- Squads: daily refresh
- Upcoming fixtures: periodic refresh
- Standings and completed results: refresh after matches
- Live matches: poll every 5-15 seconds, subject to provider limits
- Predictions: recalculate after relevant fixture or standings updates

Cache data per competition and season. A failure in one league must not remove previously cached data for another league.

## State and Persistence

Replace World Cup-specific local-storage keys with versioned generic keys:

```text
football-fan-zone-dashboard-v1
football-fan-zone-preferences-v1
football-fan-zone-compact-matchday-v1
```

Add a one-time migration from the current preference format where practical.

Application-level state should include:

- Selected league
- Selected season
- Selected fixture
- Selected club
- Favourite club
- Cached league data
- Loading, stale-data, and error status per league

Changing league must reset selected fixtures and clubs to valid choices from the new league without clearing the favourite club.

## Naming and Content Changes

Audit all visible copy and metadata for tournament-specific language:

- World Cup
- FIFA
- National team
- Group
- Qualifying form
- Tournament
- Road to the Final
- Confirmed squad

Also update:

- Page title and meta description
- Favicon and social preview assets
- Empty states
- Calendar event descriptions and filenames
- Browser notification text and tags
- Analytics labels
- API paths
- Cache keys
- Source links
- Accessibility labels

Retain the existing layouts and CSS class structure where it remains meaningful. Rename classes only when a World Cup-specific name would make future maintenance confusing.

## Removal and Replacement Checklist

Remove after the football data replacement is working:

- Knockout page and bracket logic
- Group-stage qualification logic
- FIFA confirmed squad snapshot
- National-team prediction profiles
- Hard-coded World Cup stadium time zones
- Hard-coded tournament start date
- National-team formation map
- World Cup API routes and proxy code
- World Cup-specific fixture snapshot
- FIFA-specific source links

Do not remove these pieces at the start of the migration. Keep the current site working while the generic data layer and replacement pages are developed.

## Implementation Phases

### Phase 1: Freeze and Audit

- Tag or branch the final World Cup version.
- Record screenshots of every page at desktop and mobile sizes.
- List current routes, local-storage keys, API calls, and analytics events.
- Confirm which layouts must remain pixel-consistent.
- Choose the football data provider and review its licensing.

### Phase 2: Generic Football Foundation

- Add competition configuration.
- Add league selection and persistence.
- Define normalized domain models.
- Build the server-side provider adapter.
- Add per-league loading, caching, stale-data, and error handling.
- Keep the existing World Cup experience available until this foundation is stable.

### Phase 3: Overview, Fixtures, Results, and Table

- Connect the existing overview to the selected league.
- Replace group labels with league and matchweek labels.
- Connect live fixtures and completed results.
- Convert group standings into the full league table.
- Verify timezone, postponed-match, and favourite-team behavior.

### Phase 4: My Team and Squads

- Migrate preferences to a primary favourite club.
- Repurpose My World Cup as My Team.
- Connect club and player squad data.
- Adapt calendar exports and notifications.
- Add favourite-team content to the overview.

### Phase 5: League Prediction

- Define and document the forecasting method.
- Add remaining-fixture simulations.
- Connect the existing prediction UI to league predictions.
- Add update timestamps, uncertainty messaging, and model validation.

### Phase 6: Cleanup and Rebrand

- Remove the knockout route and tournament-only code.
- Rename remaining World Cup-specific files, functions, keys, and copy.
- Replace branding assets and metadata.
- Remove obsolete static data and APIs.
- Update the README with setup, data provider, caching, and prediction details.

### Phase 7: Verification and Launch

- Test every target league.
- Test switching leagues from every page.
- Test mobile navigation and league selection.
- Test favourite-team persistence across reloads and league changes.
- Test live, upcoming, completed, postponed, and cancelled fixtures.
- Test provider failures and stale cached data.
- Test notification and calendar behavior.
- Run accessibility, performance, lint, and production-build checks.
- Compare all pages with the saved World Cup layout screenshots.

## Testing Strategy

Add automated tests around the parts most likely to produce silent errors:

- Provider response normalization
- League filtering
- Standings calculation and tie ordering
- Fixture status normalization
- Timezone display
- Favourite-team preference migration
- League switching
- Prediction probability totals
- Simulation behavior with games in hand
- Postponed and rescheduled fixtures
- Cache isolation between leagues

Use fixed provider fixtures for tests so results are repeatable and do not depend on a live API.

Add component or browser tests for:

- League selector
- Overview rendering
- Favourite-team selection
- Match navigation
- Result filtering
- Squad selection
- Empty, loading, stale, and error states

## Launch Acceptance Criteria

The repurpose is ready when:

- All five launch leagues can be selected.
- The selected league persists and has a shareable URL.
- Overview, live match, past fixtures, table, predictions, squads, and My Team all use the selected league.
- A user can choose one favourite club and see it reflected on the overview.
- Live, upcoming, completed, postponed, and cancelled matches display correctly.
- League predictions account for current performance and remaining fixtures.
- No knockout or group-stage UI remains.
- No visible World Cup or FIFA copy remains unless it is part of historical attribution.
- Existing desktop and mobile layouts remain recognizably unchanged.
- API credentials are server-side.
- Cached data is shown with a warning when the provider is unavailable.
- Lint, automated tests, and the production build pass.

## Decisions to Make When Work Begins

- Final product name and branding.
- Production football data provider.
- Whether one or multiple favourite clubs are supported at launch.
- Whether the site supports only the current season or season history.
- Whether live notifications need a backend and service worker, rather than only working while the site is open.
- Whether European competitions are part of the initial release or a later phase.
- Whether the prediction model remains local/server-owned or uses an external ML service.
- Whether user accounts and cross-device preference sync are needed later.

## Out of Scope for the First Release

- Knockout brackets
- Fantasy football
- Betting odds or betting recommendations
- Social feeds and chat
- Transfer news aggregation
- User accounts
- Cross-device synchronization
- Native mobile apps
- Every European league

These can be considered after the core multi-league experience is stable.
