import { useEffect, useMemo, useState } from 'react'
import SiteNav from './SiteNav'
import {
  formatViewerTime,
  getViewerTimeZoneLabel,
  isMatchInPlay,
} from '../lib/worldCup'

const PREFERENCES_KEY = 'world-cup-2026-my-world-cup-v1'
const MAX_TIMEOUT = 2_147_483_647

function readPreferences() {
  try {
    const preferences = JSON.parse(localStorage.getItem(PREFERENCES_KEY))

    return {
      favoriteTeamIds: Array.isArray(preferences?.favoriteTeamIds)
        ? preferences.favoriteTeamIds.map(String)
        : [],
      notificationsEnabled: Boolean(preferences?.notificationsEnabled),
      notificationLeadMinutes: Number(preferences?.notificationLeadMinutes) || 30,
    }
  } catch {
    return {
      favoriteTeamIds: [],
      notificationsEnabled: false,
      notificationLeadMinutes: 30,
    }
  }
}

function getMatchTitle(match) {
  return `${match.home_team_name_en} vs ${match.away_team_name_en}`
}

function getMatchLocation(match, stadiumMap) {
  const stadium = stadiumMap[String(match.stadium_id)]
  return [
    stadium?.fifa_name || match.stadium_name,
    stadium?.city_en || match.stadium_city,
    stadium?.country_en,
  ]
    .filter(Boolean)
    .join(', ')
}

function formatCalendarDate(date) {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
}

function escapeCalendarText(value = '') {
  return String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;')
}

function createCalendarEvent(match, stadiumMap) {
  const start = match.date
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
  const title = getMatchTitle(match)
  const location = getMatchLocation(match, stadiumMap)

  return [
    'BEGIN:VEVENT',
    `UID:world-cup-2026-${match.id}@my-world-cup`,
    `DTSTAMP:${formatCalendarDate(new Date())}`,
    `DTSTART:${formatCalendarDate(start)}`,
    `DTEND:${formatCalendarDate(end)}`,
    `SUMMARY:${escapeCalendarText(title)}`,
    `DESCRIPTION:${escapeCalendarText(`World Cup 2026${match.group ? ` - Group ${match.group}` : ''}`)}`,
    `LOCATION:${escapeCalendarText(location)}`,
    'END:VEVENT',
  ].join('\r\n')
}

