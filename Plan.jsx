import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { useAthlete, AthletePicker } from './AthleteContext'

const ACCENT = '#f87171'
const ST_FIELDS = [
  ['herkombi_pra', 'Herné kombinácie pravidelné'],
  ['herkombi_nepra', 'Herné kombinácie nepravidelné'],
  ['zasobnik', 'Zásobník'],
  ['podanie_prijem', 'Podanie a príjem'],
  ['treningove_sety', 'Tréningové sety'],
  ['zapasy_cas_min', 'Zápasy/turnaje (čas)'],
]
const KOND_FIELDS = [['kondicia', 'Kondícia'], ['posilnovanie', 'Posilňovanie']]
const OTHER_FIELDS = [['regeneracia', 'Regenerácia'], ['kompenzacia', 'Kompenzácia a strečing'], ['taktika', 'Taktika']]
const ALL_MIN = [...ST_FIELDS, ...KOND_FIELDS, ...OTHER_FIELDS]
const PHASES = ['Dopoludnia', 'Popoludní', 'Večer']
const pad = (n) => String(n).padStart(2, '0')
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const fmtMin = (m) => { m = Math.round(+m || 0); const h = Math.floor(m / 60), mm = m % 60; return h > 0 ? `${h} h ${mm} min` : `${mm} min` }
const MONTHS = ['Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún', 'Júl', 'August', 'September', 'Október', 'November', 'December']
const WD = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So']

