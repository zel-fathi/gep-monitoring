import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getStoredUser, logout } from '../api'

/**
 * Navbar component used across the application.
 *
 * Displays the application title, navigation links and the
 * logged‑in user information with an optional admin badge.
 * Includes a logout button which clears local storage and
 * redirects back to the login page.
 */
const Navbar = () => {
  const [user, setUser] = useState(getStoredUser())
  const location = useLocation()
  const navigate = useNavigate()

  // Listen for storage changes (e.g. in other tabs) and update user state
  useEffect(() => {
    const handleStorage = () => {
      setUser(getStoredUser())
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="navbar">
      <div className="container nav-content">
        <h1 className="navbar-title">⚡ Microgrid Monitor</h1>
        <nav className="navbar-links">
          {/* Highlight active route */}
          <Link
            to="/dashboard"
            className={
              location.pathname.startsWith('/dashboard')
                ? 'nav-link active'
                : 'nav-link'
            }
          >
            Dashboard
          </Link>
          <Link
            to="/actions"
            className={
              location.pathname.startsWith('/actions')
                ? 'nav-link active'
                : 'nav-link'
            }
          >
            Data&nbsp;Management
          </Link>
          {/* Users link visible only for admins */}
          {user?.is_admin && (
            <Link
              to="/users"
              className={
                location.pathname.startsWith('/users')
                  ? 'nav-link active'
                  : 'nav-link'
              }
            >
              Users
            </Link>
          )}
        </nav>
        {user && (
          <div className="navbar-user">
            <span>
              Welcome,&nbsp;<strong>{user.username}</strong>
            </span>
            {user.is_admin && <span className="badge">Admin</span>}
            <button
              onClick={handleLogout}
              className="btn btn-secondary btn-small"
              style={{ marginLeft: '0.5rem' }}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

export default Navbar