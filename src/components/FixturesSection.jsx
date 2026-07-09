import { useEffect, useMemo, useState } from 'react'
import {
  formatUpcomingKickoffLabel,
  formatViewerTime,
  getViewerTimeZoneLabel,
  isMatchInPlay,
} from '../lib/worldCup'
import {
  fetchOddsDay,
  findFixtureOdds,
  formatFractionalOdds,
  getOddsDayUrl,
} from '../lib/odds'

const COMPACT_VIEW_KEY = 'world-cup-2026-compact-matchday-v1'
const PREFERENCES_KEY = 'world-cup-2026-my-world-cup-v1'

function readCompactPreference() {
  try {
    return localStorage.getItem(COMPACT_VIEW_KEY) === 'true'
  } catch {
    return false
  }
}

function readFavoriteTeamIds() {
  try {
    const preferences = JSON.parse(localStorage.getItem(PREFERENCES_KEY))
    return Array.isArray(preferences?.favoriteTeamIds)
      ? preferences.favoriteTeamIds.map(String)
      : []
  } catch {
    return []
  }
}

function isToday(date) {
  const now = new Date()
  return (
    date?.getFullYear() === now.getFullYear() &&
    date?.getMonth() === now.getMonth() &&
    date?.getDate() === now.getDate()
  )
}

