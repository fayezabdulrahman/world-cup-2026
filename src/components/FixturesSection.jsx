import {
  formatCountDown,
  formatViewerTime,
  getViewerTimeZoneLabel,
} from '../lib/worldCup'

function FixturesSection({
  upcomingFixtures,
  selectedMatch,
  selectedStadium,
  stadiumMap,
  teamMap,
  onSelectMatch,
}) {
  const viewerTimeZone = getViewerTimeZoneLabel()

  return (
    <article className="card spotlight-card" id="fixtures">
      <div className="section-head">
        <div>
          <p className="eyebrow">Upcoming fixtures</p>
          <h2>Choose a fixture and jump straight into the details.</h2>
        </div>
        <p className="muted">Showing kickoff in your local timezone: {viewerTimeZone}.</p>
      </div>

      <a className="live-match-cta" href="#live">
        <span className="live-dot" />
        Open live match centre
      </a>

      <div className="fixture-list">
        {upcomingFixtures.slice(0, 8).map((fixture) => {
          const home = teamMap[fixture.home_team_id]
          const away = teamMap[fixture.away_team_id]
          const isActive = fixture.id === selectedMatch?.id

          return (
            <button
              key={fixture.id}
              type="button"
              className={`fixture-chip ${isActive ? 'active' : ''}`}
              onClick={() => onSelectMatch(fixture)}
            >
              <span className="fixture-topline">
                <strong>
                  {home?.fifa_code || fixture.home_team_code} vs{' '}
                  {away?.fifa_code || fixture.away_team_code}
                </strong>
                <span>Group {fixture.group}</span>
              </span>
              <span>{formatViewerTime(fixture.date)}</span>
              <span className="muted">
                {stadiumMap[fixture.stadium_id]?.city_en || fixture.stadium_city}
              </span>
            </button>
          )
        })}
      </div>

      {selectedMatch && (
        <div className="match-focus">
          <div className="match-glance">
            <div className="match-team">
              <img
                src={
                  teamMap[selectedMatch.home_team_id]?.flag ||
                  selectedMatch.home_team_flag
                }
                alt=""
              />
              <div>
                <span>Home</span>
                <strong>{selectedMatch.home_team_name_en}</strong>
              </div>
            </div>
            <div className="match-center">
              <span>{selectedMatch.type.toUpperCase()}</span>
              <strong>{formatViewerTime(selectedMatch.date)}</strong>
              <small>
                Local kickoff shown in {viewerTimeZone} · host time {selectedMatch.local_date}
              </small>
            </div>
            <div className="match-team">
              <img
                src={
                  teamMap[selectedMatch.away_team_id]?.flag ||
                  selectedMatch.away_team_flag
                }
                alt=""
              />
              <div>
                <span>Away</span>
                <strong>{selectedMatch.away_team_name_en}</strong>
              </div>
            </div>
          </div>

          <div className="detail-grid">
            <article>
              <span>Stadium</span>
              <strong>
                {selectedStadium?.fifa_name || selectedMatch.stadium_name || 'TBD'}
              </strong>
              <small>
                {selectedStadium?.city_en}, {selectedStadium?.country_en}
              </small>
            </article>
            <article>
              <span>Capacity</span>
              <strong>
                {selectedStadium?.capacity
                  ? selectedStadium.capacity.toLocaleString()
                  : 'TBD'}
              </strong>
              <small>{selectedStadium?.region || 'Host region'}</small>
            </article>
            <article>
              <span>Countdown</span>
              <strong>{formatCountDown(selectedMatch.date)}</strong>
              <small>From now to kickoff</small>
            </article>
          </div>
        </div>
      )}
    </article>
  )
}

export default FixturesSection
