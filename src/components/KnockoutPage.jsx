import SiteNav from './SiteNav'

function signedNumber(value) {
  return value > 0 ? `+${value}` : String(value)
}

function TeamSlot({ entry, winner }) {
  if (!entry?.team) {
    return <div className="bracket-team bracket-team-empty">To be decided</div>
  }

  return (
    <div className={`bracket-team ${winner ? 'projected-winner' : ''}`}>
      <img src={entry.team.flag} alt="" />
      <div>
        <strong>{entry.team.name_en}</strong>
        <span>
          {entry.team.fifa_code} · {entry.pts} pts · {signedNumber(entry.gd)} GD
        </span>
      </div>
      <small>{entry.group}</small>
    </div>
  )
}

function BracketMatch({ match, isFinal }) {
  return (
    <article className={`bracket-match ${isFinal ? 'bracket-final' : ''}`}>
      <TeamSlot
        entry={match.teams[0]}
        winner={match.winner?.team_id === match.teams[0]?.team_id}
      />
      <TeamSlot
        entry={match.teams[1]}
        winner={match.winner?.team_id === match.teams[1]?.team_id}
      />
    </article>
  )
}

function KnockoutPage({ projection, completedGroupMatches }) {
  const { champion, rounds, thirdPlaceQualifiers } = projection

  return (
    <main className="detail-page knockout-page">
      <SiteNav activePage="knockout" />

      <header className="knockout-hero">
        <div>
          <a className="back-link" href="#overview">
            Back to overview
          </a>
          <p className="eyebrow">Live tournament projection</p>
          <h1>Road to the Final</h1>
          <p className="knockout-intro">
            A projected Round of 32 built from group points, goal difference,
            goals scored, and the dashboard&apos;s strength model.
          </p>
        </div>

        <aside className="champion-callout">
          <span>Projected champion</span>
          {champion?.team && (
            <div>
              <img src={champion.team.flag} alt="" />
              <strong>{champion.team.name_en}</strong>
              <small>{champion.team.fifa_code}</small>
            </div>
          )}
        </aside>
      </header>

      <section className="projection-strip" aria-label="Projection summary">
        <article>
          <span>Group matches counted</span>
          <strong>{completedGroupMatches}</strong>
        </article>
        <article>
          <span>Projected qualifiers</span>
          <strong>32</strong>
        </article>
        <article>
          <span>Best third-place spots</span>
          <strong>{thirdPlaceQualifiers.length} / 8</strong>
        </article>
        <p>
          Later-round winners are projected by current model strength. Matchups
          are seeded for this forecast and will update as group results change.
        </p>
      </section>

      <section className="bracket-shell">
        <div className="bracket-toolbar">
          <div>
            <p className="eyebrow">Knockout map</p>
            <h2>Projected bracket</h2>
          </div>
          <div className="bracket-legend">
            <span>
              <i className="legend-dot qualified" /> Projected winner
            </span>
            <span>
              <i className="legend-dot third" /> Group shown at right
            </span>
          </div>
        </div>

        <div className="bracket-scroll">
          <div className="bracket-grid">
            {rounds.map((round, roundIndex) => (
              <section
                className="bracket-round"
                key={round.name}
                style={{ '--match-count': round.matches.length }}
              >
                <header>
                  <span>0{roundIndex + 1}</span>
                  <strong>{round.name}</strong>
                </header>
                <div className="bracket-round-matches">
                  {round.matches.map((match) => (
                    <BracketMatch
                      isFinal={roundIndex === rounds.length - 1}
                      key={match.id}
                      match={match}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

export default KnockoutPage