function downloadCalendar(matches, stadiumMap, filename) {
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//World Cup 2026 Dashboard//My World Cup//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...matches.map((match) => createCalendarEvent(match, stadiumMap)),
    'END:VCALENDAR',
  ].join('\r\n')
  const url = URL.createObjectURL(
    new Blob([body], { type: 'text/calendar;charset=utf-8' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function getGoogleCalendarUrl(match, stadiumMap) {
  const end = new Date(match.date.getTime() + 2 * 60 * 60 * 1000)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: getMatchTitle(match),
    dates: `${formatCalendarDate(match.date)}/${formatCalendarDate(end)}`,
    details: `World Cup 2026${match.group ? ` - Group ${match.group}` : ''}`,
    location: getMatchLocation(match, stadiumMap),
  })

  return `https://calendar.google.com/calendar/render?${params}`
}

function MyWorldCupPage({ games, stadiumMap, teams }) {
  const [preferences, setPreferences] = useState(readPreferences)
  const [teamSearch, setTeamSearch] = useState('')
  const [notificationMessage, setNotificationMessage] = useState('')
  const [currentTime, setCurrentTime] = useState(() => Date.now())
  const favoriteTeamIds = preferences.favoriteTeamIds
  const favoriteIdSet = useMemo(
    () => new Set(favoriteTeamIds),
    [favoriteTeamIds],
  )
  const teamMap = useMemo(
    () => Object.fromEntries(teams.map((team) => [String(team.id), team])),
    [teams],
  )

  useEffect(() => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
  }, [preferences])

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const favoriteFixtures = useMemo(
    () =>
      games.filter(
        (game) =>
          favoriteIdSet.has(String(game.home_team_id)) ||
          favoriteIdSet.has(String(game.away_team_id)),
      ),
    [favoriteIdSet, games],
  )
  const upcomingFavoriteFixtures = useMemo(
    () =>
      favoriteFixtures.filter(
        (game) =>
          String(game.finished).toLowerCase() !== 'true' &&
          (isMatchInPlay(game) || game.date.getTime() > currentTime),
      ),
    [currentTime, favoriteFixtures],
  )
  const filteredTeams = teams.filter((team) => {
    const query = teamSearch.trim().toLowerCase()
    if (!query) return true

    return [team.name_en, team.fifa_code, team.groups]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  })

  useEffect(() => {
    if (
      !preferences.notificationsEnabled ||
      !('Notification' in window) ||
      Notification.permission !== 'granted'
    ) {
      return undefined
    }

    const timers = upcomingFavoriteFixtures.flatMap((match) => {
      const notificationTime =
        match.date.getTime() -
        preferences.notificationLeadMinutes * 60 * 1000
      const delay = notificationTime - Date.now()

      if (delay <= 0 || delay > MAX_TIMEOUT) return []

      return [
        window.setTimeout(() => {
          const notification = new Notification(getMatchTitle(match), {
            body: `Kickoff in ${preferences.notificationLeadMinutes} minutes at ${getMatchLocation(match, stadiumMap) || 'the confirmed venue'}.`,
            icon:
              teamMap[String(match.home_team_id)]?.flag ||
              match.home_team_flag,
            tag: `world-cup-match-${match.id}`,
          })
          notification.onclick = () => window.focus()
        }, delay),
      ]
    })

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [
    preferences.notificationsEnabled,
    preferences.notificationLeadMinutes,
    stadiumMap,
    teamMap,
    upcomingFavoriteFixtures,
  ])

  const toggleFavorite = (teamId) => {
    const id = String(teamId)
    setPreferences((current) => ({
      ...current,
      favoriteTeamIds: current.favoriteTeamIds.includes(id)
        ? current.favoriteTeamIds.filter((favoriteId) => favoriteId !== id)
        : [...current.favoriteTeamIds, id],
    }))
  }

  const enableNotifications = async () => {
    if (!('Notification' in window)) {
      setNotificationMessage('This browser does not support notifications.')
      return
    }

    const permission = await Notification.requestPermission()
    const enabled = permission === 'granted'
    setPreferences((current) => ({
      ...current,
      notificationsEnabled: enabled,
    }))
    setNotificationMessage(
      enabled
        ? 'Match reminders are active while this site is open.'
        : 'Notifications were not enabled. You can change this in your browser settings.',
    )
  }

  const downloadTeamSchedule = (teamId) => {
    const team = teamMap[String(teamId)]
    const teamMatches = games.filter(
      (game) =>
        String(game.home_team_id) === String(teamId) ||
        String(game.away_team_id) === String(teamId),
    )
    downloadCalendar(
      teamMatches,
      stadiumMap,
      `${team?.fifa_code || 'team'}-world-cup-2026.ics`,
    )
  }

  return (
    <main className="detail-page my-world-cup-page">
      <SiteNav activePage="my-world-cup" />

      <header className="my-world-cup-hero">
        <div>
          <p className="eyebrow">Your tournament, your way</p>
          <h1>My World Cup</h1>
          <p>
            Follow the teams you care about and keep every kickoff in one
            personal feed. Your choices stay on this device.
          </p>
        </div>
        <div className="my-world-cup-summary">
          <span>Following</span>
          <strong>{favoriteTeamIds.length}</strong>
          <small>
            {upcomingFavoriteFixtures.length} upcoming{' '}
            {upcomingFavoriteFixtures.length === 1 ? 'match' : 'matches'}
          </small>
        </div>
      </header>

      <section className="my-world-cup-grid">
        <article className="card favorite-picker-card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Favourite teams</p>
              <h2>Choose your teams</h2>
            </div>
            <input
              aria-label="Search teams"
              onChange={(event) => setTeamSearch(event.target.value)}
              placeholder="Search teams"
              type="search"
              value={teamSearch}
            />
          </div>

          <div className="favorite-team-grid">
            {filteredTeams.map((team) => {
              const isFavorite = favoriteIdSet.has(String(team.id))

              return (
                <button
                  aria-pressed={isFavorite}
                  className={`favorite-team-button ${isFavorite ? 'active' : ''}`}
                  key={team.id}
                  onClick={() => toggleFavorite(team.id)}
                  type="button"
                >
                  <img alt="" src={team.flag} />
                  <span>
                    <strong>{team.name_en}</strong>
                    <small>
                      {team.fifa_code} · Group {team.groups}
                    </small>
                  </span>
                  <b aria-hidden="true">{isFavorite ? 'Following' : '+'}</b>
                </button>
              )
            })}
          </div>
        </article>

        <aside className="my-world-cup-settings">
          <article className="card notification-card">
            <p className="eyebrow">Browser notifications</p>
            <h2>Never miss kickoff</h2>
            <p className="muted">
              Get a reminder for followed teams while this site is open.
            </p>
            <label>
              Remind me
              <select
                onChange={(event) =>
                  setPreferences((current) => ({
                    ...current,
                    notificationLeadMinutes: Number(event.target.value),
                  }))
                }
                value={preferences.notificationLeadMinutes}
              >
                <option value="10">10 minutes before</option>
                <option value="30">30 minutes before</option>
                <option value="60">1 hour before</option>
                <option value="1440">1 day before</option>
              </select>
            </label>
            <button
              className="primary-action"
              onClick={enableNotifications}
              type="button"
            >
              {preferences.notificationsEnabled
                ? 'Notifications enabled'
                : 'Enable notifications'}
            </button>
            {notificationMessage && <small>{notificationMessage}</small>}
          </article>

          <article className="card privacy-card">
            <p className="eyebrow">Private by default</p>
            <h2>No account needed</h2>
            <p>
              Favorites and reminder settings are stored using device Local storage.
            </p>
          </article>
        </aside>
      </section>

      <section className="personal-feed">
        <div className="section-head">
          <div>
            <p className="eyebrow">Personal fixture feed</p>
            <h2>Your upcoming matches</h2>
          </div>
          <p className="muted">
            Kickoffs shown in {getViewerTimeZoneLabel()}.
          </p>
        </div>

        {!favoriteTeamIds.length ? (
          <div className="empty-personal-feed">
            <strong>Pick a team to build your feed.</strong>
            <span>Their confirmed World Cup fixtures will appear here.</span>
          </div>
        ) : !upcomingFavoriteFixtures.length ? (
          <div className="empty-personal-feed">
            <strong>No upcoming fixtures yet.</strong>
            <span>Newly confirmed matches will appear automatically.</span>
          </div>
        ) : (
          <div className="personal-fixture-list">
            {upcomingFavoriteFixtures.map((match) => {
              const home = teamMap[String(match.home_team_id)]
              const away = teamMap[String(match.away_team_id)]

              return (
                <article className="personal-fixture-card" key={match.id}>
                  <div className="personal-fixture-date">
                    <span>
                      {isMatchInPlay(match)
                        ? 'Live now'
                        : formatViewerTime(match.date)}
                    </span>
                    <small>
                      {match.group
                        ? `Group ${match.group}`
                        : match.type?.replaceAll('-', ' ')}
                    </small>
                  </div>
                  <div className="personal-matchup">
                    <div>
                      <img alt="" src={home?.flag || match.home_team_flag} />
                      <strong>{home?.name_en || match.home_team_name_en}</strong>
                    </div>
                    <b>vs</b>
                    <div>
                      <img alt="" src={away?.flag || match.away_team_flag} />
                      <strong>{away?.name_en || match.away_team_name_en}</strong>
                    </div>
                  </div>
                  <p>{getMatchLocation(match, stadiumMap) || 'Venue TBD'}</p>
                  <div className="calendar-actions">
                    <a
                      href={getGoogleCalendarUrl(match, stadiumMap)}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Google Calendar
                    </a>
                    <button
                      onClick={() =>
                        downloadCalendar(
                          [match],
                          stadiumMap,
                          `${home?.fifa_code || 'home'}-${away?.fifa_code || 'away'}.ics`,
                        )
                      }
                      type="button"
                    >
                      Apple / Outlook
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {favoriteTeamIds.length > 0 && (
        <section className="team-calendar-strip">
          <div>
            <p className="eyebrow">Full team schedules</p>
            <h2>Add every confirmed fixture</h2>
          </div>
          <div>
            {favoriteTeamIds.map((teamId) => {
              const team = teamMap[teamId]
              if (!team) return null

              return (
                <button
                  key={teamId}
                  onClick={() => downloadTeamSchedule(teamId)}
                  type="button"
                >
                  <img alt="" src={team.flag} />
                  {team.fifa_code} schedule
                </button>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}

export default MyWorldCupPage
