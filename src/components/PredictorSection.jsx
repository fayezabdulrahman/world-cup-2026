function PredictorSection({
  championPick,
  predictionMode,
  predictionRows,
}) {
  return (
    <>
      <article className="card predictor-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">AI Winner Prediction</p>
            <h2>Which team is best placed to win the World Cup?</h2>
          </div>
          <p className="muted">
            This is a model estimate, not a match guarantee. Every team is scored
            using the same three factors.
          </p>
        </div>

        <section className="prediction-explainer">
          <div>
            <p className="eyebrow">How the prediction works</p>
            <h3>Stronger teams rise when the evidence supports them.</h3>
            <p>{predictionMode}</p>
          </div>
          <div className="prediction-factors">
            <article>
              <strong>1</strong>
              <div>
                <b>FIFA ranking</b>
                <span>The starting measure of long-term team strength.</span>
              </div>
            </article>
            <article>
              <strong>2</strong>
              <div>
                <b>Qualifying form</b>
                <span>How well the team performed before the tournament.</span>
              </div>
            </article>
            <article>
              <strong>3</strong>
              <div>
                <b>World Cup form</b>
                <span>
                  Results, points, goals and defensive performance in this
                  tournament.
                </span>
              </div>
            </article>
          </div>
        </section>

        {championPick && (
          <div className="prediction-hero">
            <img src={championPick.team.flag} alt="" />
            <div className="prediction-favorite-copy">
              <span>Model favorite right now</span>
              <strong>{championPick.team.name_en}</strong>
              <p>
                The model gives {championPick.team.name_en} the highest score after
                comparing all 48 teams.
              </p>
            </div>
            <div className="prediction-chance">
              <strong>
                {`${(championPick.titleProbability * 100).toFixed(1)}%`}
              </strong>
              <span>estimated title chance</span>
            </div>
            <div className="favorite-factor-grid">
              <article>
                <span>World ranking</span>
                <strong>#{championPick.fifaRank}</strong>
              </article>
              <article>
                <span>Qualifying form</span>
                <strong>{championPick.qualifierForm}/100</strong>
              </article>
              <article>
                <span>World Cup form</span>
                <strong>
                  {championPick.matchesPlayed > 0
                    ? `${Math.round(championPick.liveFormScore * 100)}/100`
                    : 'No matches yet'}
                </strong>
              </article>
            </div>
          </div>
        )}

        <div className="prediction-ranking-head">
          <div>
            <p className="eyebrow">Leading contenders</p>
            <h3>How the top five compare</h3>
          </div>
          <span>Estimated chance of winning the tournament</span>
        </div>

        <div className="prediction-table">
          {predictionRows.slice(0, 5).map((row, index) => (
            <article key={row.team.id}>
              <span>#{index + 1}</span>
              <div>
                <strong>{row.team.name_en}</strong>
                <small>
                  World rank #{row.fifaRank} · Qualifying {row.qualifierForm}/100
                  {row.matchesPlayed > 0
                    ? ` · World Cup form ${Math.round(row.liveFormScore * 100)}/100`
                    : ''}
                </small>
              </div>
              <b>
                {`${(row.titleProbability * 100).toFixed(1)}%`}
                <small>title chance</small>
              </b>
            </article>
          ))}
        </div>
      </article>
    </>
  )
}

export default PredictorSection
