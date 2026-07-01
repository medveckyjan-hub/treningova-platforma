import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { useAthlete } from './AthleteContext'
import { AvatarView } from './Profil'

const ACCENT = '#38bdf8'
const MIN_KEYS = ['herkombi_pra', 'herkombi_pra_servis', 'herkombi_nepra', 'herkombi_nepra_servis', 'zasobnik', 'podanie', 'prijem', 'treningove_sety', 'zapasy_cas_min', 'kondicia', 'posilnovanie', 'specialna_priprava', 'specificka_priprava', 'regeneracia', 'kompenzacia', 'taktika', 'psychologia', 'videoanaliza']
const hzOf = (r) => MIN_KEYS.reduce((s, k) => s + (+r[k] || 0), 0)
const pad = (n) => String(n).padStart(2, '0')
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const firstOfMonth = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01` }
const fmtMin = (m) => { m = Math.round(+m || 0); const h = Math.floor(m / 60), mm = m % 60; return h > 0 ? `${h} h ${mm} min` : `${mm} min` }
const nameOf = (a) => `${a?.meno || ''} ${a?.priezvisko || ''}`.trim() || a?.email || '—'

export default function Tim({ embedded } = {}) {
  const { role } = useAuth()
  const { athletes, setSelectedId } = useAthlete()
  const nav = useNavigate()
  const [od, setOd] = useState(firstOfMonth())
  const [doo, setDoo] = useState(todayStr())
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('hz')

  useEffect(() => {
    const ids = athletes.map((a) => a.id)
    if (!ids.length) { setRows([]); setLoading(false); return }
    let alive = true
    ;(async () => {
      setLoading(true)
      const { data } = await supabase.from('training_day').select('*')
        .eq('kind', 'skutocnost').in('athlete_id', ids).gte('d', od).lte('d', doo)
      if (alive) { setRows(data || []); setLoading(false) }
    })()
    return () => { alive = false }
  }, [athletes.map((a) => a.id).join(','), od, doo])

  if (role !== 'trener' && role !== 'admin')
    return <div className="page"><h2 className="page-title" style={{ color: ACCENT }}>Tím</h2><div className="card placeholder">Sekcia je pre trénerov a adminov.</div></div>

  const preset = (kind) => {
    const t = new Date(); const y = t.getFullYear()
    if (kind === 'mesiac') { setOd(firstOfMonth()); setDoo(todayStr()) }
    else if (kind === 'sezona') { const m = t.getMonth() + 1; const sy = m >= 8 ? y : y - 1; setOd(`${sy}-08-01`); setDoo(`${sy + 1}-07-31`) }
    else if (kind === '7t') { const s = new Date(); s.setDate(s.getDate() - 48); setOd(`${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`); setDoo(todayStr()) }
  }

  const agg = {}
  athletes.forEach((a) => (agg[a.id] = { hz: 0, tj: 0, dz: 0, days: 0 }))
  rows.forEach((r) => { const a = agg[r.athlete_id]; if (a) { a.hz += hzOf(r); a.tj += r.tj || 0; a.dz += r.dz ? 1 : 0; a.days += 1 } })
  let list = athletes.map((a) => ({ ...a, ...agg[a.id] }))
  list.sort((x, y) => sortBy === 'hz' ? y.hz - x.hz : nameOf(x).localeCompare(nameOf(y)))
  const maxHz = Math.max(1, ...list.map((a) => a.hz))
  const teamHz = list.reduce((s, a) => s + a.hz, 0)
  const active = list.filter((a) => a.days > 0).length

  const goTo = (id) => { setSelectedId(id); nav('/') }

  return (
    <div className="page">
      {!embedded && <h2 className="page-title" style={{ color: ACCENT }}>Tím</h2>}

      <div className="card sk-card">
        <div className="period">
          <div className="numbox"><label className="lbl-s">Od</label><input type="date" className="inp" value={od} onChange={(e) => setOd(e.target.value)} /></div>
          <div className="numbox"><label className="lbl-s">Do</label><input type="date" className="inp" value={doo} onChange={(e) => setDoo(e.target.value)} /></div>
        </div>
        <div className="flags" style={{ marginTop: 12, marginBottom: 0 }}>
          <button className="flag" onClick={() => preset('mesiac')}>Tento mesiac</button>
          <button className="flag" onClick={() => preset('sezona')}>Sezóna</button>
          <button className="flag" onClick={() => preset('7t')}>Posledných 7 týž.</button>
        </div>
      </div>

      {loading ? <div className="muted" style={{ padding: 20, textAlign: 'center' }}>Načítavam…</div> : athletes.length === 0 ? (
        <div className="muted" style={{ padding: 8 }}>Zatiaľ nemáš priradených hráčov. Pridaj ich v Nastaveniach → Skupiny.</div>
      ) : (
        <>
          <div className="card sk-total" style={{ background: 'rgba(56,189,248,0.1)', borderColor: 'rgba(56,189,248,0.3)', flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tím – HZ spolu</span><strong style={{ color: ACCENT }}>{fmtMin(teamHz)}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted small">Zapísalo</span><span className="muted small">{active} / {athletes.length} hráčov</span></div>
          </div>

          <div className="seg" style={{ marginTop: 4 }}>
            <button className={'segbtn' + (sortBy === 'hz' ? ' on' : '')} style={sortBy === 'hz' ? { background: 'rgba(56,189,248,0.18)', color: ACCENT } : undefined} onClick={() => setSortBy('hz')}>Podľa zaťaženia</button>
            <button className={'segbtn' + (sortBy === 'meno' ? ' on' : '')} style={sortBy === 'meno' ? { background: 'rgba(56,189,248,0.18)', color: ACCENT } : undefined} onClick={() => setSortBy('meno')}>Podľa mena</button>
          </div>

          <div className="card sk-card">
            {list.map((a) => (
              <button key={a.id} className="teamrow" onClick={() => goTo(a.id)}>
                <AvatarView avatar={a.avatar} name={nameOf(a)} size={38} />
                <div className="teamrow-mid">
                  <div className="teamrow-name">{nameOf(a)}</div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${(a.hz / maxHz) * 100}%`, background: a.days ? ACCENT : '#3a4750' }} /></div>
                  <div className="teamrow-sub">{a.days ? `${fmtMin(a.hz)} · ${a.days} dní · ${a.tj} TJ · ${a.dz} DZ` : 'bez záznamu'}</div>
                </div>
                <span className="teamrow-arrow">›</span>
              </button>
            ))}
          </div>
          <div className="muted small" style={{ textAlign: 'center' }}>Klikni na hráča → otvorí sa jeho denník.</div>
        </>
      )}
    </div>
  )
}
