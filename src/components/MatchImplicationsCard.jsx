function MatchImplicationsCard({ compact = false, implications }) {
  if (!implications?.items?.length) return null

  return (
    <aside className={`match-meaning-card ${compact ? 'compact' : ''}`}>
      <p className="eyebrow">{implications.eyebrow}</p>
      <ul>
        {implications.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {implications.note && <small>{implications.note}</small>}
    </aside>
  )
}

export default MatchImplicationsCard
