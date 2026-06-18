# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## Prediction sources explained

This app uses two main sources for predictions:

- Static team profiles from `src/data/teamPredictionProfiles.json`
  - Each team has a `fifaRank` and `qualifierForm` value.
  - `qualifierForm` is a fixed number representing how strong the team was in qualifying.

- Live match and group data from the World Cup API
  - The app fetches teams, stadiums, groups, and games from the live data feed.
  - It uses current group standings and results to calculate live form.

So the prediction score mixes:

1. FIFA ranking,
2. qualifying form,
3. live World Cup form from current group-stage stats.

## What to watch today

The daily shortlist ranks unfinished matches scheduled for the viewer's local
calendar day. Its score is intentionally explainable and combines:

1. qualification impact from the app's live group tables,
2. knockout-stage consequences,
3. team strength from the FIFA ranking profiles,
4. known international rivalries,
5. how closely matched the two teams are.

Fixture times, match status, scores, teams, groups, and venues come from the
ESPN World Cup scoreboard feed already normalized by `server/games.js`. The
ranking is recalculated in the browser whenever that tournament data refreshes.
For a production data contract with an SLA, Sportradar's Soccer API or the
World Cup competition in football-data.org can replace the scoreboard adapter
without changing the watch-ranking model.

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
