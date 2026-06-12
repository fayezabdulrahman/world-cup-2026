import {
  formatCountDown,
  NAV_ITEMS,
} from '../lib/worldCup'
import RecentResultSection from './RecentResultSection'

function HeroSection({
  latestCompletedMatch,
  latestCompletedStadium,
  selectedMatch,
  selectedStadium,
  teamMap,
}) {
  return (
    <header className="hero-panel" id="overview">
      <nav className="site-nav" aria-label="Primary navigation">
        <a className="site-brand" href="#overview">
          <p className="eyebrow">World Cup Dashboard</p>
          <h1>World Cup 2026</h1>
        </a>
        <div className="jump-nav">
          {NAV_ITEMS.map((item) => (
            <a key={item.id} href={`#${item.id}`}>
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="hero-grid">
        <RecentResultSection
          compact
          match={latestCompletedMatch}
          stadium={latestCompletedStadium}
          teamMap={teamMap}
        />

        <section className="hero-highlight card">
          <p className="eyebrow">Next spotlight</p>
          <div className="scoreline">
            <div>
              <img
                src={
                  teamMap[selectedMatch?.home_team_id]?.flag ||
                  selectedMatch?.home_team_flag
                }
                alt=""
                loading="lazy"
              />
              <span>{selectedMatch?.home_team_name_en}</span>
            </div>
            <strong>vs</strong>
            <div>
              <img
                src={
                  teamMap[selectedMatch?.away_team_id]?.flag ||
                  selectedMatch?.away_team_flag
                }
                alt=""
                loading="lazy"
              />
              <span>{selectedMatch?.away_team_name_en}</span>
            </div>
          </div>
          <p className="hero-timer">{formatCountDown(selectedMatch?.date)}</p>
          <p className="hero-meta">
            Group {selectedMatch?.group} · Matchday {selectedMatch?.matchday} ·{' '}
            {selectedStadium?.fifa_name ||
              selectedStadium?.name_en ||
              selectedMatch?.stadium_name}
          </p>
        </section>
      </div>
    </header>
  )
}

export default HeroSection
