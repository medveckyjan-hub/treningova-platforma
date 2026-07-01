import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'

const ACCENT = '#38bdf8'
const PHASES = ['Ráno', 'Poobede', 'Večer']
const WD = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So']
const MONTHS = ['Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún', 'Júl', 'August', 'September', 'Október', 'November', 'December']
const pad = (n) => String(n).padStart(2, '0')
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const fmtDM = (s) => { const [, m, d] = s.split('-'); return `${+d}.${+m}.` }
const key = (d, ph) => `${d}_${ph}`
function weekDates(day) {
  const d = new Date(day); const wd = (d.getDay() + 6) % 7
  const mon = new Date(d); mon.setDate(d.getDate() - wd)
  return [...Array(7)].map((_, i) => { const x = new Date(mon); x.setDate(mon.getDate() + i); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}` })
}

export default function Vykaz() {
  const { user, profile } = useAuth()
  const uid = user?.id
  const meno = `${profile?.meno || ''} ${profile?.priezvisko || ''}`.trim()
  const [tab, setTab] = useState('tyzden')
  return (
    <>
      <div className="seg no-print" style={{ marginTop: 4 }}>
        {[['tyzden', 'Týždeň'], ['mesiac', 'Mesiac']].map(([k, l]) => (
          <button key={k} className={'segbtn' + (tab === k ? ' on' : '')} style={tab === k ? { background: 'rgba(56,189,248,0.18)', color: ACCENT } : undefined} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === 'tyzden' && <WeekView uid={uid} meno={meno} />}
      {tab === 'mesiac' && <MonthView uid={uid} meno={meno} />}
    </>
  )
}

function WeekView({ uid, meno }) {
  const [day, setDay] = useState(todayStr())
  const [map, setMap] = useState({})
  const [existing, setExisting] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const dates = weekDates(day)

  useEffect(() => {
    if (!uid) return
    let alive = true
    ;(async () => {
      setLoading(true)
      const { data } = await supabase.from('trainer_report').select('*')
        .eq('trainer_id', uid).gte('d', dates[0]).lte('d', dates[6])
      if (!alive) return
      const m = {}; const ex = new Set()
      ;(data || []).forEach((r) => { m[key(r.d, r.phase)] = { cinnost: r.cinnost || '', miesto: r.miesto || '', hodiny: r.hodiny ?? '', poznamka: r.poznamka || '' }; ex.add(key(r.d, r.phase)) })
      setMap(m); setExisting(ex); setLoading(false)
    })()
    return () => { alive = false }
  }, [uid, dates[0]])

  const navWeek = (n) => { const d = new Date(day); d.setDate(d.getDate() + n * 7); setDay(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`) }
  const setF = (d, ph, field, val) => setMap((m) => ({ ...m, [key(d, ph)]: { ...(m[key(d, ph)] || {}), [field]: val } }))
  const filled = (e) => e && (e.cinnost || e.miesto || e.hodiny !== '' || e.poznamka)
  const weekTotal = Object.values(map).reduce((s, e) => s + (+e?.hodiny || 0), 0)

  const save = async () => {
    setSaving(true); setMsg('')
    const ups = []; const dels = []
    dates.forEach((d) => PHASES.forEach((_, i) => {
      const ph = i + 1; const e = map[key(d, ph)]
      if (filled(e)) ups.push({ trainer_id: uid, d, phase: ph, cinnost: e.cinnost || null, miesto: e.miesto || null, hodiny: e.hodiny === '' ? null : +e.hodiny, poznamka: e.poznamka || null })
      else if (existing.has(key(d, ph))) dels.push({ d, ph })
    }))
    if (ups.length) await supabase.from('trainer_report').upsert(ups, { onConflict: 'trainer_id,d,phase' })
    for (const x of dels) await supabase.from('trainer_report').delete().eq('trainer_id', uid).eq('d', x.d).eq('phase', x.ph)
    setSaving(false); setMsg('Uložené ✓'); setTimeout(() => setMsg(''), 1800)
    const ex = new Set(); ups.forEach((u) => ex.add(key(u.d, u.phase))); setExisting(ex)
  }

  if (loading) return <div className="muted" style={{ padding: 20, textAlign: 'center' }}>Načítavam…</div>
  return (
    <>
      <div className="daynav no-print">
        <button className="navbtn" onClick={() => navWeek(-1)}>‹</button>
        <span className="wd" style={{ minWidth: 0 }}>{fmtDM(dates[0])} – {fmtDM(dates[6])}</span>
        <button className="navbtn" onClick={() => navWeek(1)}>›</button>
      </div>

      <div className="screen-only">
        {dates.map((d) => (
          <div key={d} className="card sk-card">
            <div style={{ fontWeight: 800, marginBottom: 8 }}>{WD[new Date(d).getDay()]} {fmtDM(d)}</div>
            {PHASES.map((pl, i) => {
              const ph = i + 1; const e = map[key(d, ph)] || {}
              return (
                <div key={ph} className="vk-phase">
                  <div className="vk-ph-l">{pl}</div>
                  <input className="inp" placeholder="Činnosť" value={e.cinnost || ''} onChange={(ev) => setF(d, ph, 'cinnost', ev.target.value)} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <input className="inp" placeholder="Miesto pôsobenia" value={e.miesto || ''} onChange={(ev) => setF(d, ph, 'miesto', ev.target.value)} />
                    <input className="inp" style={{ width: 90 }} type="number" step="0.5" inputMode="decimal" placeholder="Hod." value={e.hodiny ?? ''} onChange={(ev) => setF(d, ph, 'hodiny', ev.target.value)} />
                  </div>
                  <input className="inp" style={{ marginTop: 6 }} placeholder="Poznámka" value={e.poznamka || ''} onChange={(ev) => setF(d, ph, 'poznamka', ev.target.value)} />
                </div>
              )
            })}
          </div>
        ))}
        <div className="card sk-total" style={{ background: 'rgba(56,189,248,0.1)', borderColor: 'rgba(56,189,248,0.3)' }}>
          <span>Spolu za týždeň</span><strong style={{ color: ACCENT }}>{weekTotal} h</strong>
        </div>
        {msg && <div className="okmsg" style={{ color: ACCENT }}>{msg}</div>}
        <button className="btn" style={{ marginTop: 12 }} onClick={save} disabled={saving}>{saving ? 'Ukladám…' : 'Uložiť výkaz'}</button>
        <button className="btn-ghost" style={{ marginTop: 10, width: '100%' }} onClick={() => window.print()}>🖨 Tlačiť týždeň (A4)</button>
      </div>

      <PrintTable meno={meno} title={`Výkaz trénera – týždeň ${fmtDM(dates[0])} – ${fmtDM(dates[6])}`} dates={dates} map={map} total={weekTotal} />
    </>
  )
}