function formatCompactKickoff(date) {
  if (!date) return 'TBD'

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function getCompactLiveMeta(fixture) {
  const elapsed = String(fixture.time_elapsed || '').trim().toLowerCase()
  const minutes = Number.parseInt(elapsed, 10)

  return Number.isFinite(minutes) && minutes > 0
    ? `${minutes}' · Live`
    : 'Live now'
}

function OddsPrice({ label, value }) {
  if (value == null) return null

  return (
    <span className="fixture-odds-price">
      {label && <small>{label}</small>}
      <strong>{formatFractionalOdds(value)}</strong>
    </span>
  )
}

function CompactFixtureRow({
  favoriteIdSet,
  fixture,
  hideSpoilers,
  isActive,
  onSelectMatch,
  odds,
  teamMap,
}) {
  const home = teamMap[String(fixture.home_team_id)]
  const away = teamMap[String(fixture.away_team_id)]
  const isLive = isMatchInPlay(fixture)
  const isFavorite =
    favoriteIdSet.has(String(fixture.home_team_id)) ||
    favoriteIdSet.has(String(fixture.away_team_id))
  const status = isLive && hideSpoilers
    ? 'Hidden'
    : isLive
    ? `${fixture.home_score ?? 0} – ${fixture.away_score ?? 0}`
    : formatCompactKickoff(fixture.date)
  const meta = isLive && hideSpoilers
    ? 'Spoiler-free'
    : isLive
    ? getCompactLiveMeta(fixture)
    : formatUpcomingKickoffLabel(fixture.date)

  return (
    <button
      type="button"
      className={`compact-fixture-row ${isActive ? 'active' : ''} ${isLive ? 'live' : ''} ${isFavorite ? 'favorite' : ''}`}
      onClick={() => onSelectMatch(fixture)}
    >
      <span className="compact-fixture-teams">
        <span>
          <img src={home?.flag || fixture.home_team_flag} alt="" loading="lazy" />
          <strong>{home?.fifa_code || fixture.home_team_code}</strong>
          {!isLive && <OddsPrice value={odds?.outcomes.home} />}
        </span>
        <span>
          <img src={away?.flag || fixture.away_team_flag} alt="" loading="lazy" />
          <strong>{away?.fifa_code || fixture.away_team_code}</strong>
          {!isLive && <OddsPrice value={odds?.outcomes.away} />}
        </span>
      </span>
      <span className="compact-fixture-context">
        <strong>
          {fixture.group ? `Group ${fixture.group}` : fixture.type?.replaceAll('-', ' ')}
        </strong>
        <small>Matchday {fixture.matchday || 'TBD'}</small>
        {!isLive && odds && (
          <span className="compact-draw-odds">
            Draw <strong>{formatFractionalOdds(odds.outcomes.draw)}</strong>
          </span>
        )}
      </span>
      <span className="compact-fixture-status">
        <strong>{status}</strong>
        <small>{meta}</small>
      </span>
      {isFavorite && (
        <span className="compact-favorite-mark" aria-label="Favourite team match">
          ★
        </span>
      )}
    </button>
  )
}

function FixturesSection({
  hideSpoilers = false,
  upcomingFixtures,
  selectedMatch,
  selectedStadium,
  stadiumMap,
  teamMap,
  onSelectMatch,
}) {
  const [isCompact, setIsCompact] = useState(readCompactPreference)
  const [favoriteTeamIds, setFavoriteTeamIds] = useState(readFavoriteTeamIds)
  const [todayOddsEvents, setTodayOddsEvents] = useState([])
  const viewerTimeZone = getViewerTimeZoneLabel()
  const selectedMatchIsLive = isMatchInPlay(selectedMatch)
  const favoriteIdSet = useMemo(
    () => new Set(favoriteTeamIds),
    [favoriteTeamIds],
  )
  const todayFixtures = useMemo(
    () => upcomingFixtures.filter((fixture) => isToday(fixture.date)),
    [upcomingFixtures],
  )
  const laterFixtures = useMemo(
    () =>
      upcomingFixtures
        .filter((fixture) => !isToday(fixture.date))
        .slice(0, 6),
    [upcomingFixtures],
  )
  const todayOddsUrl = getOddsDayUrl(todayFixtures[0]?.date)
  const selectedMatchOdds =
    selectedMatch &&
    isToday(selectedMatch.date) &&
    !selectedMatchIsLive
      ? findFixtureOdds(todayOddsEvents, selectedMatch)
      : null

  useEffect(() => {
    localStorage.setItem(COMPACT_VIEW_KEY, String(isCompact))
  }, [isCompact])

  useEffect(() => {
    const refreshFavorites = () => setFavoriteTeamIds(readFavoriteTeamIds())
    window.addEventListener('focus', refreshFavorites)
    window.addEventListener('storage', refreshFavorites)

    return () => {
      window.removeEventListener('focus', refreshFavorites)
      window.removeEventListener('storage', refreshFavorites)
    }
  }, [])

  useEffect(() => {
    if (!todayFixtures.length) return undefined

    let active = true

    async function loadTodayOdds() {
      try {
        const payload = await fetchOddsDay(todayFixtures[0].date)
        if (active) setTodayOddsEvents(payload.events || [])
      } catch {
        // Odds are optional; fixtures remain fully usable without them.
      }
    }

    loadTodayOdds()
    return () => {
      active = false
    }
  }, [todayFixtures, todayOddsUrl])

  return (
    <article
      className={`card spotlight-card ${isCompact ? 'compact-matchday' : ''}`}
      id="fixtures"
    >
      <div className="section-head">
        <div>
          <p className="eyebrow">
            {isCompact ? 'Compact matchday' : 'Upcoming fixtures'}
          </p>
          <h2>
            {isCompact ? 'Scan the day at a glance.' : 'Select a fixture to view details.'}
          </h2>
        </div>
        <div className="fixture-view-controls">
          <p className="muted">Kickoff times: {viewerTimeZone}</p>
          <label className="compact-view-toggle">
            <input
              type="checkbox"
              checked={isCompact}
              onChange={(event) => setIsCompact(event.target.checked)}
            />
            <span aria-hidden="true" />
            Compact
          </label>
        </div>
      </div>

      {isCompact ? (
        <div className="compact-matchday-board">
          <section className="compact-fixture-group">
            <div className="compact-fixture-heading">
              <div>
                <span className="live-dot" />
                <strong>Today&apos;s matches</strong>
              </div>
              <span>{todayFixtures.length}</span>
            </div>
            {todayFixtures.length ? (
              <div className="compact-fixture-list">
                {todayFixtures.map((fixture) => (
                  <CompactFixtureRow
                    key={fixture.id}
                    favoriteIdSet={favoriteIdSet}
                    fixture={fixture}
                    hideSpoilers={hideSpoilers}
                    isActive={fixture.id === selectedMatch?.id}
                    onSelectMatch={onSelectMatch}
                    odds={findFixtureOdds(todayOddsEvents, fixture)}
                    teamMap={teamMap}
                  />
                ))}
              </div>
            ) : (
              <p className="compact-empty">No more matches scheduled today.</p>
            )}
          </section>

          {laterFixtures.length > 0 && (
            <section className="compact-fixture-group">
              <div className="compact-fixture-heading">
                <strong>Up next</strong>
                <span>{formatUpcomingKickoffLabel(laterFixtures[0].date)}</span>
              </div>
              <div className="compact-fixture-list">
                {laterFixtures.map((fixture) => (
                  <CompactFixtureRow
                    key={fixture.id}
                    favoriteIdSet={favoriteIdSet}
                    fixture={fixture}
                    hideSpoilers={hideSpoilers}
                    isActive={fixture.id === selectedMatch?.id}
                    onSelectMatch={onSelectMatch}
                    teamMap={teamMap}
                  />
                ))}
              </div>
            </section>
          )}

          {!favoriteTeamIds.length && (
            <p className="compact-favorite-hint">
              Pick teams in My World Cup to highlight their matches here.
            </p>
          )}
        </div>
      ) : (
        <>
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
                    {selectedMatchOdds && (
                      <OddsPrice
                        value={selectedMatchOdds.outcomes.home}
                      />
                    )}
                  </div>
                </div>
                <div className="match-center">
                  <span>
                    {selectedMatch.group
                      ? `Group ${selectedMatch.group}`
                      : selectedMatch.type.replaceAll('-', ' ')}
                  </span>
                  {selectedMatchOdds && (
                    <span className="match-focus-draw-odds">
                      Draw{' '}
                      <strong>
                        {formatFractionalOdds(selectedMatchOdds.outcomes.draw)}
                      </strong>
                    </span>
                  )}
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
                    {selectedMatchOdds && (
                      <OddsPrice
                        value={selectedMatchOdds.outcomes.away}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="detail-grid">
                <article>
                  <span>Stadium</span>
                  <strong>
                    {selectedStadium?.fifa_name ||
                      selectedMatch.stadium_name ||
                      'TBD'}
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
                  <span>{isToday(selectedMatch.date) ? 'Countdown' : 'Kickoff date'}</span>
                  <strong>{formatUpcomingKickoffLabel(selectedMatch.date)}</strong>
                  <small>
                    {selectedMatchIsLive
                      ? 'Currently in play'
                      : isToday(selectedMatch.date)
                        ? 'From now to kickoff'
                        : 'Local fixture date'}
                  </small>
                </article>
              </div>
            </div>
          )}
        </>
      )}
    </article>
  )
}

export default FixturesSection
