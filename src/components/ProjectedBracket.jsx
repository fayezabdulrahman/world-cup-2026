import { useState } from 'react'

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

function BracketRound({ round, roundIndex, finalRoundIndex }) {
  return (
    <section
      className="bracket-round"
      style={{ '--match-count': round.matches.length }}
    >
      <header>
        <span>0{roundIndex + 1}</span>
        <strong>{round.name}</strong>
      </header>
      <div className="bracket-round-matches">
        {round.matches.map((match) => (
          <BracketMatch
            isFinal={roundIndex === finalRoundIndex}
            key={match.id}
            match={match}
          />
        ))}
      </div>
    </section>
  )
}

function ProjectedBracket({ projection }) {
  const [mobileRound, setMobileRound] = useState(0)
  const { rounds } = projection

  return (
    <section className="bracket-shell prediction-bracket">
      <div className="bracket-toolbar">
        <div>
          <p className="eyebrow">AI knockout prediction</p>
          <h2>Projected road to the Final</h2>
          <p>
            The opening field follows the current standings. Later-round winners
            are selected by the same strength model used above.
          </p>
        </div>
        <div className="bracket-legend">
          <span>
            <i className="legend-dot qualified" /> Model winner
          </span>
          <span>
            <i className="legend-dot third" /> Current group
          </span>
        </div>
      </div>

      <div className="bracket-desktop" aria-label="Projected knockout bracket">
        <div className="bracket-grid">
          {rounds.map((round, roundIndex) => (
            <BracketRound
              finalRoundIndex={rounds.length - 1}
              key={round.name}
              round={round}
              roundIndex={roundIndex}
            />
          ))}
        </div>
      </div>

      <div className="bracket-mobile">
        <div className="bracket-round-tabs" role="tablist" aria-label="Knockout round">
          {rounds.map((round, roundIndex) => (
            <button
              aria-selected={mobileRound === roundIndex}
              className={mobileRound === roundIndex ? 'active' : ''}
              key={round.name}
              onClick={() => setMobileRound(roundIndex)}
              role="tab"
              type="button"
            >
              {round.name.replace('Quarter-finals', 'QF').replace('Semi-finals', 'SF')}
            </button>
          ))}
        </div>
        <BracketRound
          finalRoundIndex={rounds.length - 1}
          round={rounds[mobileRound]}
          roundIndex={mobileRound}
        />
      </div>
    </section>
  )
}

export default ProjectedBracket
