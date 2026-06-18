# World Cup 2026 Dashboard

A responsive tournament companion for following the 2026 FIFA World Cup. It combines fixtures, live match coverage, standings, squads, predictions, personalized schedules, and player tracking in one spoiler-aware interface.

## Features

### Tournament overview

- Live-match or next-match spotlight with localized kickoff times
- Latest completed result with score, scorers, and match statistics
- Upcoming fixture navigation with compact and standard layouts
- All 12 group tables, calculated from tournament results
- In-play standings that provisionally apply the current score
- Match context explaining what a result means for qualification
- Persistent spoiler-free mode across scores, results, timelines, standings, and live probabilities
- Cached tournament data so the latest available view remains usable during temporary provider issues

### Live and completed matches

- Live score, match status, clock, venue, and last-updated indicator
- Match timeline covering goals, cards, substitutions, and other key events
- Official starting lineups, formations, and substitutes when published
- Team statistics including shots, possession, passing, and corners
- Modelled live win, draw, and loss probabilities
- Optional pre-match and phase-based live fractional odds
- Shared pre-match odds on the Spotlight and today's standard/compact fixture rows
- Scrollable past-fixture browser with full match-detail views
- Live-only polling to avoid unnecessary background requests between matches

### Discovery and forecasting

- **What to Watch** ranks the day's fixtures using qualification impact, knockout stakes, team strength, rivalries, and matchup quality
- **AI Winner Prediction** estimates every team's title probability from FIFA rank, qualifying form, and live tournament performance
- **Knockout Map** projects the Round of 32, best third-placed qualifiers, later rounds, and tournament winner
- Qualification scenarios identify when a team can secure or lose a top-two place

### Teams and players

- Confirmed 26-player FIFA squads for all 48 teams
- Searchable team and player views
- Squad breakdowns by position, age, height, and represented clubs
- Projected starting XI and formation views
- Device-local player watchlist
- Tracked player goals, assists, cards, minutes, secondary statistics, recent events, and next fixture when ESPN data is available

### My World Cup

- Follow one or more favourite teams without creating an account
- Personalized upcoming-fixture feed
- Favourite-team highlighting in fixture lists
- Browser kickoff reminders while the site is open
- Per-match Google Calendar links
- Downloadable `.ics` events and full team schedules for Apple Calendar, Outlook, and other calendar apps
- Preferences stored locally in the browser

### Experience

- Responsive desktop and mobile layouts
- Hash-based navigation with dedicated pages for each major feature
- Viewer-local dates and kickoff times with an explicit timezone label
- Accessible controls, labels, regions, and keyboard-friendly match lists
- Vercel Analytics and Speed Insights support

## Tech stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, JavaScript, HTML, CSS |
| Build tooling | Vite 8 and `@vitejs/plugin-react` |
| Routing | Lightweight hash-based routing |
| State and persistence | React hooks and browser `localStorage` |
| Browser integrations | Notifications API, Blob/File APIs, Google Calendar links, `Intl` date and timezone formatting |
| Server layer | Vercel Functions using Node.js-compatible JavaScript |
| Deployment | Vercel |
| Quality | ESLint 10 |
| Observability | Vercel Analytics and Speed Insights |

## Data sources

| Source | Used for |
| --- | --- |
| [ESPN World Cup scoreboard](https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard) | Tournament schedule, teams, groups, venues, scores, match status, and team badges |
| [ESPN match summaries](https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary) | Live clock, timelines, lineups, box scores, match statistics, goal scorers, and player match data |
| [FIFA confirmed squad announcement](https://inside.fifa.com/organisation/media-releases/world-cup-2026-48-squads-confirmed) and [official squad-list PDF](https://fdp.fifa.org/assetspublic/ce281/pdf/SquadLists-English.pdf) | Confirmed players, shirt numbers, positions, birth dates, clubs, heights, and coaches |
| Local team prediction profiles | Checked-in FIFA ranking and qualifying-form inputs used by the title and live-probability models |
| [The Odds API](https://the-odds-api.com/) | Optional pre-match and live head-to-head odds displayed as fractional prices, with Paddy Power, BoyleSports, and Betfair Sportsbook preferred when available |

The app's standings, qualification implications, watch rankings, title probabilities, live probabilities, projected formations, and knockout bracket are calculated locally. They are modelled outputs rather than official FIFA or ESPN forecasts.

The Vercel server functions proxy and normalize provider responses so API details and optional credentials are not exposed directly in the browser. Caching and stale-on-error behavior reduce provider load and improve resilience.

To stay within The Odds API's free allowance, all of a local calendar day's pre-match odds are fetched in one shared request. Live matches then use at most three snapshots: kickoff, halftime, and around 70 minutes. Live odds are not continuously polled. Each snapshot has a long-lived CDN cache key, so visitors reuse provider responses instead of spending one credit per visitor or fixture card.

## Local development

Requirements:

- Node.js with npm
- An optional The Odds API key if odds should be displayed

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add the optional server-side key to `.env.local`:

```bash
ODDS_API_KEY=your_key_here
```

Without that key, the rest of the dashboard continues to work and the odds component reports that no feed is configured.

## Scripts

```bash
npm run dev       # Start the local Vite server
npm run build     # Create a production build
npm run preview   # Preview the production build locally
npm run lint      # Run ESLint
```

## Prediction model

The title model starts with two checked-in inputs for each team:

1. FIFA ranking
2. Qualifying-form rating

As matches are completed, the model also incorporates group-stage points per match, goal difference, goals scored, and defensive performance. The resulting team-strength ratings are normalized into tournament-winning probabilities.

The live match model additionally considers the current score, official match clock, home advantage, and available shot data. All probabilities are estimates and update as the tournament feed changes.

## Privacy

Favourite teams, reminder settings, spoiler preferences, display preferences, cached dashboard data, and player watchlists are stored on the user's device. The app does not require user accounts.
