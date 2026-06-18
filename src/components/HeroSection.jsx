import {
  formatCountDown,
  isMatchInPlay,
} from '../lib/worldCup'
import MatchImplicationsCard from './MatchImplicationsCard'
import RecentResultSection from './RecentResultSection'
import SiteNav from './SiteNav'

function getLiveSpotlightSummary(match, hideSpoilers) {
  if (!match) return null

  if (hideSpoilers) {
    return {
      label: 'Live context',
      value: 'Score hidden',
      detail: 'Open live game stats when you are ready.',
    }
  }

  const homeScore = Number(match.home_score ?? 0) || 0
  const awayScore = Number(match.away_score ?? 0) || 0
  const goalTotal = homeScore + awayScore

  if (homeScore === awayScore) {
    return {
      label: 'Match state',
      value: `Level at ${homeScore}-${awayScore}`,
      detail: `${goalTotal} goal${goalTotal === 1 ? '' : 's'} so far.`,
    }
  }

  const leader =
    homeScore > awayScore ? match.home_team_name_en : match.away_team_name_en
  const margin = Math.abs(homeScore - awayScore)
  const trailer =
    homeScore > awayScore ? match.away_team_name_en : match.home_team_name_en

  return {
    label: 'Match state',
    value: `${leader} ahead by ${margin}`,
    detail:
      margin === 1
        ? `${trailer} chasing the next goal to equalise.`
        : `${trailer} chasing a way back into the match.`,
  }
}

function HeroSection({
  hideSpoilers = false,
  latestCompletedMatch,
  latestCompletedStadium,
  onOpenLatestResult,
  onToggleSpoilers,
  spotlightImplications,
  spotlightMatch,
  spotlightStadium,
  teamMap,
}) {
  const isLive = isMatchInPlay(spotlightMatch)
  const liveSpotlightSummary = isLive
    ? getLiveSpotlightSummary(spotlightMatch, hideSpoilers)
    : null

  return (
    <header className="hero-panel" id="overview">
      <SiteNav activePage="overview" />

      <section className="spoiler-mode-panel" aria-label="Spoiler-free mode">
        <div>
          <strong>Spoiler-free mode</strong>
          <span>Hide live scores and results while you browse fixtures.</span>
        </div>
        <label className="spoiler-mode-toggle">
          <input
            type="checkbox"
            checked={hideSpoilers}
            onChange={(event) => onToggleSpoilers?.(event.target.checked)}
          />
          <span aria-hidden="true" />
          {hideSpoilers ? 'On' : 'Off'}
        </label>
      </section>

      <div className="hero-grid">
        <section className="hero-highlight card">
          <div className="hero-highlight-head">
            <div>
              <p className="eyebrow">
                {isLive ? 'Live spotlight' : 'Next spotlight'}
              </p>
              <div className="hero-title-line">
                <h2>{isLive ? 'Match in play' : 'Up next'}</h2>
                {isLive && (
                  <a className="live-match-cta hero-live-cta" href="#live">
                    <span className="live-dot" />
                    Open live game stats
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="scoreline">
            <div>
              <img
                src={
                  teamMap[spotlightMatch?.home_team_id]?.flag ||
                  spotlightMatch?.home_team_flag
                }
                alt=""
                loading="lazy"
              />
              <span className="truncate-name">
                {spotlightMatch?.home_team_name_en}
              </span>
            </div>
            <strong>
              {isLive && hideSpoilers
                ? 'Hidden'
                : isLive
                  ? `${spotlightMatch?.home_score} – ${spotlightMatch?.away_score}`
                  : 'vs'}
            </strong>
            <div>
              <img
                src={
                  teamMap[spotlightMatch?.away_team_id]?.flag ||
                  spotlightMatch?.away_team_flag
                }
                alt=""
                loading="lazy"
              />
              <span className="truncate-name">
                {spotlightMatch?.away_team_name_en}
              </span>
            </div>
          </div>

          {!isLive && (
            <p className="hero-timer">
              {formatCountDown(spotlightMatch?.date)}
            </p>
          )}

          <div className="hero-foot">
            <div
              className={`hero-live-stack${isLive ? '' : ' is-upcoming'}`}
            >
              {liveSpotlightSummary && (
                <div className="hero-live-context">
                  <span>{liveSpotlightSummary.label}</span>
                  <strong>{liveSpotlightSummary.value}</strong>
                  <small>{liveSpotlightSummary.detail}</small>
                </div>
              )}
              <p className="hero-meta">
                Group {spotlightMatch?.group} · Group matchday{' '}
                {spotlightMatch?.matchday} ·{' '}
                {spotlightStadium?.fifa_name ||
                  spotlightStadium?.name_en ||
                  spotlightMatch?.stadium_name}
              </p>
            </div>
            <MatchImplicationsCard compact implications={spotlightImplications} />
          </div>
        </section>

        <RecentResultSection
          compact
          match={latestCompletedMatch}
          hideSpoilers={hideSpoilers}
          onOpenResult={onOpenLatestResult}
          stadium={latestCompletedStadium}
          teamMap={teamMap}
        />
      </div>
    </header>
  )
}

export default HeroSection
