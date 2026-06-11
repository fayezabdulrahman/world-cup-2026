function LoadingState({ error }) {
  return (
    <div className="loading-screen">
      <div className={`pulse-orb ${error ? 'error' : ''}`} />
      <p>{error || 'Loading World Cup 2026 intelligence...'}</p>
    </div>
  )
}

export default LoadingState
