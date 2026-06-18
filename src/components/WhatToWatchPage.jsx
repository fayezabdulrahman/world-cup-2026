import SiteNav from './SiteNav'
import {
  formatViewerTime,
  getViewerTimeZoneLabel,
  isMatchInPlay,
} from '../lib/worldCup'
import { rankMatchesToWatch } from '../lib/watchRanking'

function ScoreRing({ score }) {
  return (
    <div
      className="watch-score-ring"
      style={{ '--watch-score': `${score * 3.6}deg` }}
      aria-label={`${score} out of 100 watch score`}
    >
      <strong>{score}</strong>
      <small>watch score</small>
    </div>
  )
}

function WhatToWatchPage({
  games,
  groupTableRows,
  onOpenMatch,
  predictionProfiles,
  stadiumMap,
  teamMap,
}) {
  const rankedMatches = rankMatchesToWatch({
    games,
    groupTableRows,
    profiles: predictionProfiles,
    teamMap,
  })
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
  const viewerTimeZone = getViewerTimeZoneLabel()

  return (
    <main className="detail-page watch-page">
      <SiteNav activePage="watch" />

      <header className="watch-hero">
        <div>
          <p className="eyebrow">Your matchday shortlist · {dateLabel}</p>
          <h1>What to watch today</h1>
          <p className="watch-intro">
            Today&apos;s matches ranked by what is at stake—not simply who has
            the biggest name.
          </p>
          <div className="watch-ranking-summary">
            <strong>Ranked by</strong>
            <span>Qualification impact</span>
            <span>Knockout stakes</span>
            <span>Elite teams</span>
            <span>Rivalries and matchup quality</span>
          </div>
        </div>
        <div className="watch-hero-meta">
          <span>{rankedMatches.length}</span>
          <strong>matches today</strong>
          <small>Kickoffs shown in {viewerTimeZone}</small>
        </div>
      </header>

      {rankedMatches.length ? (
        <section className="watch-list" aria-label="Today's ranked matches">
          {rankedMatches.map((match, index) => {
            const stadium = stadiumMap[String(match.stadium_id)]
            const live = isMatchInPlay(match)

            return (
              <article
                className={`watch-match-card ${index === 0 ? 'top-pick' : ''}`}
                key={match.id}
              >
                <div className="watch-rank">
                  <span>#{index + 1}</span>
                  <small>{index === 0 ? 'Top pick' : 'Today'}</small>
                </div>

                <div className="watch-match-main">
                  <div className="watch-kickoff">
                    <span className={live ? 'watch-live' : ''}>
                      {live ? 'Live now' : formatViewerTime(match.date)}
                    </span>
                    <small>
                      {match.type === 'group'
                        ? `Group ${match.group} · Matchday ${match.matchday}`
                        : match.type?.replaceAll('-', ' ')}
                    </small>
                  </div>

                  <div className="watch-teams">
                    <div>
                      <img src={match.home.flag} alt="" />
                      <strong>{match.home.name_en}</strong>
                    </div>
                    <span>vs</span>
                    <div>
                      <img src={match.away.flag} alt="" />
                      <strong>{match.away.name_en}</strong>
                    </div>
                  </div>

                  <div className="watch-reasons">
                    {match.reasons.map((reason) => (
                      <span key={reason}>{reason}</span>
                    ))}
                  </div>
                  <p>
                    {match.stakesDetail ||
                      `${stadium?.name_en || match.stadium_name} hosts a knockout match where the loser goes home.`}
                  </p>
                  <small className="watch-venue">
                    {stadium?.name_en || match.stadium_name}
                    {(stadium?.city_en || match.stadium_city) &&
                      ` · ${stadium?.city_en || match.stadium_city}`}
                  </small>
                </div>

                <div className="watch-card-action">
                  <ScoreRing score={match.watchScore} />
                  <button type="button" onClick={() => onOpenMatch(match)}>
                    Open match centre
                  </button>
                </div>
              </article>
            )
          })}
        </section>
      ) : (
        <section className="card watch-empty">
          <p className="eyebrow">Rest day</p>
          <h2>No World Cup matches are scheduled today.</h2>
          <p>The shortlist will refresh automatically on the next matchday.</p>
        </section>
      )}

    </main>
  )
}

export default WhatToWatchPage
