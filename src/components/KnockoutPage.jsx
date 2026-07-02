import SiteNav from './SiteNav'

function signedNumber(value) {
  return value > 0 ? `+${value}` : String(value)
}

function formatRoundLabel(name) {
  return name.replace('Quarter-finals', 'QF').replace('Semi-finals', 'SF')
}

function TeamSlot({ entry, status }) {
  if (!entry?.team) {
    return (
      <div className="bracket-team bracket-team-empty">
        <div>
          <strong>To be decided</strong>
          <span>Awaiting group results</span>
        </div>
      </div>
    )
  }

  const detail =
    entry.pts === undefined
      ? entry.qualification
      : `${entry.qualification} · ${entry.pts} pts · ${signedNumber(entry.gd)} GD`

  return (
    <div
      className={`bracket-team ${entry.qualification === 'Best third-place' ? 'third-place-slot' : ''} ${
        entry.winner ? 'projected-winner' : ''
      }`}
    >
      {entry.team.flag ? (
        <img src={entry.team.flag} alt="" />
      ) : (
        <span className="bracket-team-flag">{entry.team.fifa_code || ''}</span>
      )}
      <div>
        <strong>{entry.team.name_en}</strong>
        <span>{detail}</span>
      </div>
      <small>{status}</small>
    </div>
  )
}

function KnockoutMatch({ match }) {
  return (
    <article className="bracket-match live-bracket-match">
      <header>
        {match.matchLabel || (match.matchNumber ? `Match ${match.matchNumber}` : 'Match')}
      </header>
      <TeamSlot entry={match.teams[0]} status={match.teams[0]?.group || ''} />
      <TeamSlot entry={match.teams[1]} status={match.teams[1]?.group || ''} />
    </article>
  )
}

function KnockoutRound({ round, roundIndex }) {
  return (
    <section
      className="bracket-round"
      style={{ '--match-count': round.matches.length || 1 }}
    >
      <header>
        <span>0{roundIndex + 1}</span>
        <strong>{round.name}</strong>
      </header>
      <div className="bracket-round-matches">
        {round.matches.map((match) => (
          <KnockoutMatch
            key={match.id}
            match={match}
          />
        ))}
      </div>
    </section>
  )
}

function KnockoutPage({ projection, completedGroupMatches }) {
  const { confirmedQualifiers, confirmedRounds } = projection
  const confirmedThirdPlaceQualifiers = confirmedQualifiers.filter(
    (team) => team.qualification === 'Best third-place',
  )
  const liveRounds = confirmedRounds
  const hasGroupResults = completedGroupMatches > 0

  return (
    <main className="detail-page knockout-page">
      <SiteNav activePage="knockout" />

      <header className="knockout-hero">
        <div>
          <p className="eyebrow">Live qualification picture</p>
          <h1>Knockout Map</h1>
          <p className="knockout-intro">
            The live knockout map places teams once their slot is confirmed.
            Open places stay empty until the fixture feed names the team or the
            remaining results can no longer knock that team out.
          </p>
        </div>

        <aside className="qualification-callout">
          <span>{hasGroupResults ? 'Confirmed so far' : 'Before group results'}</span>
          <strong>{confirmedQualifiers.length} of 32</strong>
          <p>
            {hasGroupResults
              ? 'Updates automatically when completed results make qualification or advancement certain.'
              : 'No R32 places are confirmed before the group stage starts.'}
          </p>
        </aside>
      </header>

      <section className="projection-strip" aria-label="Projection summary">
        <article>
          <span>Group matches counted</span>
          <strong>{completedGroupMatches}</strong>
        </article>
        <article>
          <span>Confirmed R32 teams</span>
          <strong>{confirmedQualifiers.length}</strong>
        </article>
        <article>
          <span>Confirmed third-place spots</span>
          <strong>{confirmedThirdPlaceQualifiers.length} / 8</strong>
        </article>
        <p>
          Later rounds stay empty until the real knockout winners are known. No
          AI winner path is shown on this map.
        </p>
      </section>

      <section className="bracket-shell live-knockout-bracket">
        <div className="bracket-toolbar">
          <div>
            <p className="eyebrow">Live knockout map</p>
            <h2>Confirmed teams placed into the bracket</h2>
            <p>
              Round slots fill from the live fixture feed. Finished knockout
              matches promote the official winner as soon as the result lands.
            </p>
          </div>
          <div className="bracket-legend">
            <span>
              <i className="legend-dot qualified" /> Top-two group place
            </span>
            <span>
              <i className="legend-dot third" /> Best third-place slot
            </span>
          </div>
        </div>

        <div className="bracket-desktop" aria-label="Live knockout bracket">
          <div className="bracket-grid">
            {liveRounds.map((round, roundIndex) => (
              <KnockoutRound
                key={round.name}
                round={round}
                roundIndex={roundIndex}
              />
            ))}
          </div>
        </div>

        <div className="bracket-mobile">
          <div className="bracket-round-tabs" role="tablist" aria-label="Knockout round">
            {liveRounds.map((round, roundIndex) => (
              <button
                aria-selected={roundIndex === 0}
                className={roundIndex === 0 ? 'active' : ''}
                disabled={roundIndex !== 0}
                key={round.name}
                role="tab"
                type="button"
              >
                {formatRoundLabel(round.name)}
              </button>
            ))}
          </div>
          <KnockoutRound round={liveRounds[0]} roundIndex={0} />
        </div>
      </section>
    </main>
  )
}

export default KnockoutPage
