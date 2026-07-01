import { useState } from 'react'
import { useAuth } from './AuthContext'
import Tim from './Tim'
import Vykaz from './Vykaz'
import Sustredenie from './Sustredenie'

const ACCENT = '#38bdf8'
export default function Trener() {
  const { role } = useAuth()
  const [tab, setTab] = useState('tim')
  if (role !== 'trener' && role !== 'admin')
    return <div className="page"><h2 className="page-title" style={{ color: ACCENT }}>Tréner</h2><div className="card placeholder">Sekcia je pre trénerov a adminov.</div></div>
  return (
    <div className="page">
      <h2 className="page-title no-print" style={{ color: ACCENT }}>Tréner</h2>
      <div className="seg no-print">
        {[['tim', 'Tím'], ['vykaz', 'Výkaz'], ['sustredenie', 'Sústredenie']].map(([k, l]) => (
          <button key={k} className={'segbtn' + (tab === k ? ' on' : '')} style={tab === k ? { background: 'rgba(56,189,248,0.18)', color: ACCENT } : undefined} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === 'tim' && <Tim embedded />}
      {tab === 'vykaz' && <Vykaz />}
      {tab === 'sustredenie' && <Sustredenie />}
    </div>
  )
}
