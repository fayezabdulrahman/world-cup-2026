function PredictorSection({ championPick, predictionMode, predictionRows }) {
  return (
    <article className="card predictor-card">
      <div className="section-head">
        <div>
          <p className="eyebrow">AI Winner Prediction</p>
          <h2>Who has the strongest path-to-title profile right now?</h2>
        </div>
        <p className="muted">{predictionMode}</p>
      </div>

      {championPick && (
        <div className="prediction-hero">
          <img src={championPick.team.flag} alt="" />
          <div>
            <span>Current favorite</span>
            <strong>{championPick.team.name_en}</strong>
            <p>
              {`${(championPick.titleProbability * 100).toFixed(1)}%`} title chance
              from FIFA rank #{championPick.fifaRank}, qualifier form{' '}
              {championPick.qualifierForm}/100
              {championPick.matchesPlayed > 0
                ? `, and live tournament form ${Math.round(championPick.liveFormScore * 100)}/100.`
                : '.'}
            </p>
          </div>
        </div>
      )}

      <div className="prediction-table">
        {predictionRows.slice(0, 5).map((row, index) => (
          <article key={row.team.id}>
            <span>#{index + 1}</span>
            <div>
              <strong>{row.team.name_en}</strong>
              <small>
                Group {row.group} · FIFA #{row.fifaRank} · qualifier form{' '}
                {row.qualifierForm}/100
              </small>
            </div>
            <b>{`${(row.titleProbability * 100).toFixed(1)}%`}</b>
          </article>
        ))}
      </div>
    </article>
  )
}

export default PredictorSection
