import {
  formatCountDown,
  formatViewerTime,
  getViewerTimeZoneLabel,
  isMatchInPlay,
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
  const selectedMatchIsLive = isMatchInPlay(selectedMatch)

  return (
    <article className="card spotlight-card" id="fixtures">
      <div className="section-head">
        <div>
          <p className="eyebrow">Upcoming fixtures</p>
          <h2>Select a fixture to view details.</h2>
        </div>
        <p className="muted">Showing kickoff in your local timezone: {viewerTimeZone}.</p>
      </div>

      <div className="fixture-list">
        {upcomingFixtures.slice(0, 8).map((fixture) => {
          const home = teamMap[fixture.home_team_id]
          const away = teamMap[fixture.away_team_id]
          const isActive = fixture.id === selectedMatch?.id
          const isLive = isMatchInPlay(fixture)

          return (
            <button
              key={fixture.id}
              type="button"
              className={`fixture-chip ${isActive ? 'active' : ''} ${isLive ? 'live' : ''}`}
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
                <strong className="truncate-name">
                  {selectedMatch.home_team_name_en}
                </strong>
              </div>
            </div>
            <div className="match-center">
              <span>
                {selectedMatch.group
                  ? `Group ${selectedMatch.group}`
                  : selectedMatch.type.replaceAll('-', ' ')}
              </span>
              <strong>{formatViewerTime(selectedMatch.date)}</strong>
              <small>Host kickoff {selectedMatch.local_date}</small>
              <small>
                {selectedStadium?.fifa_name ||
                  selectedMatch.stadium_name ||
                  'Stadium TBD'}
                {selectedStadium?.capacity
                  ? ` · ${selectedStadium.capacity.toLocaleString()} seats`
                  : ''}
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
                <strong className="truncate-name">
                  {selectedMatch.away_team_name_en}
                </strong>
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
              <small>
                {selectedMatchIsLive ? 'Currently in play' : 'From now to kickoff'}
              </small>
            </article>
          </div>
        </div>
      )}
    </article>
  )
}

export default FixturesSection
