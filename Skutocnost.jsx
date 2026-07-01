import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useAthlete, AthletePicker } from './AthleteContext'

// --- konfigurácia ukazovateľov ---
const ST_FIELDS = [
  ['herkombi_pra', 'Herné kombinácie pravidelné'],
  ['herkombi_pra_servis', 'Herné kombinácie pravidelné so servisom'],
  ['herkombi_nepra', 'Herné kombinácie nepravidelné'],
  ['herkombi_nepra_servis', 'Herné kombinácie nepravidelné so servisom'],
  ['zasobnik', 'Zásobník'],
  ['podanie', 'Podanie'],
  ['prijem', 'Príjem podania'],
  ['treningove_sety', 'Tréningové sety'],
  ['zapasy_cas_min', 'Zápasy/turnaje (čas)'],
]
const KOND_FIELDS = [['kondicia', 'Kondícia'], ['posilnovanie', 'Posilňovanie'], ['specialna_priprava', 'Špeciálna príprava'], ['specificka_priprava', 'Špecifická príprava']]
const OTHER_FIELDS = [['regeneracia', 'Regenerácia'], ['kompenzacia', 'Kompenzácia a strečing'], ['taktika', 'Taktika'], ['psychologia', 'Psychológia'], ['videoanaliza', 'Videoanalýza']]
const ALL_MIN = [...ST_FIELDS, ...KOND_FIELDS, ...OTHER_FIELDS]
const hzOf = (r) => ALL_MIN.reduce((s, [k]) => s + (+r[k] || 0), 0)
const FLAGS = [
  ['dz', 'DZ'], ['nemoc', 'Choroba'], ['zranenie', 'Zranenie'], ['zapasy_flag', 'Zápasy/turnaje'], ['volno', 'Voľno'],
]
const PHASES = ['Dopoludnia', 'Popoludní', 'Večer']
const PHASE_METRICS = [['objem', 'Objem'], ['intenzita', 'Intenzita'], ['technicka', 'Tech. náročnosť'], ['psychicka', 'Psych. náročnosť']]
const NUTRITION = [['vyziva_ranajky', 'Raňajky'], ['vyziva_desiata', 'Desiata'], ['vyziva_obed', 'Obed'], ['vyziva_olovrant', 'Olovrant'], ['vyziva_vecera', 'Večera'], ['vyziva_neskora', 'Neskorá večera']]

const pad = (n) => String(n).padStart(2, '0')
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const fmtMin = (m) => { m = Math.round(+m || 0); const h = Math.floor(m / 60), mm = m % 60; return h > 0 ? `${h} h ${mm} min` : `${mm} min` }
const MONTHS = ['Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún', 'Júl', 'August', 'September', 'Október', 'November', 'December']
const WD = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So']
const ACCENT = '#34d399'

