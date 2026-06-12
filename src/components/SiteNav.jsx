import { NAV_ITEMS } from '../lib/worldCup'

function SiteNav({ activePage = 'overview' }) {
  return (
    <nav className="site-nav" aria-label="Primary navigation">
      <a className="site-brand" href="#overview">
        <p className="eyebrow">World Cup Dashboard</p>
        <h1>World Cup 2026</h1>
      </a>
      <div className="jump-nav">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            className={item.id === activePage ? 'active' : ''}
            href={`#${item.id}`}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  )
}

export default SiteNav
