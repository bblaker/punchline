import { NavLink, Outlet } from 'react-router-dom'

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).toUpperCase()
}

export function Layout() {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <header>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <NavLink to="/" className="logo">Punchline</NavLink>
            <span className="logo-date">{formatDate()}</span>
          </div>
          <nav>
            <NavLink to="/" end>Time</NavLink>
            <NavLink to="/clients">Clients</NavLink>
            <NavLink to="/invoices">Invoices</NavLink>
            <NavLink to="/settings">Settings</NavLink>
          </nav>
        </div>
      </header>
      <main id="main" className="container">
        <Outlet />
      </main>
      <footer>
        <div className="container">
          Punchline — Self-hosted billable hours
        </div>
      </footer>
    </>
  )
}
