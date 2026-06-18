import { useEffect, useState } from 'react'
import {
  fetchOddsDay,
  findFixtureOdds,
  formatFractionalOdds,
} from '../lib/odds'

function getLiveSnapshotPhase(minute) {
  const liveMinute = Number(minute)

  if (!Number.isFinite(liveMinute) || liveMinute < 45) return 'kickoff'
  if (liveMinute < 70) return 'halftime'
  return '70'
}

function getSnapshotLabel(phase) {
  if (phase === 'kickoff') return 'Kickoff snapshot'
  if (phase === 'halftime') return 'Halftime snapshot'
  if (phase === '70') return 'Updated around 70′'
  return 'Pre-match snapshot'
}

function MatchOdds({
  compact = false,
  isLive = false,
  liveMinute,
  match,
}) {
  const [feed, setFeed] = useState({
    matchId: null,
    odds: null,
    state: 'loading',
  })
  const matchId = match?.id
  const homeName = match?.home_team_name_en
  const awayName = match?.away_team_name_en
  const commenceTime = match?.date?.toISOString()
  const snapshotPhase = isLive
    ? getLiveSnapshotPhase(liveMinute)
    : 'prematch'

  useEffect(() => {
    if (!matchId || !homeName || !awayName) return undefined

    let active = true

    async function loadOdds() {
      try {
        const query = new URLSearchParams({
          away: awayName,
          commenceTime: commenceTime || '',
          home: homeName,
          live: String(isLive),
          phase: snapshotPhase,
        })
        const payload = isLive
          ? await fetch(`/api/odds/match?${query}`).then((response) => {
              if (!response.ok) throw new Error('Odds request failed')
              return response.json()
            })
          : await fetchOddsDay(new Date(commenceTime))
        if (!active) return
        const nextOdds = isLive
          ? payload.odds
          : findFixtureOdds(payload.events, {
              away_team_name_en: awayName,
              home_team_name_en: homeName,
            })

        setFeed({
          matchId,
          odds: nextOdds,
          state:
            payload.configured === false
              ? 'unconfigured'
              : nextOdds
                ? 'ready'
                : 'unavailable',
        })
      } catch {
        if (active) {
          setFeed({ matchId, odds: null, state: 'unavailable' })
        }
      }
    }

    loadOdds()

    return () => {
      active = false
    }
  }, [
    awayName,
    commenceTime,
    homeName,
    isLive,
    matchId,
    snapshotPhase,
  ])

  const isCurrentMatch = feed.matchId === matchId
  const odds = isCurrentMatch ? feed.odds : null
  const feedState = isCurrentMatch ? feed.state : 'loading'

  if (feedState === 'unconfigured') return null

  return (
    <section
      className={`match-odds${compact ? ' compact' : ''}`}
      aria-label={isLive ? 'Live betting odds' : 'Pre-match betting odds'}
    >
      <div className="match-odds-head">
        <span>{isLive ? 'Live odds' : 'Match odds'}</span>
        <strong>{odds?.bookmaker || 'Paddy Power'}</strong>
      </div>

      {odds ? (
        <div className="match-odds-grid">
          <article>
            <span>{homeName}</span>
            <strong>{formatFractionalOdds(odds.outcomes.home)}</strong>
          </article>
          <article>
            <span>Draw</span>
            <strong>{formatFractionalOdds(odds.outcomes.draw)}</strong>
          </article>
          <article>
            <span>{awayName}</span>
            <strong>{formatFractionalOdds(odds.outcomes.away)}</strong>
          </article>
        </div>
      ) : (
        <p className="match-odds-message">
          {feedState === 'loading'
            ? 'Checking the latest market…'
            : 'Odds are not currently listed for this match.'}
        </p>
      )}

      <small>
        Fractional odds · {getSnapshotLabel(snapshotPhase)} · 18+ · Odds can
        change
      </small>
    </section>
  )
}

export default MatchOdds