function MonthView({ uid, meno }) {
  const [m, setM] = useState(todayStr().slice(0, 7))
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    let alive = true
    ;(async () => {
      setLoading(true)
      const nd = new Date(m + '-01'); nd.setMonth(nd.getMonth() + 1)
      const nextFirst = `${nd.getFullYear()}-${pad(nd.getMonth() + 1)}-01`
      const { data } = await supabase.from('trainer_report').select('*')
        .eq('trainer_id', uid).gte('d', m + '-01').lt('d', nextFirst).order('d').order('phase')
      if (alive) { setRows(data || []); setLoading(false) }
    })()
    return () => { alive = false }
  }, [uid, m])

  const navM = (n) => { const d = new Date(m + '-01'); d.setMonth(d.getMonth() + n); setM(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`) }
  const total = rows.reduce((s, r) => s + (+r.hodiny || 0), 0)
  const map = {}; rows.forEach((r) => (map[key(r.d, r.phase)] = { cinnost: r.cinnost, miesto: r.miesto, hodiny: r.hodiny, poznamka: r.poznamka }))
  const dates = [...new Set(rows.map((r) => r.d))]

  if (loading) return <div className="muted" style={{ padding: 20, textAlign: 'center' }}>Načítavam…</div>
  return (
    <>
      <div className="daynav no-print">
        <button className="navbtn" onClick={() => navM(-1)}>‹</button>
        <span className="wd">{MONTHS[+m.slice(5) - 1]} {m.slice(0, 4)}</span>
        <button className="navbtn" onClick={() => navM(1)}>›</button>
      </div>
      <div className="screen-only">
        {rows.length === 0 ? <div className="muted" style={{ padding: 8 }}>Za tento mesiac žiadne záznamy.</div> : (
          <>
            <div className="card sk-card">
              {dates.map((d) => (
                <div key={d} style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 800, marginBottom: 4 }}>{WD[new Date(d).getDay()]} {fmtDM(d)}</div>
                  {PHASES.map((pl, i) => { const e = map[key(d, i + 1)]; return e ? (
                    <div key={i} className="sumrow" style={{ alignItems: 'flex-start' }}>
                      <span style={{ flex: 1 }}><b>{pl}:</b> {e.cinnost} {e.miesto ? `· ${e.miesto}` : ''} {e.poznamka ? `· ${e.poznamka}` : ''}</span>
                      <span style={{ fontWeight: 700 }}>{e.hodiny ? `${e.hodiny} h` : ''}</span>
                    </div>
                  ) : null })}
                </div>
              ))}
            </div>
            <div className="card sk-total" style={{ background: 'rgba(56,189,248,0.1)', borderColor: 'rgba(56,189,248,0.3)' }}>
              <span>Spolu za mesiac</span><strong style={{ color: ACCENT }}>{total} h</strong>
            </div>
          </>
        )}
        <button className="btn-ghost" style={{ marginTop: 10, width: '100%' }} onClick={() => window.print()}>🖨 Tlačiť mesiac (A4)</button>
      </div>
      <PrintTable meno={meno} title={`Výkaz trénera – ${MONTHS[+m.slice(5) - 1]} ${m.slice(0, 4)}`} dates={dates} map={map} total={total} />
    </>
  )
}

function PrintTable({ meno, title, dates, map, total }) {
  const rows = []
  dates.forEach((d) => PHASES.forEach((pl, i) => {
    const e = map[key(d, i + 1)]
    if (e && (e.cinnost || e.miesto || e.hodiny != null && e.hodiny !== '' || e.poznamka))
      rows.push({ d, pl, ...e })
  }))
  return (
    <div className="print-only">
      <div className="print-head">
        <h2 style={{ margin: '0 0 2px' }}>{title}</h2>
        <div>Tréner: {meno || '—'}</div>
      </div>
      <table className="vtable">
        <thead>
          <tr><th>Dátum</th><th>Časť dňa</th><th>Činnosť</th><th>Miesto pôsobenia</th><th>Hodiny</th><th>Poznámka</th></tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx}>
              <td>{WD[new Date(r.d).getDay()]} {fmtDM(r.d)}</td>
              <td>{r.pl}</td><td>{r.cinnost || ''}</td><td>{r.miesto || ''}</td>
              <td style={{ textAlign: 'right' }}>{r.hodiny ?? ''}</td><td>{r.poznamka || ''}</td>
            </tr>
          ))}
          <tr><td colSpan={4} style={{ textAlign: 'right', fontWeight: 'bold' }}>Spolu</td><td style={{ textAlign: 'right', fontWeight: 'bold' }}>{total} h</td><td></td></tr>
        </tbody>
      </table>
    </div>
  )
}
