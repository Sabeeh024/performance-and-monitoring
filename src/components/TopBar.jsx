import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Avatar } from './Avatar'

export function TopBar() {
  const { user, logout } = useAuth()
  return (
    <header className="topbar">
      <Link to="/" className="topbar__brand">
        Devlog
      </Link>
      <nav className="topbar__nav">
        {user ? (
          <>
            <Avatar user={user} size={28} />
            <span>{user.name}</span>
            <button onClick={logout}>Log out</button>
          </>
        ) : (
          <Link to="/login">Log in</Link>
        )}
      </nav>
    </header>
  )
}