export default function Plan() {
  const { role } = useAuth()
  const { selectedId } = useAthlete()
  const aid = selectedId
  const [tab, setTab] = useState('plan')

  if (role !== 'trener' && role !== 'admin')
    return (
      <div className="page">
        <h2 className="page-title" style={{ color: ACCENT }}>Plán</h2>
        <div className="card placeholder">Plán predpisuje tréner alebo admin.</div>
      </div>
    )

  return (
    <div className="page">
      <h2 className="page-title" style={{ color: ACCENT }}>Plán</h2>
      <AthletePicker />
      <div className="seg">
        {[['plan', 'Denný plán'], ['porovnanie', 'Plán vs Skutočnosť']].map(([k, l]) => (
          <button key={k} className={'segbtn' + (tab === k ? ' on' : '')}
            style={tab === k ? { background: 'rgba(248,113,113,0.18)', color: ACCENT } : undefined}
            onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === 'plan' && <PlanDay aid={aid} />}
      {tab === 'porovnanie' && <Compare aid={aid} />}
    </div>
  )
}

// ---------- DENNÝ PLÁN ----------
function PlanDay({ aid }) {
  const [day, setDay] = useState(todayStr())
  const [form, setForm] = useState({})
  const [phases, setPhases] = useState(['', '', ''])
  const [existingId, setExistingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!aid) return
    let alive = true
    ;(async () => {
      setLoading(true)
      const { data: rows } = await supabase.from('training_day').select('*')
        .eq('athlete_id', aid).eq('kind', 'plan').eq('d', day).limit(1)
      if (!alive) return
      const row = rows?.[0] || null
      setExistingId(row?.id || null)
      const b = {}
      ALL_MIN.forEach(([k]) => (b[k] = row?.[k] ?? ''))
      b.tj = row?.tj ?? ''
      b.motiv = row?.motiv || ''
      setForm(b)
      let ph = ['', '', '']
      if (row?.id) {
        const { data: pr } = await supabase.from('training_phase').select('*').eq('day_id', row.id)
        ;(pr || []).forEach((p) => { if (p.phase >= 1 && p.phase <= 3) ph[p.phase - 1] = p.text || '' })
      }
      setPhases(ph); setLoading(false)
    })()
    return () => { alive = false }
  }, [aid, day])

  const navDay = (n) => { const d = new Date(day); d.setDate(d.getDate() + n); setDay(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`) }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const hzCelkom = ALL_MIN.reduce((s, [k]) => s + (+form[k] || 0), 0)

  const save = async () => {
    setSaving(true); setMsg('')
    const payload = { athlete_id: aid, kind: 'plan', d: day, motiv: form.motiv || null, tj: +form.tj || 0 }
    ALL_MIN.forEach(([k]) => (payload[k] = +form[k] || 0))
    let dayId = existingId
    if (existingId) {
      const { error } = await supabase.from('training_day').update(payload).eq('id', existingId)
      if (error) { setMsg('Chyba pri ukladaní'); setSaving(false); return }
    } else {
      const { data, error } = await supabase.from('training_day').insert(payload).select('id').single()
      if (error) { setMsg('Chyba pri ukladaní'); setSaving(false); return }
      dayId = data.id; setExistingId(data.id)
    }
    await supabase.from('training_phase').delete().eq('day_id', dayId)
    const ins = phases.map((t, i) => ({ day_id: dayId, phase: i + 1, text: t || null })).filter((p) => p.text)
    if (ins.length) await supabase.from('training_phase').insert(ins)
    setSaving(false); setMsg('Uložené ✓'); setTimeout(() => setMsg(''), 1800)
  }

  if (loading) return <div className="muted" style={{ padding: 20, textAlign: 'center' }}>Načítavam…</div>
  return (
    <>
      <div className="daynav">
        <button className="navbtn" onClick={() => navDay(-1)}>‹</button>
        <input type="date" className="dateinp" value={day} onChange={(e) => setDay(e.target.value)} />
        <span className="wd">{WD[new Date(day).getDay()]}</span>
        <button className="navbtn" onClick={() => navDay(1)}>›</button>
      </div>
      <div className="card sk-card">
        <div className="sk-h">Plán – stolný tenis (min)</div>
        {ST_FIELDS.map(([k, l]) => <NumRow key={k} label={l} value={form[k]} onCh={(v) => set(k, v)} />)}
        <NumRow label="Počet TJ" value={form.tj} onCh={(v) => set('tj', v)} />
      </div>
      <div className="card sk-card">
        <div className="sk-h">Plán – kondícia (min)</div>
        {KOND_FIELDS.map(([k, l]) => <NumRow key={k} label={l} value={form[k]} onCh={(v) => set(k, v)} />)}
      </div>
      <div className="card sk-card">
        <div className="sk-h">Plán – ostatné (min)</div>
        {OTHER_FIELDS.map(([k, l]) => <NumRow key={k} label={l} value={form[k]} onCh={(v) => set(k, v)} />)}
      </div>
      <div className="card sk-card">
        <div className="sk-h">Zameranie / fázy dňa</div>
        {PHASES.map((p, i) => (
          <div key={p} style={{ marginBottom: 8 }}>
            <div className="lbl-s">{p}</div>
            <textarea className="ta" rows={2} value={phases[i]}
              onChange={(e) => setPhases((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))}
              placeholder="čo má hráč v tejto fáze trénovať…" />
          </div>
        ))}
        <div className="lbl-s" style={{ marginTop: 6 }}>Poznámka k plánu</div>
        <input className="inp" value={form.motiv} onChange={(e) => set('motiv', e.target.value)} />
      </div>
      <div className="card sk-total" style={{ background: 'rgba(248,113,113,0.12)', borderColor: 'rgba(248,113,113,0.3)' }}>
        <span>Plánované HZ celkom</span><strong style={{ color: ACCENT }}>{fmtMin(hzCelkom)}</strong>
      </div>
      {msg && <div className="okmsg" style={{ color: ACCENT }}>{msg}</div>}
      <button className="btn" style={{ marginTop: 12, background: ACCENT, color: '#2a0f0f' }} onClick={save} disabled={saving}>
        {saving ? 'Ukladám…' : 'Uložiť plán'}
      </button>
    </>
  )
}

// ---------- POROVNANIE ----------
function Compare({ aid }) {
  const [od, setOd] = useState(() => `${new Date().getFullYear()}-01-01`)
  const [doo, setDoo] = useState(() => todayStr())
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!aid || !od || !doo) return
    let alive = true
    ;(async () => {
      setLoading(true)
      const { data } = await supabase.from('training_day').select('*')
        .eq('athlete_id', aid).gte('d', od).lte('d', doo)
      if (alive) { setRows(data || []); setLoading(false) }
    })()
    return () => { alive = false }
  }, [aid, od, doo])

  const preset = (kind) => {
    const t = new Date(); const y = t.getFullYear()
    if (kind === 'rok') { setOd(`${y}-01-01`); setDoo(`${y}-12-31`) }
    else if (kind === 'sezona') { const m = t.getMonth() + 1; const sy = m >= 8 ? y : y - 1; setOd(`${sy}-08-01`); setDoo(`${sy + 1}-07-31`) }
    else if (kind === '7t') { const s = new Date(); s.setDate(s.getDate() - 48); setOd(`${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`); setDoo(todayStr()) }
  }

  const plan = rows.filter((r) => r.kind === 'plan')
  const real = rows.filter((r) => r.kind === 'skutocnost')
  const sumP = (k) => plan.reduce((s, r) => s + (r[k] || 0), 0)
  const sumR = (k) => real.reduce((s, r) => s + (r[k] || 0), 0)
  const hzP = sumP('hz_celkom'), hzR = sumR('hz_celkom')
  const pct = hzP > 0 ? Math.round((hzR / hzP) * 100) : 0

  return (
    <>
      <div className="card sk-card">
        <div className="period">
          <div className="numbox"><label className="lbl-s">Od</label><input type="date" className="inp" value={od} onChange={(e) => setOd(e.target.value)} /></div>
          <div className="numbox"><label className="lbl-s">Do</label><input type="date" className="inp" value={doo} onChange={(e) => setDoo(e.target.value)} /></div>
        </div>
        <div className="flags" style={{ marginTop: 12, marginBottom: 0 }}>
          <button className="flag" onClick={() => preset('rok')}>Tento rok</button>
          <button className="flag" onClick={() => preset('sezona')}>Sezóna</button>
          <button className="flag" onClick={() => preset('7t')}>Posledných 7 týž.</button>
        </div>
      </div>
      {loading ? <div className="muted" style={{ padding: 20, textAlign: 'center' }}>Načítavam…</div> : (
        <>
          <div className="card sk-total" style={{ background: 'rgba(248,113,113,0.1)', borderColor: 'rgba(248,113,113,0.3)', flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Plán HZ</span><strong style={{ color: ACCENT }}>{fmtMin(hzP)}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Skutočnosť HZ</span><strong style={{ color: '#34d399' }}>{fmtMin(hzR)}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: 6 }}><span>Splnenie</span><strong>{pct} %</strong></div>
          </div>
          <div className="card sk-card">
            <div className="cmp-row cmp-head"><span>Činnosť</span><span>Plán</span><span>Skut.</span></div>
            {ALL_MIN.map(([k, l]) => (
              <div key={k} className="cmp-row"><span>{l}</span><span style={{ color: ACCENT }}>{sumP(k)}</span><span style={{ color: '#34d399' }}>{sumR(k)}</span></div>
            ))}
          </div>
          <div className="muted small" style={{ textAlign: 'center' }}>Čísla v minútach. Plán 🔴 / Skutočnosť 🟢</div>
        </>
      )}
    </>
  )
}

function NumRow({ label, value, onCh }) {
  return (
    <div className="numrow"><span>{label}</span>
      <input className="ninp" type="number" inputMode="numeric" value={value ?? ''} onChange={(e) => onCh(e.target.value)} /></div>
  )
}
