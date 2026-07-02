import {
  formatCountDown,
  isMatchInPlay,
} from '../lib/worldCup'
import MatchImplicationsCard from './MatchImplicationsCard'
import MatchOdds from './MatchOdds'
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

function formatMatchStage(match) {
  if (!match) return ''

  if (match.type === 'group') {
    return [
      match.group ? `Group ${match.group}` : 'Group stage',
      match.matchday ? `Matchday ${match.matchday}` : '',
    ]
      .filter(Boolean)
      .join(' · ')
  }

  const knockoutLabels = {
    'round-of-32': 'Round of 32',
    'round-of-16': 'Round of 16',
    'quarterfinal': 'Quarter-final',
    'quarter-final': 'Quarter-final',
    semifinal: 'Semi-final',
    'semi-final': 'Semi-final',
    final: 'Final',
    'third-place': 'Third-place play-off',
    knockout: 'Knockout stage',
  }

  return knockoutLabels[match.type] || match.type?.replaceAll('-', ' ') || ''
}

function HeroSection({
  hideSpoilers = false,
  latestCompletedMatch,
  latestCompletedStadium,
  liveMatches = [],
  onOpenLatestResult,
  onSelectLiveMatch,
  onToggleSpoilers,
  selectedLiveMatchId,
  spotlightImplications,
  spotlightMatch,
  spotlightStadium,
  teamMap,
}) {
  const isLive = isMatchInPlay(spotlightMatch)
  const hasSpotlightImplications = Boolean(spotlightImplications?.items?.length)
  const spotlightStage = formatMatchStage(spotlightMatch)
  const spotlightVenue =
    spotlightStadium?.fifa_name ||
    spotlightStadium?.name_en ||
    spotlightMatch?.stadium_name
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
                {isLive
                  ? liveMatches.length > 1
                    ? `${liveMatches.length} live games`
                    : 'Live spotlight'
                  : 'Next spotlight'}
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

          {isLive && liveMatches.length > 1 && (
            <div className="hero-live-switcher" aria-label="Live games">
              {liveMatches.map((fixture) => {
                const isSelected = fixture.id === selectedLiveMatchId

                return (
                  <button
                    key={fixture.id}
                    type="button"
                    className={isSelected ? 'active' : ''}
                    onClick={() => onSelectLiveMatch?.(fixture)}
                    aria-pressed={isSelected}
                  >
                    <span>
                      {teamMap[String(fixture.home_team_id)]?.fifa_code ||
                        fixture.home_team_code}
                    </span>
                    <strong>
                      {hideSpoilers
                        ? 'Hidden'
                        : `${fixture.home_score} – ${fixture.away_score}`}
                    </strong>
                    <span>
                      {teamMap[String(fixture.away_team_id)]?.fifa_code ||
                        fixture.away_team_code}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          <div
            className={`hero-foot${
              !isLive && !hasSpotlightImplications ? ' is-odds-centered' : ''
            }`}
          >
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
              {!isLive && (
                <MatchOdds compact match={spotlightMatch} />
              )}
              <p className="hero-meta">
                {[spotlightStage, spotlightVenue].filter(Boolean).join(' · ')}
              </p>
            </div>
            {hasSpotlightImplications && (
              <MatchImplicationsCard compact implications={spotlightImplications} />
            )}
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
