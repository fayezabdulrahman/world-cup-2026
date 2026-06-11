function GroupsSection({ groupTableRows, onSelectTeam }) {
  return (
    <section className="card group-card" id="groups">
      <div className="section-head">
        <div>
          <p className="eyebrow">Group pulse</p>
          <h2>Every group in one fast-scanning control room.</h2>
        </div>
        <p className="muted">
          These standings are the same inputs driving the prediction engine.
        </p>
      </div>

      <div className="group-grid">
        {groupTableRows.map((group) => (
          <article key={group._id} className="group-table">
            <header>
              <strong>Group {group.name}</strong>
            </header>
            <div className="table-head">
              <span>Team</span>
              <span>MP</span>
              <span>Pts</span>
              <span>GD</span>
            </div>
            {group.teams.map((entry) => (
              <button
                key={entry._id}
                type="button"
                className="table-row"
                onClick={() => onSelectTeam(entry.team?.id || '')}
              >
                <span className="team-cell">
                  <img src={entry.team?.flag} alt="" />
                  <strong>{entry.team?.name_en}</strong>
                </span>
                <span>{entry.mp}</span>
                <span>{entry.pts}</span>
                <span>{entry.gd}</span>
              </button>
            ))}
          </article>
        ))}
      </div>
    </section>
  )
}

export default GroupsSection
