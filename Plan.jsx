import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { useAthlete, AthletePicker } from './AthleteContext'

const ACCENT = '#f87171'
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
const PHASES = ['Dopoludnia', 'Popoludní', 'Večer']
const PHASE_METRICS = [['objem', 'Objem'], ['intenzita', 'Intenzita'], ['technicka', 'Tech. náročnosť'], ['psychicka', 'Psych. náročnosť']]
const pad = (n) => String(n).padStart(2, '0')
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const fmtMin = (m) => { m = Math.round(+m || 0); const h = Math.floor(m / 60), mm = m % 60; return h > 0 ? `${h} h ${mm} min` : `${mm} min` }
const MONTHS = ['Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún', 'Júl', 'August', 'September', 'Október', 'November', 'December']
const WD = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So']

export default function Plan() {
  const { role } = useAuth()
  const { selectedId } = useAthlete()
  const [tab, setTab] = useState('plan')
  const [mode, setMode] = useState('hrac')
  const [groups, setGroups] = useState([])
  const [groupId, setGroupId] = useState('')
  const [members, setMembers] = useState([])

  useEffect(() => {
    if (role !== 'trener' && role !== 'admin') return
    let alive = true
    ;(async () => {
      let gs = []
      if (role === 'admin') {
        const { data } = await supabase.from('groups').select('*').order('name')
        gs = data || []
      } else {
        const { data: mine } = await supabase.from('group_members').select('group_id').eq('profile_id', selectedIdSafe()).eq('role', 'trener')
        const ids = [...new Set((mine || []).map((x) => x.group_id))]
        if (ids.length) { const { data } = await supabase.from('groups').select('*').in('id', ids).order('name'); gs = data || [] }
      }
      if (alive) setGroups(gs)
    })()
    return () => { alive = false }
    function selectedIdSafe() { return selectedId }
  }, [role])

  useEffect(() => {
    if (!groupId) { setMembers([]); return }
    let alive = true
    ;(async () => {
      const { data: gm } = await supabase.from('group_members').select('profile_id').eq('group_id', groupId).eq('role', 'sportovec')
      const ids = [...new Set((gm || []).map((x) => x.profile_id))]
      if (!ids.length) { if (alive) setMembers([]); return }
      const { data: ps } = await supabase.from('profiles').select('id, meno, priezvisko, email').in('id', ids).order('priezvisko')
      if (alive) setMembers(ps || [])
    })()
    return () => { alive = false }
  }, [groupId])

  if (role !== 'trener' && role !== 'admin')
    return (
      <div className="page">
        <h2 className="page-title" style={{ color: ACCENT }}>Plán</h2>
        <div className="card placeholder">Plán predpisuje tréner alebo admin.</div>
      </div>
    )

  const targets = mode === 'skupina' ? members.map((m) => m.id) : [selectedId]
  const aidForLoad = mode === 'skupina' ? (members[0]?.id || null) : selectedId

  return (
    <div className="page">
      <h2 className="page-title" style={{ color: ACCENT }}>Plán</h2>

      <div className="seg" style={{ marginBottom: 12 }}>
        <button className={'segbtn' + (mode === 'hrac' ? ' on' : '')} style={mode === 'hrac' ? { background: 'rgba(248,113,113,0.18)', color: ACCENT } : undefined} onClick={() => setMode('hrac')}>Hráč</button>
        <button className={'segbtn' + (mode === 'skupina' ? ' on' : '')} style={mode === 'skupina' ? { background: 'rgba(248,113,113,0.18)', color: ACCENT } : undefined} onClick={() => setMode('skupina')}>Skupina</button>
      </div>

      {mode === 'hrac' ? <AthletePicker /> : (
        <div className="picker">
          <span className="picker-l">Skupina</span>
          <select className="selbox" style={{ flex: 1 }} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">— vyber skupinu —</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      )}
      {mode === 'skupina' && groupId && <div className="muted small" style={{ marginBottom: 12 }}>Plán sa uloží {members.length} hráčom v skupine.</div>}

      <div className="seg">
        {[['plan', 'Denný plán'], ['porovnanie', 'Plán vs Skutočnosť']].map(([k, l]) => (
          <button key={k} className={'segbtn' + (tab === k ? ' on' : '')}
            style={tab === k ? { background: 'rgba(248,113,113,0.18)', color: ACCENT } : undefined}
            onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'plan' && (mode === 'skupina' && !groupId
        ? <div className="card placeholder">Vyber skupinu, ktorej chceš zadať plán.</div>
        : <PlanDay aid={aidForLoad} targets={targets} groupMode={mode === 'skupina'} groupCount={members.length} />)}
      {tab === 'porovnanie' && <Compare aid={aidForLoad} />}
    </div>
  )
}

// ---------- DENNÝ PLÁN ----------
function PlanDay({ aid, targets, groupMode, groupCount }) {
  const { athletes } = useAthlete()
  const [day, setDay] = useState(todayStr())
  const [form, setForm] = useState({})
  const [phases, setPhases] = useState([{}, {}, {}])
  const [existingId, setExistingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [copyOpen, setCopyOpen] = useState(false)
  const [copyDate, setCopyDate] = useState(todayStr())
  const [copyTargets, setCopyTargets] = useState([])
  const [copying, setCopying] = useState(false)
  const [copyMsg, setCopyMsg] = useState('')

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
  const hzCelkom = ALL_MIN.reduce((s, [k]) => s + (+form[k] || 0), 0)

  const basePayload = () => {
    const p = { kind: 'plan', motiv: form.motiv || null, tj: +form.tj || 0 }
    ALL_MIN.forEach(([k]) => (p[k] = +form[k] || 0))
    return p
  }
  const writeDay = async (tid, tdate) => {
    const payload = { ...basePayload(), athlete_id: tid, d: tdate }
    const { data: ex } = await supabase.from('training_day').select('id').eq('athlete_id', tid).eq('kind', 'plan').eq('d', tdate).limit(1)
    let id = ex?.[0]?.id
    if (id) await supabase.from('training_day').update(payload).eq('id', id)
    else { const { data } = await supabase.from('training_day').insert(payload).select('id').single(); id = data?.id }
    if (id) {
      await supabase.from('training_phase').delete().eq('day_id', id)
      const ins = phases.map((p, i) => ({ day_id: id, phase: i + 1, text: p.text || null, objem: p.objem || null, intenzita: p.intenzita || null, technicka: p.technicka || null, psychicka: p.psychicka || null })).filter((p) => p.text || p.objem || p.intenzita || p.technicka || p.psychicka)
      if (ins.length) await supabase.from('training_phase').insert(ins)
    }
    return id
  }
  const save = async () => {
    setSaving(true); setMsg('')
    const tgts = (targets && targets.length) ? targets : [aid]
    let firstId = null
    for (const t of tgts) { const id = await writeDay(t, day); if (t === aid) firstId = id }
    setSaving(false)
    if (firstId) setExistingId(firstId)
    setMsg(groupMode ? `Uložené pre ${tgts.length} hráčov ✓` : 'Uložené ✓'); setTimeout(() => setMsg(''), 2200)
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
        <div className="sk-h">Zameranie tréningu / fázy dňa</div>
        {PHASES.map((p, i) => (
          <div key={p} className="phase-block">
            <div className="lbl-s" style={{ fontWeight: 700, color: 'var(--accent2)' }}>{p}</div>
            <textarea className="ta" rows={2} value={phases[i]?.text || ''}
              onChange={(e) => setPhase(i, 'text', e.target.value)}
              placeholder="čo má hráč v tejto fáze trénovať…" />
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
        <div className="lbl-s" style={{ marginTop: 6 }}>Poznámka k plánu</div>
        <input className="inp" value={form.motiv} onChange={(e) => set('motiv', e.target.value)} />
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

      <div className="card sk-total" style={{ background: 'rgba(248,113,113,0.12)', borderColor: 'rgba(248,113,113,0.3)' }}>
        <span>Plánované HZ celkom</span><strong style={{ color: ACCENT }}>{fmtMin(hzCelkom)}</strong>
      </div>
      {msg && <div className="okmsg" style={{ color: ACCENT }}>{msg}</div>}
      <button className="btn" style={{ marginTop: 12, background: ACCENT, color: '#2a0f0f' }} onClick={save} disabled={saving}>
        {saving ? 'Ukladám…' : (groupMode ? `Uložiť plán pre skupinu (${groupCount || 0})` : 'Uložiť plán')}
      </button>

      <button className="btn-ghost" style={{ marginTop: 10, width: '100%' }} onClick={() => setCopyOpen((o) => !o)}>
        {copyOpen ? 'Zavrieť kopírovanie' : '⧉ Kopírovať plán viacerým hráčom'}
      </button>
      {copyOpen && (
        <div className="card sk-card" style={{ marginTop: 10 }}>
          <div className="muted small" style={{ marginBottom: 10 }}>Skopíruje aktuálny plán (zameranie aj čísla) na zvolený dátum a hráčov.</div>
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
            <div className="muted small" style={{ marginTop: 8 }}>Skopíruje sa na zvolený dátum.</div>
          )}
          {copyMsg && <div className="okmsg" style={{ color: ACCENT }}>{copyMsg}</div>}
          <button className="btn" style={{ marginTop: 10, background: ACCENT, color: '#2a0f0f' }} onClick={doCopy} disabled={copying}>
            {copying ? 'Kopírujem…' : 'Kopírovať'}
          </button>
        </div>
      )}
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
  const hzP = plan.reduce((s, r) => s + hzOf(r), 0), hzR = real.reduce((s, r) => s + hzOf(r), 0)
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
            <div className="sk-h">HZ – plán vs skutočnosť</div>
            {(() => { const mx = Math.max(1, hzP, hzR); return (<>
              <div className="bar-row"><span className="bar-l">Plán</span><div className="bar-track"><div className="bar-fill" style={{ width: `${(hzP / mx) * 100}%`, background: ACCENT }} /></div><span className="bar-v">{fmtMin(hzP)}</span></div>
              <div className="bar-row"><span className="bar-l">Skutočnosť</span><div className="bar-track"><div className="bar-fill" style={{ width: `${(hzR / mx) * 100}%`, background: '#34d399' }} /></div><span className="bar-v">{fmtMin(hzR)}</span></div>
            </>) })()}
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
