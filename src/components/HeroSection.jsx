import {
  formatCountDown,
  formatViewerTime,
  getViewerTimeZoneLabel,
  NAV_ITEMS,
} from '../lib/worldCup'

function HeroSection({
  openingMatch,
  hostCities,
  selectedMatch,
  selectedStadium,
  teamMap,
  teamCount,
}) {
  const viewerTimeZone = getViewerTimeZoneLabel()

  return (
    <header className="hero-panel" id="overview">
      <div className="topbar">
        <div>
          <p className="eyebrow">World Cup Dashboard</p>
          <h1>World Cup 2026</h1>
        </div>
        <nav className="jump-nav" aria-label="Section navigation">
          {NAV_ITEMS.map((item) => (
            <a key={item.id} href={`#${item.id}`}>
              {item.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="hero-grid">
        <section className="hero-copy card">
          <p className="feature-tag">Live API-fed dashboard</p>
          <p className="lead">
            Track fixtures, kickoff times, squads, stadiums, and a live knockout
            prediction engine powered by group-stage performance.
          </p>
          <div className="hero-metrics">
            <article>
              <span>Opening match</span>
              <strong>{formatViewerTime(openingMatch?.date)}</strong>
              <small>{viewerTimeZone}</small>
            </article>
            <article>
              <span>Qualified nations</span>
              <strong>{teamCount}</strong>
            </article>
            <article>
              <span>Host cities</span>
              <strong>{hostCities}</strong>
            </article>
          </div>
        </section>

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
