import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'

const NAV = [
  { to: '/', label: 'Skutočnosť', icon: '🟢', roles: ['sportovec', 'trener', 'rodic'] },
  { to: '/kalendar', label: 'Kalendár', icon: '📅', roles: ['sportovec', 'trener', 'rodic', 'admin'] },
  { to: '/vysledky', label: 'Výsledky', icon: '🏆', roles: ['sportovec', 'trener', 'rodic'] },
  { to: '/profil', label: 'Profil', icon: '👤', roles: ['sportovec', 'trener', 'rodic', 'admin'] },
  { to: '/nastavenia', label: 'Nastavenia', icon: '⚙️', roles: ['admin', 'trener'] },
]

export default function Layout() {
  const { profile, role, signOut } = useAuth()
  const items = NAV.filter((n) => !role || n.roles.includes(role))
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">🏓 Tréningová platforma</div>
        <div className="user">
          <span className="uname">
            {(profile?.meno || '') + ' ' + (profile?.priezvisko || '')}
          </span>
          <button className="btn-ghost" onClick={signOut}>Odhlásiť</button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
      <nav className="bottomnav">
        {items.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) => 'navitem' + (isActive ? ' active' : '')}
          >
            <span className="ico">{n.icon}</span>
            <span className="lbl">{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
