import { POSITION_LABELS } from '../lib/worldCup'

function TeamSnapshotCard({
  averageAge,
  averageHeight,
  clubsRepresented,
  confirmedPlayers,
  confirmedSquad,
  fifaSourceUrl,
  positionCounts,
}) {
  return (
    <article className="card confirmed-card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Team snapshot</p>
          <h2>Team Stats.</h2>
        </div>
        <a
          className="source-link"
          href={fifaSourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          FIFA source
        </a>
      </div>

      {confirmedSquad ? (
        <>
          <div className="facts-grid">
            <article className="fact-tile">
              <span>Coach</span>
              <strong>{confirmedSquad.coach}</strong>
            </article>
            <article className="fact-tile">
              <span>Squad size</span>
              <strong>{confirmedPlayers.length}</strong>
            </article>
            <article className="fact-tile">
              <span>Average age</span>
              <strong>{averageAge}</strong>
            </article>
            <article className="fact-tile">
              <span>Average height</span>
              <strong>{averageHeight} cm</strong>
            </article>
            <article className="fact-tile">
              <span>Clubs represented</span>
              <strong>{clubsRepresented}</strong>
            </article>
            <article className="fact-tile">
              <span>Official source</span>
              <strong>FIFA confirmed list</strong>
            </article>
          </div>

          <div className="position-pill-grid">
            {Object.entries(positionCounts).map(([position, count]) => (
              <article key={position} className="position-pill">
                <span>{POSITION_LABELS[position]}</span>
                <strong>{count}</strong>
              </article>
            ))}
          </div>
        </>
      ) : (
        <p className="roster-note">
          Squad insights will appear here when an official FIFA squad match is
          available.
        </p>
      )}
    </article>
  )
}

export default TeamSnapshotCard
