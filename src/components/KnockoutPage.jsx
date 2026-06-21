import SiteNav from './SiteNav'

function signedNumber(value) {
  return value > 0 ? `+${value}` : String(value)
}

function QualifierRow({ entry, position, status }) {
  return (
    <div className="qualifier-row">
      <span className="qualifier-position">{position}</span>
      <img src={entry.team.flag} alt="" />
      <div>
        <strong>{entry.team.name_en}</strong>
        <span>
          {entry.pts} pts · {signedNumber(entry.gd)} GD · {entry.gf} GF
        </span>
      </div>
      <small>{status}</small>
    </div>
  )
}

function KnockoutPage({ projection, completedGroupMatches }) {
  const { groupQualifiers, thirdPlaceTable, thirdPlaceQualifiers } = projection
  const hasGroupResults = completedGroupMatches > 0

  return (
    <main className="detail-page knockout-page">
      <SiteNav activePage="knockout" />

      <header className="knockout-hero">
        <div>
          <p className="eyebrow">Live qualification picture</p>
          <h1>Round of 32</h1>
          <p className="knockout-intro">
            The 32 teams currently in qualifying positions: the top two in each
            group plus the eight best third-placed teams.
          </p>
        </div>

        <aside className="qualification-callout">
          <span>{hasGroupResults ? 'Live table snapshot' : 'Before group results'}</span>
          <strong>{thirdPlaceQualifiers.length} of 8</strong>
          <p>
            {hasGroupResults
              ? 'Updates automatically as completed group results change the tables.'
              : 'FIFA ranking separates teams while every group is still level.'}
          </p>
        </aside>
      </header>

      <section className="projection-strip" aria-label="Projection summary">
        <article>
          <span>Group matches counted</span>
          <strong>{completedGroupMatches}</strong>
        </article>
        <article>
          <span>Teams in R32 places</span>
          <strong>32</strong>
        </article>
        <article>
          <span>Third-place spots</span>
          <strong>{thirdPlaceQualifiers.length} / 8</strong>
        </article>
        <p>
          This page does not predict knockout winners. The modelled route to the
          Final now lives on the AI Prediction page.
        </p>
      </section>

      <section className="qualification-board">
        <div className="qualification-board-head">
          <div>
            <p className="eyebrow">Automatic places</p>
            <h2>Top two from every group</h2>
          </div>
          <span>24 teams</span>
        </div>

        <div className="qualification-group-grid">
          {groupQualifiers.map((group) => (
            <article className="qualification-group" key={group.name}>
              <header>
                <strong>Group {group.name}</strong>
                <span>Top two</span>
              </header>
              {group.teams.map((entry, index) => (
                <QualifierRow
                  entry={entry}
                  key={entry.team_id}
                  position={index + 1}
                  status={index === 0 ? 'Winner' : 'Runner-up'}
                />
              ))}
            </article>
          ))}
        </div>
      </section>

      <section className="qualification-board third-place-board">
        <div className="qualification-board-head">
          <div>
            <p className="eyebrow">Across all 12 groups</p>
            <h2>Best third-placed teams</h2>
          </div>
          <span>Top 8 advance</span>
        </div>

        <div className="third-place-table">
          {thirdPlaceTable.map((entry, index) => (
            <div
              className={`third-place-row ${index < 8 ? 'advancing' : ''}`}
              key={entry.team_id}
            >
              <span className="qualifier-position">{index + 1}</span>
              <img src={entry.team.flag} alt="" />
              <div>
                <strong>{entry.team.name_en}</strong>
                <small>Group {entry.group}</small>
              </div>
              <span>{entry.pts} pts</span>
              <span>{signedNumber(entry.gd)} GD</span>
              <b>{index < 8 ? 'R32' : 'Outside'}</b>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

export default KnockoutPage
