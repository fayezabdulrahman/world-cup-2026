import {
  formatCountDown,
  isMatchInPlay,
} from '../lib/worldCup'
import MatchImplicationsCard from './MatchImplicationsCard'
import RecentResultSection from './RecentResultSection'
import SiteNav from './SiteNav'

function HeroSection({
  hideSpoilers = false,
  latestCompletedMatch,
  latestCompletedStadium,
  onOpenLatestResult,
  spotlightImplications,
  spotlightMatch,
  spotlightStadium,
  teamMap,
}) {
  const isLive = isMatchInPlay(spotlightMatch)

  return (
    <header className="hero-panel" id="overview">
      <SiteNav activePage="overview" />

      <div className="hero-grid">
        <section className="hero-highlight card">
          <div className="hero-highlight-head">
            <div>
              <p className="eyebrow">
                {isLive ? 'Live spotlight' : 'Next spotlight'}
              </p>
              <h2>{isLive ? 'Match in play' : 'Up next'}</h2>
            </div>
            {isLive && <span className="status-pill live">Live</span>}
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

          {isLive ? (
            <a className="live-match-cta hero-live-cta" href="#live">
              <span className="live-dot" />
              Open live game stats
            </a>
          ) : (
            <p className="hero-timer">
              {formatCountDown(spotlightMatch?.date)}
            </p>
          )}

          <div className="hero-foot">
            <p className="hero-meta">
              Group {spotlightMatch?.group} · Group matchday{' '}
              {spotlightMatch?.matchday} ·{' '}
              {spotlightStadium?.fifa_name ||
                spotlightStadium?.name_en ||
                spotlightMatch?.stadium_name}
            </p>
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
