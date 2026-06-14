function LoadingState({ error }) {
  return (
    <main className="loading-screen" role="status" aria-live="polite">
      <div className="loading-content">
        <div className={`pulse-orb ${error ? 'error' : ''}`} />
        <p>{error || 'Loading World Cup 2026 intelligence...'}</p>
      </div>
    </main>
  )
}

export default LoadingState
