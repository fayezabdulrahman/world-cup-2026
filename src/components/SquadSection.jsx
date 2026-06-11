import {
  getFormationRoleLabel,
  getPlayerDisplayName,
  getPlayerFullName,
  normalizePosition,
} from '../lib/worldCup'

function SquadSection({
  confirmedSquad,
  dashboardTeams,
  onSelectTeam,
  selectedTeam,
  squadShape,
  teamFormation,
}) {
  return (
    <article className="card squad-card" id="squad">
      <div className="section-head">
        <div>
          <p className="eyebrow">Confirmed squad</p>
          <h2>Official FIFA squad list with a projected XI view.</h2>
        </div>
        <select
          value={selectedTeam?.id || ''}
          onChange={(event) => onSelectTeam(event.target.value)}
        >
          {dashboardTeams
            .slice()
            .sort((left, right) => left.name_en.localeCompare(right.name_en))
            .map((team) => (
              <option key={team.id} value={team.id}>
                {team.name_en}
              </option>
            ))}
        </select>
      </div>

      <div className="squad-overview">
        <div className="team-badge">
          <img src={selectedTeam?.flag} alt="" />
          <div>
            <strong>{selectedTeam?.name_en}</strong>
            <span>
              Group {selectedTeam?.groups} · {selectedTeam?.fifa_code}
            </span>
          </div>
        </div>

        <div className="formation-chip">
          <span>Projected formation</span>
          <strong>{teamFormation}</strong>
        </div>
      </div>

      {confirmedSquad ? (
        <>
          <p className="roster-note">
            Projected from FIFA’s confirmed 26-player squad. For the official match
            selection, open the Live Match lineups tab.
          </p>

          <div className="pitch">
            <div className="pitch-lines" />
            <div className="pitch-stack">
              {squadShape.goalkeeper && (
                <div className="formation-row goalkeeper-row">
                  <article key={squadShape.goalkeeper.number} className="player-node">
                    <span>
                      #{squadShape.goalkeeper.number} ·{' '}
                      {normalizePosition(squadShape.goalkeeper.position)}
                    </span>
                    <strong>{getPlayerDisplayName(squadShape.goalkeeper)}</strong>
                    <small>{squadShape.goalkeeper.club}</small>
                  </article>
                </div>
              )}

              {squadShape.lines.map((line, rowIndex) => (
                <div key={`${teamFormation}-${rowIndex}`} className="formation-block">
                  <p className="formation-label">
                    {getFormationRoleLabel(
                      rowIndex,
                      squadShape.rows[rowIndex],
                      squadShape.rows.length,
                    )}
                  </p>
                  <div className="formation-row">
                    {line.map((player) => (
                      <article key={player.number} className="player-node">
                        <span>
                          #{player.number} · {normalizePosition(player.position)}
                        </span>
                        <strong>{getPlayerDisplayName(player)}</strong>
                        <small>{player.club}</small>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="roster-panels">
            <details className="roster-dropdown" open>
              <summary>
                Projected XI
                <b>{squadShape.starters.length} players</b>
              </summary>
              <div className="roster-list">
                {squadShape.starters.map((player) => (
                  <article key={player.number}>
                    <strong>
                      #{player.number} · {getPlayerDisplayName(player)}
                    </strong>
                    <span>{player.club}</span>
                    <small>{getPlayerFullName(player)}</small>
                  </article>
                ))}
              </div>
            </details>

            <details className="roster-dropdown">
              <summary>
                Reserves / Full Squad
                <b>{squadShape.reserves.length} players</b>
              </summary>
              <div className="roster-list">
                {squadShape.reserves.map((player) => (
                  <article key={player.number}>
                    <strong>
                      #{player.number} · {getPlayerDisplayName(player)}
                    </strong>
                    <span>{player.club}</span>
                    <small>{getPlayerFullName(player)}</small>
                  </article>
                ))}
              </div>
            </details>
          </div>
        </>
      ) : (
        <p className="roster-note">
          No confirmed FIFA squad was matched for this team yet.
        </p>
      )}
    </article>
  )
}

export default SquadSection
