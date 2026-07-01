import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Clipboard, Target, Users, Trophy, User, Settings } from './Icon'
import logo from './logo.png'

const NAV = [
  { to: '/', label: 'Skutočnosť', Icon: Clipboard, color: '#34d399', roles: ['sportovec', 'trener', 'rodic', 'admin'] },
  { to: '/plan', label: 'Plán', Icon: Target, color: '#f87171', roles: ['trener', 'admin'] },
  { to: '/trener', label: 'Tréner', Icon: Users, color: '#38bdf8', roles: ['trener', 'admin'] },
  { to: '/vysledky', label: 'Výsledky', Icon: Trophy, color: '#f0b429', roles: ['sportovec', 'trener', 'rodic', 'admin'] },
  { to: '/profil', label: 'Profil', Icon: User, color: '#7aa2ff', roles: ['sportovec', 'trener', 'rodic', 'admin'] },
  { to: '/nastavenia', label: 'Nastavenia', Icon: Settings, color: '#a78bfa', roles: ['admin', 'trener'] },
]

export default function Layout() {
  const { profile, role, signOut } = useAuth()
  const items = NAV.filter((n) => !role || n.roles.includes(role))
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src={logo} alt="" className="brand-logo" />
          TDtopspin
        </div>
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
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className="navitem">
            {({ isActive }) => (
              <>
                <span
                  className={'tile' + (isActive ? ' on' : '')}
                  style={{
                    backgroundColor: n.color + (isActive ? '33' : '1c'),
                    borderColor: n.color + (isActive ? '88' : '40'),
                    color: n.color,
                  }}
                >
                  <n.Icon size={22} />
                </span>
                <span className="lbl" style={isActive ? { color: n.color } : undefined}>
                  {n.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