export default function Skutocnost() {
  const { selectedId } = useAthlete()
  const aid = selectedId
  const [tab, setTab] = useState('den')
  const [day, setDay] = useState(todayStr())

  return (
    <div className="page">
      <h2 className="page-title" style={{ color: ACCENT }}>Skutočnosť</h2>
      <AthletePicker />
      <div className="seg">
        {[['den', 'Deň'], ['tyzden', 'Týždeň'], ['mesiac', 'Mesiac'], ['obdobie', 'Obdobie']].map(([k, l]) => (
          <button key={k} className={'segbtn' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === 'den' && <DenView aid={aid} day={day} setDay={setDay} />}
      {tab === 'tyzden' && <TyzdenView aid={aid} day={day} setDay={setDay} />}
      {tab === 'mesiac' && <MesiacView aid={aid} day={day} setDay={setDay} />}
      {tab === 'obdobie' && <ObdobieView aid={aid} />}
    </div>
  )
}

// ---------- DEŇ ----------
function DenView({ aid, day, setDay }) {
  const { athletes } = useAthlete()
  const [form, setForm] = useState({})
  const [phases, setPhases] = useState([{}, {}, {}])
  const [existingId, setExistingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [copyOpen, setCopyOpen] = useState(false)
  const [copyDate, setCopyDate] = useState(day)
  const [copyTargets, setCopyTargets] = useState([])
  const [copying, setCopying] = useState(false)
  const [copyMsg, setCopyMsg] = useState('')

  useEffect(() => {
    if (!aid) return
    let alive = true
    ;(async () => {
      setLoading(true)
      const { data: rows } = await supabase.from('training_day').select('*')
        .eq('athlete_id', aid).eq('kind', 'skutocnost').eq('d', day).limit(1)
      if (!alive) return
      const row = rows?.[0] || null
      setExistingId(row?.id || null)
      const b = {}
      ALL_MIN.forEach(([k]) => (b[k] = row?.[k] ?? ''))
      FLAGS.forEach(([k]) => (b[k] = row?.[k] ?? false))
      NUTRITION.forEach(([k]) => (b[k] = row?.[k] || ''))
      b.tj = row?.tj ?? ''
      b.cestovanie_min = row?.cestovanie_min ?? ''
      b.zapasy_sety = row?.zapasy_sety ?? ''
      b.motiv = row?.motiv || ''
      b.poznamky = row?.poznamky || ''
      b.spanok_kvalita = row?.spanok_kvalita ?? ''
      b.spanok_hodiny = row?.spanok_hodiny ?? ''
      setForm(b)
      let ph = [{}, {}, {}]
      if (row?.id) {
        const { data: pr } = await supabase.from('training_phase').select('*').eq('day_id', row.id)
        ;(pr || []).forEach((p) => { if (p.phase >= 1 && p.phase <= 3) ph[p.phase - 1] = { text: p.text || '', objem: p.objem || '', intenzita: p.intenzita || '', technicka: p.technicka || '', psychicka: p.psychicka || '' } })
      }
      setPhases(ph); setLoading(false)
    })()
    return () => { alive = false }
  }, [aid, day])

  useEffect(() => { setCopyDate(day); setCopyTargets(aid ? [aid] : []) }, [day, aid])

  const navDay = (n) => { const d = new Date(day); d.setDate(d.getDate() + n); setDay(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`) }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const setPhase = (i, field, v) => setPhases((arr) => arr.map((x, j) => (j === i ? { ...x, [field]: v } : x)))
  const stCelkom = ST_FIELDS.reduce((s, [k]) => s + (+form[k] || 0), 0)
  const kondCelkom = KOND_FIELDS.reduce((s, [k]) => s + (+form[k] || 0), 0)
  const hzCelkom = ALL_MIN.reduce((s, [k]) => s + (+form[k] || 0), 0)

  const basePayload = () => {
    const p = { kind: 'skutocnost', motiv: form.motiv || null, poznamky: form.poznamky || null,
      tj: +form.tj || 0, cestovanie_min: +form.cestovanie_min || 0, zapasy_sety: +form.zapasy_sety || 0,
      spanok_kvalita: form.spanok_kvalita === '' ? null : +form.spanok_kvalita,
      spanok_hodiny: form.spanok_hodiny === '' ? null : +form.spanok_hodiny }
    ALL_MIN.forEach(([k]) => (p[k] = +form[k] || 0))
    FLAGS.forEach(([k]) => (p[k] = !!form[k]))
    NUTRITION.forEach(([k]) => (p[k] = form[k] || null))
    return p
  }
  const phaseRows = (dayId) => phases
    .map((p, i) => ({ day_id: dayId, phase: i + 1, text: p.text || null, objem: p.objem || null, intenzita: p.intenzita || null, technicka: p.technicka || null, psychicka: p.psychicka || null }))
    .filter((p) => p.text || p.objem || p.intenzita || p.technicka || p.psychicka)

  const writeDay = async (tid, tdate) => {
    const payload = { ...basePayload(), athlete_id: tid, d: tdate }
    const { data: ex } = await supabase.from('training_day').select('id').eq('athlete_id', tid).eq('kind', 'skutocnost').eq('d', tdate).limit(1)
    let id = ex?.[0]?.id
    if (id) await supabase.from('training_day').update(payload).eq('id', id)
    else { const { data } = await supabase.from('training_day').insert(payload).select('id').single(); id = data?.id }
    if (id) {
      await supabase.from('training_phase').delete().eq('day_id', id)
      const ins = phaseRows(id)
      if (ins.length) await supabase.from('training_phase').insert(ins)
    }
    return id
  }

  const save = async () => {
    setSaving(true); setMsg('')
    const id = await writeDay(aid, day)
    if (!id) { setMsg('Chyba pri ukladaní'); setSaving(false); return }
    setExistingId(id); setSaving(false); setMsg('Uložené ✓'); setTimeout(() => setMsg(''), 1800)
  }

  const toggleTarget = (id) => setCopyTargets((t) => t.includes(id) ? t.filter((x) => x !== id) : [...t, id])
  const doCopy = async () => {
    const targets = athletes.length ? copyTargets : [aid]
    if (!targets.length || !copyDate) return
    setCopying(true); setCopyMsg('')
    for (const tid of targets) await writeDay(tid, copyDate)
    setCopying(false); setCopyMsg(`Skopírované \u2713 (${targets.length}\u00d7)`); setTimeout(() => setCopyMsg(''), 2400)
  }

  if (loading) return <div className="muted" style={{ padding: 20, textAlign: 'center' }}>Načítavam…</div>
  const nameOf = (a) => `${a?.meno || ''} ${a?.priezvisko || ''}`.trim() || a?.email || '—'
  return (
    <>
      <div className="daynav">
        <button className="navbtn" onClick={() => navDay(-1)}>‹</button>
        <input type="date" className="dateinp" value={day} onChange={(e) => setDay(e.target.value)} />
        <span className="wd">{WD[new Date(day).getDay()]}</span>
        <button className="navbtn" onClick={() => navDay(1)}>›</button>
      </div>

      <div className="card sk-card">
        <div className="sk-h">Príznaky dňa</div>
        <div className="flags">
          {FLAGS.map(([k, l]) => (
            <button key={k} className={'flag' + (form[k] ? ' on' : '')} onClick={() => set(k, !form[k])}>{l}</button>
          ))}
        </div>
        <div className="row2">
          <Num label="Počet TJ" value={form.tj} onCh={(v) => set('tj', v)} />
          <Num label="Cestovanie (min)" value={form.cestovanie_min} onCh={(v) => set('cestovanie_min', v)} />
        </div>
      </div>

      <div className="card sk-card">
        <div className="sk-h">Záznam tréningu</div>
        {PHASES.map((p, i) => (
          <div key={p} className="phase-block">
            <div className="lbl-s" style={{ fontWeight: 700, color: 'var(--accent2)' }}>{p}</div>
            <textarea className="ta" rows={2} value={phases[i]?.text || ''}
              onChange={(e) => setPhase(i, 'text', e.target.value)}
              placeholder="čo sa robilo / miesto / pocity…" />
            <div className="metrics">
              {PHASE_METRICS.map(([mk, ml]) => (
                <div key={mk} className="metric">
                  <label className="lbl-s" style={{ marginBottom: 3 }}>{ml}</label>
                  <input className="inp" value={phases[i]?.[mk] || ''} onChange={(e) => setPhase(i, mk, e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="lbl-s" style={{ marginTop: 6 }}>Motív dňa</div>
        <input className="inp" value={form.motiv} onChange={(e) => set('motiv', e.target.value)} />
        <div className="lbl-s" style={{ marginTop: 10 }}>Poznámky a pocity</div>
        <textarea className="ta" rows={2} value={form.poznamky} onChange={(e) => set('poznamky', e.target.value)} />
      </div>

      <div className="card sk-card">
        <div className="sk-h">Výživa</div>
        {NUTRITION.map(([k, l]) => (
          <div key={k} style={{ marginBottom: 8 }}>
            <div className="lbl-s">{l}</div>
            <input className="inp" value={form[k] || ''} onChange={(e) => set(k, e.target.value)} />
          </div>
        ))}
      </div>

      <div className="card sk-card">
        <div className="sk-h">Spánok (z predošlej noci)</div>
        <div className="lbl-s">Kvalita spánku</div>
        <div className="flags" style={{ marginBottom: 4 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} className={'flag' + (+form.spanok_kvalita === n ? ' on' : '')} onClick={() => set('spanok_kvalita', n)} style={{ minWidth: 40 }}>{n}</button>
          ))}
        </div>
        <div className="muted small" style={{ marginBottom: 10 }}>1 = výborné · 5 = veľmi zlé</div>
        <div className="lbl-s">Počet hodín spánku</div>
        <input className="inp" type="number" step="0.5" inputMode="decimal" value={form.spanok_hodiny ?? ''} onChange={(e) => set('spanok_hodiny', e.target.value)} />
      </div>

      <div className="card sk-card">
        <div className="sk-h">Stolný tenis (min)</div>
        {ST_FIELDS.map(([k, l]) => <NumRow key={k} label={l} value={form[k]} onCh={(v) => set(k, v)} />)}
        <NumRow label="Zápasy/turnaje (počet setov)" value={form.zapasy_sety} onCh={(v) => set('zapasy_sety', v)} />
        <Sum label="ST celkom" val={stCelkom} />
      </div>

      <div className="card sk-card">
        <div className="sk-h">Kondícia (min)</div>
        {KOND_FIELDS.map(([k, l]) => <NumRow key={k} label={l} value={form[k]} onCh={(v) => set(k, v)} />)}
        <Sum label="Kondícia celkom" val={kondCelkom} />
      </div>

      <div className="card sk-card">
        <div className="sk-h">Ostatné (min)</div>
        {OTHER_FIELDS.map(([k, l]) => <NumRow key={k} label={l} value={form[k]} onCh={(v) => set(k, v)} />)}
      </div>

      <div className="card sk-total">
        <span>Hodiny zaťaženia (HZ) celkom</span>
        <strong>{fmtMin(hzCelkom)}</strong>
      </div>

      {msg && <div className="okmsg">{msg}</div>}
      <button className="btn" style={{ marginTop: 12 }} onClick={save} disabled={saving}>
        {saving ? 'Ukladám…' : 'Uložiť deň'}
      </button>

      <button className="btn-ghost" style={{ marginTop: 10, width: '100%' }} onClick={() => setCopyOpen((o) => !o)}>
        {copyOpen ? 'Zavrieť kopírovanie' : '⧉ Kopírovať / opakovať tréning'}
      </button>
      {copyOpen && (
        <div className="card sk-card" style={{ marginTop: 10 }}>
          <div className="muted small" style={{ marginBottom: 10 }}>Skopíruje aktuálne hodnoty (fázy, výživa, spánok aj čísla) na zvolený dátum a hráčov.</div>
          <div className="lbl-s">Dátum</div>
          <input type="date" className="inp" value={copyDate} onChange={(e) => setCopyDate(e.target.value)} />
          {athletes.length > 0 ? (
            <>
              <div className="lbl-s" style={{ marginTop: 10 }}>Hráči ({copyTargets.length})</div>
              <div className="copylist">
                {athletes.map((a) => (
                  <label key={a.id} className={'copyitem' + (copyTargets.includes(a.id) ? ' on' : '')}>
                    <input type="checkbox" checked={copyTargets.includes(a.id)} onChange={() => toggleTarget(a.id)} />
                    <span>{nameOf(a)}</span>
                  </label>
                ))}
              </div>
            </>
          ) : (
            <div className="muted small" style={{ marginTop: 8 }}>Skopíruje sa tebe na zvolený dátum.</div>
          )}
          {copyMsg && <div className="okmsg">{copyMsg}</div>}
          <button className="btn" style={{ marginTop: 10 }} onClick={doCopy} disabled={copying}>
            {copying ? 'Kopírujem…' : 'Kopírovať'}
          </button>
        </div>
      )}
    </>
  )
}

// ---------- TÝŽDEŇ ----------
function TyzdenView({ aid, day, setDay }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const dates = weekDates(day)

  useEffect(() => {
    if (!aid) return
    let alive = true
    ;(async () => {
      setLoading(true)
      const { data } = await supabase.from('training_day').select('*')
        .eq('athlete_id', aid).eq('kind', 'skutocnost').gte('d', dates[0]).lte('d', dates[6])
      if (alive) { setRows(data || []); setLoading(false) }
    })()
    return () => { alive = false }
  }, [aid, dates[0]])

  const navWeek = (n) => { const d = new Date(day); d.setDate(d.getDate() + n * 7); setDay(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`) }
  const byDate = Object.fromEntries(rows.map((r) => [r.d, r]))
  const weekTotal = rows.reduce((s, r) => s + hzOf(r), 0)

  if (loading) return <div className="muted" style={{ padding: 20, textAlign: 'center' }}>Načítavam…</div>
  return (
    <>
      <div className="daynav">
        <button className="navbtn" onClick={() => navWeek(-1)}>‹</button>
        <span className="wd" style={{ minWidth: 0 }}>{fmtDM(dates[0])} – {fmtDM(dates[6])}</span>
        <button className="navbtn" onClick={() => navWeek(1)}>›</button>
      </div>
      <div className="card sk-card">
        {dates.map((d) => {
          const r = byDate[d]
          return (
            <button key={d} className="weekrow" onClick={() => setDay(d)}>
              <span className="wk-d">{WD[new Date(d).getDay()]} {fmtDM(d)}</span>
              <span className="wk-v">{r ? fmtMin(hzOf(r)) : '—'}</span>
            </button>
          )
        })}
        <div className="sk-total" style={{ marginTop: 8 }}>
          <span>Spolu za týždeň</span><strong>{fmtMin(weekTotal)}</strong>
        </div>
      </div>
    </>
  )
}

// ---------- MESIAC ----------
function MesiacView({ aid, day }) {
  const month = day.slice(0, 7)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [m, setM] = useState(month)

  useEffect(() => {
    if (!aid) return
    let alive = true
    ;(async () => {
      setLoading(true)
      const nd = new Date(m + '-01'); nd.setMonth(nd.getMonth() + 1)
      const nextFirst = `${nd.getFullYear()}-${pad(nd.getMonth() + 1)}-01`
      const { data } = await supabase.from('training_day').select('*')
        .eq('athlete_id', aid).eq('kind', 'skutocnost').gte('d', m + '-01').lt('d', nextFirst)
      if (alive) { setRows(data || []); setLoading(false) }
    })()
    return () => { alive = false }
  }, [aid, m])

  const navM = (n) => { const d = new Date(m + '-01'); d.setMonth(d.getMonth() + n); setM(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`) }
  const sum = (k) => rows.reduce((s, r) => s + (r[k] || 0), 0)
  const total = rows.reduce((s, r) => s + hzOf(r), 0)

  if (loading) return <div className="muted" style={{ padding: 20, textAlign: 'center' }}>Načítavam…</div>
  return (
    <>
      <div className="daynav">
        <button className="navbtn" onClick={() => navM(-1)}>‹</button>
        <span className="wd">{MONTHS[+m.slice(5) - 1]} {m.slice(0, 4)}</span>
        <button className="navbtn" onClick={() => navM(1)}>›</button>
      </div>
      <div className="card sk-card">
        <div className="sk-h">Súčet za mesiac</div>
        {ALL_MIN.map(([k, l]) => (
          <div key={k} className="sumrow"><span>{l}</span><span>{fmtMin(sum(k))}</span></div>
        ))}
        <div className="sk-total" style={{ marginTop: 8 }}>
          <span>HZ celkom</span><strong>{fmtMin(total)}</strong>
        </div>
      </div>
    </>
  )
}

// ---------- OBDOBIE (Od–Do) ----------
function ObdobieView({ aid }) {
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
        .eq('athlete_id', aid).eq('kind', 'skutocnost')
        .gte('d', od).lte('d', doo).order('d')
      if (alive) { setRows(data || []); setLoading(false) }
    })()
    return () => { alive = false }
  }, [aid, od, doo])

  const preset = (kind) => {
    const t = new Date(); const y = t.getFullYear()
    if (kind === 'rok') { setOd(`${y}-01-01`); setDoo(`${y}-12-31`) }
    else if (kind === 'sezona') {
      const m = t.getMonth() + 1; const sy = m >= 8 ? y : y - 1
      setOd(`${sy}-08-01`); setDoo(`${sy + 1}-07-31`)
    } else if (kind === '7t') {
      const sdt = new Date(); sdt.setDate(sdt.getDate() - 48)
      setOd(`${sdt.getFullYear()}-${pad(sdt.getMonth() + 1)}-${pad(sdt.getDate())}`); setDoo(todayStr())
    }
  }

  const sum = (k) => rows.reduce((s, r) => s + (r[k] || 0), 0)
  const totHz = rows.reduce((s, r) => s + hzOf(r), 0)
  const totDz = rows.reduce((s, r) => s + (r.dz ? 1 : 0), 0)
  const totTj = sum('tj')
  const months = {}
  rows.forEach((r) => { const ym = r.d.slice(0, 7); months[ym] = (months[ym] || 0) + hzOf(r) })
  const monthKeys = Object.keys(months).sort()

  return (
    <>
      <div className="card sk-card">
        <div className="period">
          <div className="numbox"><label className="lbl-s">Od</label>
            <input type="date" className="inp" value={od} onChange={(e) => setOd(e.target.value)} /></div>
          <div className="numbox"><label className="lbl-s">Do</label>
            <input type="date" className="inp" value={doo} onChange={(e) => setDoo(e.target.value)} /></div>
        </div>
        <div className="flags" style={{ marginTop: 12, marginBottom: 0 }}>
          <button className="flag" onClick={() => preset('rok')}>Tento rok</button>
          <button className="flag" onClick={() => preset('sezona')}>Sezóna</button>
          <button className="flag" onClick={() => preset('7t')}>Posledných 7 týž.</button>
        </div>
      </div>

      {loading ? <div className="muted" style={{ padding: 20, textAlign: 'center' }}>Načítavam…</div> : (
        <>
          <div className="sk-total" style={{ marginBottom: 12 }}>
            <span>HZ celkom za obdobie</span><strong>{fmtMin(totHz)}</strong>
          </div>
          <div className="card sk-card">
            <div className="sk-h">Rozpad po činnostiach</div>
            {(() => {
              const vals = ALL_MIN.map(([k, l]) => [l, sum(k)]).filter((v) => v[1] > 0)
              const mx = Math.max(1, ...vals.map((v) => v[1]))
              const tot = vals.reduce((s2, v) => s2 + v[1], 0) || 1
              if (!vals.length) return <div className="muted small">Žiadne dáta za obdobie.</div>
              return vals.map(([l, v]) => (
                <div key={l} style={{ marginBottom: 9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                    <span>{l}</span>
                    <span style={{ fontWeight: 700 }}>{fmtMin(v)} · {Math.round((v / tot) * 100)}%</span>
                  </div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${(v / mx) * 100}%`, background: '#34d399' }} /></div>
                </div>
              ))
            })()}
            <div className="sumrow" style={{ marginTop: 8 }}><span>Dni zaťaženia (DZ)</span><span>{totDz}</span></div>
            <div className="sumrow" style={{ borderBottom: 'none' }}><span>Tréningové jednotky (TJ)</span><span>{totTj}</span></div>
          </div>
          {monthKeys.length > 1 && (
            <div className="card sk-card">
              <div className="sk-h">Trend po mesiacoch (HZ)</div>
              {(() => { const mx = Math.max(1, ...monthKeys.map((k) => months[k])); return monthKeys.map((ym) => (
                <div key={ym} className="bar-row">
                  <span className="bar-l">{MONTHS[+ym.slice(5) - 1].slice(0, 3)} {ym.slice(2, 4)}</span>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${(months[ym] / mx) * 100}%`, background: '#34d399' }} /></div>
                  <span className="bar-v">{fmtMin(months[ym])}</span>
                </div>
              )) })()}
            </div>
          )}
        </>
      )}
    </>
  )
}

// ---------- pomocné UI ----------
function Num({ label, value, onCh }) {
  return (
    <div className="numbox">
      <label className="lbl-s">{label}</label>
      <input className="inp" type="number" inputMode="numeric" value={value ?? ''} onChange={(e) => onCh(e.target.value)} />
    </div>
  )
}
function NumRow({ label, value, onCh }) {
  return (
    <div className="numrow">
      <span>{label}</span>
      <input className="ninp" type="number" inputMode="numeric" value={value ?? ''} onChange={(e) => onCh(e.target.value)} />
    </div>
  )
}
function Sum({ label, val }) {
  return <div className="numrow numrow-sum"><span>{label}</span><span>{fmtMin(val)}</span></div>
}

function weekDates(day) {
  const d = new Date(day); const wd = (d.getDay() + 6) % 7
  const mon = new Date(d); mon.setDate(d.getDate() - wd)
  return [...Array(7)].map((_, i) => { const x = new Date(mon); x.setDate(mon.getDate() + i); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}` })
}
const fmtDM = (s) => { const [, mm, dd] = s.split('-'); return `${+dd}.${+mm}.` }
