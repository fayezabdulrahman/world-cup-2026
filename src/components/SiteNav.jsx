import { useEffect, useRef, useState } from 'react'
import { NAV_ITEMS } from '../lib/worldCup'

function SiteNav({ activePage = 'overview' }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navRef = useRef(null)

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!navRef.current?.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <nav
      className={`site-nav ${isMenuOpen ? 'menu-open' : ''}`}
      aria-label="Primary navigation"
      ref={navRef}
    >
      <a
        className="site-brand"
        href="#overview"
        onClick={() => setIsMenuOpen(false)}
      >
        <p className="eyebrow">World Cup Dashboard</p>
        <h1>World Cup 2026</h1>
      </a>
      <button
        className="nav-menu-toggle"
        type="button"
        aria-controls="primary-menu"
        aria-expanded={isMenuOpen}
        aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        onClick={() => setIsMenuOpen((current) => !current)}
      >
        <span />
        <span />
        <span />
      </button>
      <div className="jump-nav" id="primary-menu">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            className={item.id === activePage ? 'active' : ''}
            href={`#${item.id}`}
            onClick={() => setIsMenuOpen(false)}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  )
}

export default SiteNav
