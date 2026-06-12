import { getPlayerDisplayName, POSITION_LABELS } from '../lib/worldCup'

function TeamSnapshotCard({
  fifaSourceUrl,
  selectedMatch,
  teamSnapshots,
}) {
  return (
    <article className="card confirmed-card fixture-snapshot">
      <div className="section-head">
        <div>
          <p className="eyebrow">Team snapshot</p>
          <h2>
            {selectedMatch
              ? `${selectedMatch.home_team_name_en} vs ${selectedMatch.away_team_name_en}`
              : 'Selected fixture squads'}
          </h2>
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

      {teamSnapshots.some(({ confirmedSquad }) => confirmedSquad) ? (
        <div className="fixture-squad-grid">
          {teamSnapshots.map(
            ({
              averageAge,
              averageHeight,
              clubsRepresented,
              confirmedSquad,
              formation,
              positionCounts,
              starters,
              team,
            }) => (
              <section className="snapshot-team" key={team?.id || confirmedSquad?.fifaCode}>
                <header className="snapshot-team-head">
                  <div className="team-badge">
                    <img src={team?.flag} alt="" />
                    <div>
                      <strong>{team?.name_en || confirmedSquad?.teamName}</strong>
                      <span>
                        {confirmedSquad?.coach
                          ? `Coach ${confirmedSquad.coach}`
                          : 'Squad pending'}
                      </span>
                    </div>
                  </div>
                  <span className="formation-chip">
                    <span>Shape</span>
                    <strong>{formation}</strong>
                  </span>
                </header>

                {confirmedSquad ? (
                  <>
                    <div className="team-stat-strip">
                      <article>
                        <span>Avg age</span>
                        <strong>{averageAge}</strong>
                      </article>
                      <article>
                        <span>Avg height</span>
                        <strong>{averageHeight} cm</strong>
                      </article>
                      <article>
                        <span>Clubs</span>
                        <strong>{clubsRepresented}</strong>
                      </article>
                    </div>

                    <div className="position-summary">
                      {Object.entries(positionCounts).map(([position, count]) => (
                        <span key={position}>
                          {POSITION_LABELS[position]} <strong>{count}</strong>
                        </span>
                      ))}
                    </div>

                    <div className="snapshot-lineup">
                      <p>Projected XI</p>
                      <div>
                        {starters.map((player) => (
                          <span key={player.number}>
                            <b>#{player.number}</b> {getPlayerDisplayName(player)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="roster-note">
                    No confirmed FIFA squad was matched for this team yet.
                  </p>
                )}
              </section>
            ),
          )}
        </div>
      ) : (
        <p className="roster-note">
          Select an upcoming fixture to see both team squads and stats here.
        </p>
      )}

      <a className="snapshot-page-link" href="#squads">
        Explore all confirmed squads
      </a>
    </article>
  )
}

export default TeamSnapshotCard
